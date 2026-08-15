const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/db');

// Get FEFO batch for a medicine (First Expiry First Out)
router.get('/fefo/:medicineId', async (req, res) => {
  try {
    const medicineId = req.params.medicineId;
    const batches = await all(`
      SELECT b.*, s.name as supplier_name,
        JULIANDAY(b.expiry_date) - JULIANDAY(DATE('now')) as days_to_expiry
      FROM stock_batches b
      LEFT JOIN suppliers s ON b.supplier_id = s.id
      WHERE b.medicine_id = ? AND b.is_quarantined = 0 AND b.qty_remaining > 0 AND b.expiry_date >= DATE('now')
      ORDER BY b.expiry_date ASC
    `, [medicineId]);

    if (!batches || batches.length === 0) {
      return res.status(404).json({ error: 'No active stock batches available for this medicine' });
    }

    res.json({
      recommendedBatch: batches[0],
      allBatches: batches
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all stock batches with filters
router.get('/batches', async (req, res) => {
  try {
    const { medicine_id, supplier_id, status } = req.query;
    let sql = `
      SELECT b.*, m.brand_name, m.generic_name, m.sku, c.name as category_name, s.name as supplier_name,
        JULIANDAY(b.expiry_date) - JULIANDAY(DATE('now')) as days_to_expiry
      FROM stock_batches b
      JOIN medicines m ON b.medicine_id = m.id
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN suppliers s ON b.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (medicine_id) {
      sql += ' AND b.medicine_id = ?';
      params.push(medicine_id);
    }
    if (supplier_id) {
      sql += ' AND b.supplier_id = ?';
      params.push(supplier_id);
    }
    if (status === 'quarantined') {
      sql += ' AND b.is_quarantined = 1';
    } else if (status === 'expired') {
      sql += ' AND b.expiry_date < DATE("now")';
    } else if (status === 'active') {
      sql += ' AND b.is_quarantined = 0 AND b.qty_remaining > 0 AND b.expiry_date >= DATE("now")';
    }

    sql += ' ORDER BY b.expiry_date ASC';

    const batches = await all(sql, params);
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new stock batch
router.post('/batches', async (req, res) => {
  try {
    const { medicine_id, batch_no, expiry_date, qty_received, purchase_date, cost_price, supplier_id } = req.body;
    if (!medicine_id || !batch_no || !expiry_date || !qty_received) {
      return res.status(400).json({ error: 'Medicine, batch no, expiry date, and received quantity are required' });
    }

    const result = await run(`
      INSERT INTO stock_batches (medicine_id, batch_no, expiry_date, qty_received, qty_remaining, purchase_date, cost_price, supplier_id, is_quarantined)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      medicine_id, batch_no, expiry_date, qty_received, qty_received,
      purchase_date || new Date().toISOString().split('T')[0],
      cost_price || 0, supplier_id || null, 0
    ]);

    // Audit Log
    await run(`
      INSERT INTO stock_audit_log (batch_id, medicine_id, change_qty, reason, user_id)
      VALUES (?, ?, ?, ?, ?)
    `, [result.lastID, medicine_id, qty_received, 'New Batch Stock Purchase', req.body.user_id || 1]);

    const newBatch = await get('SELECT * FROM stock_batches WHERE id = ?', [result.lastID]);
    res.status(201).json(newBatch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update batch / Quarantine toggle
router.put('/batches/:id', async (req, res) => {
  try {
    const { is_quarantined, batch_no, expiry_date, cost_price } = req.body;
    await run(`
      UPDATE stock_batches SET
        is_quarantined = COALESCE(?, is_quarantined),
        batch_no = COALESCE(?, batch_no),
        expiry_date = COALESCE(?, expiry_date),
        cost_price = COALESCE(?, cost_price)
      WHERE id = ?
    `, [is_quarantined, batch_no, expiry_date, cost_price, req.params.id]);

    const updatedBatch = await get('SELECT * FROM stock_batches WHERE id = ?', [req.params.id]);
    res.json(updatedBatch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expiry alerts (30, 60, 90 days and expired)
router.get('/expiry-alerts', async (req, res) => {
  try {
    const sql = `
      SELECT b.*, m.brand_name, m.generic_name, m.sku,
        ROUND(JULIANDAY(b.expiry_date) - JULIANDAY(DATE('now'))) as days_to_expiry
      FROM stock_batches b
      JOIN medicines m ON b.medicine_id = m.id
      WHERE b.qty_remaining > 0
      ORDER BY b.expiry_date ASC
    `;
    const batches = await all(sql);

    const result = {
      expired: [],
      within30: [],
      within60: [],
      within90: []
    };

    batches.forEach(b => {
      if (b.days_to_expiry < 0) {
        result.expired.push(b);
      } else if (b.days_to_expiry <= 30) {
        result.within30.push(b);
      } else if (b.days_to_expiry <= 60) {
        result.within60.push(b);
      } else if (b.days_to_expiry <= 90) {
        result.within90.push(b);
      }
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Low stock alerts
router.get('/low-stock', async (req, res) => {
  try {
    const sql = `
      SELECT m.id, m.brand_name, m.generic_name, m.sku, m.min_stock_level, c.name as category_name,
        COALESCE(SUM(CASE WHEN b.is_quarantined = 0 AND b.expiry_date >= DATE('now') THEN b.qty_remaining ELSE 0 END), 0) as current_stock
      FROM medicines m
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN stock_batches b ON m.id = b.medicine_id
      GROUP BY m.id
      HAVING current_stock <= m.min_stock_level
      ORDER BY current_stock ASC
    `;
    const items = await all(sql);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock adjustment with audit log
router.post('/adjust', async (req, res) => {
  try {
    const { batch_id, change_qty, reason, user_id } = req.body;
    if (!batch_id || change_qty === undefined || !reason) {
      return res.status(400).json({ error: 'Batch ID, quantity change, and reason are required' });
    }

    const batch = await get('SELECT * FROM stock_batches WHERE id = ?', [batch_id]);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const newQty = batch.qty_remaining + Number(change_qty);
    if (newQty < 0) {
      return res.status(400).json({ error: 'Adjustment cannot result in negative stock' });
    }

    await run('UPDATE stock_batches SET qty_remaining = ? WHERE id = ?', [newQty, batch_id]);

    await run(`
      INSERT INTO stock_audit_log (batch_id, medicine_id, change_qty, reason, user_id)
      VALUES (?, ?, ?, ?, ?)
    `, [batch_id, batch.medicine_id, change_qty, reason, user_id || 1]);

    res.json({ success: true, new_qty: newQty, message: 'Stock adjusted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock audit log listing
router.get('/audit-log', async (req, res) => {
  try {
    const sql = `
      SELECT l.*, m.brand_name, b.batch_no, u.name as user_name
      FROM stock_audit_log l
      LEFT JOIN medicines m ON l.medicine_id = m.id
      LEFT JOIN stock_batches b ON l.batch_id = b.id
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.timestamp DESC
      LIMIT 100
    `;
    const logs = await all(sql);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
