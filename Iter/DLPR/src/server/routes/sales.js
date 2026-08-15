const express = require('express');
const router = express.Router();
const { run, get, all, getDb } = require('../database/db');
const { generateEscPosBuffer, generatePlainTextReceipt } = require('../utils/escpos');

// ─────────────────────────────────────────────────
// Helper: run a block of async operations inside a
// SQLite BEGIN…COMMIT transaction, rolling back on
// any error.
// node:sqlite's DatabaseSync is synchronous at the statement level,
// so we use explicit BEGIN/COMMIT/ROLLBACK run() calls.
// ─────────────────────────────────────────────────
async function runInTransaction(fn) {
  await run('BEGIN TRANSACTION');
  try {
    const result = await fn();
    await run('COMMIT');
    return result;
  } catch (err) {
    try { await run('ROLLBACK'); } catch (_) {}
    throw err;
  }
}

// ─────────────────────────────────────────────────
// Hold / Recall Sales  (MUST be before /:id routes)
// ─────────────────────────────────────────────────

// FIX #8: GET /held/list was previously defined AFTER GET /:id,
// which made Express interpret "held" as a dynamic :id param,
// rendering this endpoint completely unreachable. Moved above /:id.
router.get('/held/list', async (req, res) => {
  try {
    const held = await all(`
      SELECT h.*, u.name as cashier_name
      FROM held_sales h
      LEFT JOIN users u ON h.cashier_id = u.id
      ORDER BY h.created_at DESC
    `);
    res.json(held);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/held', async (req, res) => {
  try {
    const { cashier_id, customer_name, cart_data } = req.body;
    if (!cart_data) return res.status(400).json({ error: 'Cart data is required' });

    const result = await run(`
      INSERT INTO held_sales (cashier_id, customer_name, cart_data)
      VALUES (?, ?, ?)
    `, [cashier_id || null, customer_name || 'Walk-in Customer', JSON.stringify(cart_data)]);

    res.status(201).json({ id: result.lastID, message: 'Sale held successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/held/:id', async (req, res) => {
  try {
    await run('DELETE FROM held_sales WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Held sale deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────
// Checkout Endpoint (Process Sale)
// ─────────────────────────────────────────────────
router.post('/checkout', async (req, res) => {
  try {
    const {
      cashier_id, customer_id, items, subtotal, discount_amount,
      tax_amount, grand_total, payment_method, payment_details,
      cash_given, change_due
    } = req.body;

    // FIX #3: Require cashier_id — do NOT silently default to user 1.
    // A missing cashier_id means the POS was used without authentication.
    if (!cashier_id) {
      return res.status(400).json({ error: 'Cashier authentication is required to process a sale' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart items cannot be empty' });
    }

    if (!payment_method || grand_total === undefined) {
      return res.status(400).json({ error: 'Payment method and grand total are required' });
    }

    // FIX #1: Replace random 4-digit suffix with timestamp + 4-hex random
    // to make collision statistically impossible even under concurrent load.
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const uniquePart = Date.now().toString(36).toUpperCase().slice(-4) +
                       Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    const invoice_no = `INV-${dateStr}-${uniquePart}`;

    // Pre-verify stock availability for ALL items before touching the DB
    for (const item of items) {
      const batch = await get('SELECT * FROM stock_batches WHERE id = ?', [item.batch_id]);
      if (!batch || batch.is_quarantined || batch.qty_remaining < item.qty) {
        return res.status(400).json({
          error: `Insufficient stock for ${item.brand_name || 'Item'} (Batch ${item.batch_no}). Required: ${item.qty}, Available: ${batch ? batch.qty_remaining : 0}`
        });
      }
    }

    // FIX #2: Wrap the entire checkout in a single DB transaction.
    // If any insert or update fails, ALL changes are rolled back,
    // preventing orphaned sale records with no stock deductions.
    const saleId = await runInTransaction(async () => {
      // Insert Sale record
      const saleResult = await run(`
        INSERT INTO sales 
        (invoice_no, cashier_id, customer_id, subtotal, discount_amount, tax_amount, grand_total, payment_method, payment_details, cash_given, change_due, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoice_no,
        cashier_id,
        customer_id || null,
        subtotal,
        discount_amount || 0,
        tax_amount,
        grand_total,
        payment_method,
        JSON.stringify(payment_details || {}),
        cash_given || grand_total,
        change_due || 0,
        'completed'
      ]);

      const newSaleId = saleResult.lastID;

      // Deduct stock and insert sale items
      for (const item of items) {
        await run(`
          INSERT INTO sale_items (sale_id, medicine_id, batch_id, qty, unit_price, gst_percent, gst_amount, total_amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newSaleId, item.medicine_id, item.batch_id, item.qty, item.unit_price,
          item.gst_percent || 0, item.gst_amount || 0, item.total_amount
        ]);

        // Deduct inventory
        await run(
          'UPDATE stock_batches SET qty_remaining = qty_remaining - ? WHERE id = ?',
          [item.qty, item.batch_id]
        );

        // Audit Log
        await run(`
          INSERT INTO stock_audit_log (batch_id, medicine_id, change_qty, reason, user_id)
          VALUES (?, ?, ?, ?, ?)
        `, [item.batch_id, item.medicine_id, -item.qty, `Sale ${invoice_no}`, cashier_id]);
      }

      // Award customer loyalty points (1 point per ৳10 spent)
      if (customer_id && customer_id > 1) {
        const pointsEarned = Math.floor(grand_total / 10);
        if (pointsEarned > 0) {
          await run(
            'UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?',
            [pointsEarned, customer_id]
          );
        }
      }

      return newSaleId;
    });

    // Fetch complete sale details for receipt payload
    const completedSale = await get(`
      SELECT s.*, u.name as cashier_name, c.name as customer_name, c.phone as customer_phone
      FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `, [saleId]);

    const saleItems = await all(`
      SELECT si.*, m.brand_name, m.generic_name, b.batch_no, b.expiry_date
      FROM sale_items si
      JOIN medicines m ON si.medicine_id = m.id
      JOIN stock_batches b ON si.batch_id = b.id
      WHERE si.sale_id = ?
    `, [saleId]);

    completedSale.items = saleItems;

    res.status(201).json({
      success: true,
      sale: completedSale
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────
// List Sales History
// ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, cashier_id, payment_method, q, limit, offset } = req.query;
    let sql = `
      SELECT s.*, u.name as cashier_name, c.name as customer_name,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as total_items
      FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      sql += ' AND DATE(s.sale_timestamp) >= DATE(?)';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND DATE(s.sale_timestamp) <= DATE(?)';
      params.push(end_date);
    }
    if (cashier_id) {
      sql += ' AND s.cashier_id = ?';
      params.push(cashier_id);
    }
    if (payment_method) {
      sql += ' AND s.payment_method = ?';
      params.push(payment_method);
    }
    if (q) {
      sql += ' AND (s.invoice_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ' ORDER BY s.sale_timestamp DESC';

    // Pagination support
    const pageLimit = parseInt(limit) || 200;
    const pageOffset = parseInt(offset) || 0;
    sql += ' LIMIT ? OFFSET ?';
    params.push(pageLimit, pageOffset);

    const sales = await all(sql, params);
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────
// Get Single Sale Details
// ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const sale = await get(`
      SELECT s.*, u.name as cashier_name, c.name as customer_name, c.phone as customer_phone
      FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const items = await all(`
      SELECT si.*, m.brand_name, m.generic_name, m.sku, b.batch_no, b.expiry_date
      FROM sale_items si
      JOIN medicines m ON si.medicine_id = m.id
      JOIN stock_batches b ON si.batch_id = b.id
      WHERE si.sale_id = ?
    `, [req.params.id]);

    sale.items = items;
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────
// ESC/POS or Plain Text Receipt Endpoint
// ─────────────────────────────────────────────────
router.get('/:id/receipt', async (req, res) => {
  try {
    const format = req.query.format || 'text'; // 'text' or 'escpos'
    const sale = await get(`
      SELECT s.*, u.name as cashier_name, c.name as customer_name, c.phone as customer_phone
      FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const items = await all(`
      SELECT si.*, m.brand_name, m.generic_name, b.batch_no, b.expiry_date
      FROM sale_items si
      JOIN medicines m ON si.medicine_id = m.id
      JOIN stock_batches b ON si.batch_id = b.id
      WHERE si.sale_id = ?
    `, [req.params.id]);

    sale.items = items;

    // Load store settings
    const settingsRows = await all('SELECT key, value FROM store_settings');
    const storeSettings = {};
    settingsRows.forEach(r => storeSettings[r.key] = r.value);

    if (format === 'escpos') {
      const buffer = generateEscPosBuffer(sale, storeSettings);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${sale.invoice_no}_escpos.bin"`);
      return res.send(buffer);
    } else {
      const textReceipt = generatePlainTextReceipt(sale, storeSettings);
      res.json({
        invoice_no: sale.invoice_no,
        text: textReceipt,
        sale: sale,
        store: storeSettings
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
