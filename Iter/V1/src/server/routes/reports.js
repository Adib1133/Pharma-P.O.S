const express = require('express');
const router = express.Router();
const { get, all } = require('../database/db');

// Dashboard Overview KPIs
router.get('/dashboard-kpis', async (req, res) => {
  try {
    const todaySales = await get(`
      SELECT COUNT(*) as count, COALESCE(SUM(grand_total), 0) as revenue
      FROM sales WHERE DATE(sale_timestamp) = DATE('now') AND status = 'completed'
    `);

    const monthSales = await get(`
      SELECT COALESCE(SUM(grand_total), 0) as revenue, COALESCE(SUM(subtotal), 0) as subtotal, COALESCE(SUM(tax_amount), 0) as tax
      FROM sales WHERE strftime('%Y-%m', sale_timestamp) = strftime('%Y-%m', 'now') AND status = 'completed'
    `);

    // Estimate profit margin for month
    const costEstimate = await get(`
      SELECT COALESCE(SUM(si.qty * b.cost_price), 0) as total_cost
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN stock_batches b ON si.batch_id = b.id
      WHERE strftime('%Y-%m', s.sale_timestamp) = strftime('%Y-%m', 'now') AND s.status = 'completed'
    `);

    const monthRev = monthSales ? monthSales.revenue : 0;
    const monthCost = costEstimate ? costEstimate.total_cost : 0;
    const profit = monthRev - monthCost;
    const profitMargin = monthRev > 0 ? ((profit / monthRev) * 100).toFixed(1) : 0;

    const lowStock = await get(`
      SELECT COUNT(*) as count FROM (
        SELECT m.id, m.min_stock_level, COALESCE(SUM(CASE WHEN b.is_quarantined = 0 AND b.expiry_date >= DATE('now') THEN b.qty_remaining ELSE 0 END), 0) as total_stock
        FROM medicines m LEFT JOIN stock_batches b ON m.id = b.medicine_id
        GROUP BY m.id HAVING total_stock <= m.min_stock_level
      )
    `);

    const expiryWarning = await get(`
      SELECT COUNT(*) as count FROM stock_batches
      WHERE qty_remaining > 0 AND JULIANDAY(expiry_date) - JULIANDAY(DATE('now')) BETWEEN 0 AND 90
    `);

    res.json({
      today_sales_count: todaySales ? todaySales.count : 0,
      today_revenue: todaySales ? todaySales.revenue : 0,
      month_revenue: monthRev,
      month_profit: profit,
      profit_margin_pct: profitMargin,
      low_stock_count: lowStock ? lowStock.count : 0,
      expiry_warning_count: expiryWarning ? expiryWarning.count : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Comprehensive Sales Report (Daily / Monthly / Yearly)
router.get('/sales-report', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'daily'; // daily, monthly, yearly
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || '';

    let sql = '';
    let params = [];

    if (timeframe === 'daily') {
      sql = `
        SELECT DATE(sale_timestamp) as period,
          COUNT(*) as invoice_count,
          SUM(subtotal) as subtotal,
          SUM(discount_amount) as discount,
          SUM(tax_amount) as tax,
          SUM(grand_total) as grand_total
        FROM sales
        WHERE status = 'completed'
      `;
      if (month) {
        sql += ` AND strftime('%Y-%m', sale_timestamp) = ?`;
        params.push(month);
      } else if (year) {
        sql += ` AND strftime('%Y', sale_timestamp) = ?`;
        params.push(String(year));
      }
      sql += ` GROUP BY DATE(sale_timestamp) ORDER BY period DESC`;
    } else if (timeframe === 'monthly') {
      sql = `
        SELECT strftime('%Y-%m', sale_timestamp) as period,
          COUNT(*) as invoice_count,
          SUM(subtotal) as subtotal,
          SUM(discount_amount) as discount,
          SUM(tax_amount) as tax,
          SUM(grand_total) as grand_total
        FROM sales
        WHERE status = 'completed'
      `;
      if (year) {
        sql += ` AND strftime('%Y', sale_timestamp) = ?`;
        params.push(String(year));
      }
      sql += ` GROUP BY strftime('%Y-%m', sale_timestamp) ORDER BY period DESC`;
    } else if (timeframe === 'yearly') {
      sql = `
        SELECT strftime('%Y', sale_timestamp) as period,
          COUNT(*) as invoice_count,
          SUM(subtotal) as subtotal,
          SUM(discount_amount) as discount,
          SUM(tax_amount) as tax,
          SUM(grand_total) as grand_total
        FROM sales
        WHERE status = 'completed'
        GROUP BY strftime('%Y', sale_timestamp)
        ORDER BY period DESC
      `;
    }

    const rows = await all(sql, params);
    
    // Overall Summary
    const totals = rows.reduce((acc, r) => {
      acc.invoices += r.invoice_count || 0;
      acc.subtotal += r.subtotal || 0;
      acc.discount += r.discount || 0;
      acc.tax += r.tax || 0;
      acc.grand_total += r.grand_total || 0;
      return acc;
    }, { invoices: 0, subtotal: 0, discount: 0, tax: 0, grand_total: 0 });

    res.json({ timeframe, summary: totals, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detailed Stock & FEFO Batch Inventory Report
router.get('/stock-report', async (req, res) => {
  try {
    const sql = `
      SELECT 
        b.id,
        m.brand_name,
        m.generic_name,
        m.strength,
        m.sku,
        b.batch_no,
        b.expiry_date,
        JULIANDAY(b.expiry_date) - JULIANDAY(DATE('now')) as days_to_expiry,
        b.qty_received,
        b.qty_remaining,
        b.cost_price,
        m.selling_price,
        (b.qty_remaining * b.cost_price) as total_cost_value,
        (b.qty_remaining * m.selling_price) as total_retail_value,
        s.name as supplier_name,
        b.is_quarantined
      FROM stock_batches b
      JOIN medicines m ON b.medicine_id = m.id
      LEFT JOIN suppliers s ON b.supplier_id = s.id
      ORDER BY b.expiry_date ASC
    `;
    const rows = await all(sql);

    const summary = rows.reduce((acc, r) => {
      acc.total_batches += 1;
      acc.total_units += r.qty_remaining;
      acc.total_cost_value += r.total_cost_value;
      acc.total_retail_value += r.total_retail_value;
      if (r.days_to_expiry < 0) acc.expired_batches += 1;
      else if (r.days_to_expiry <= 90) acc.near_expiry_batches += 1;
      return acc;
    }, { total_batches: 0, total_units: 0, total_cost_value: 0, total_retail_value: 0, expired_batches: 0, near_expiry_batches: 0 });

    res.json({ summary, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Medicine Status Report
router.get('/medicine-status', async (req, res) => {
  try {
    const sql = `
      SELECT 
        m.id,
        m.sku,
        m.brand_name,
        m.generic_name,
        m.strength,
        c.name as category_name,
        m.packing,
        m.selling_price,
        m.purchase_price,
        m.min_stock_level,
        m.schedule,
        m.prescription_req,
        COALESCE(SUM(CASE WHEN b.is_quarantined = 0 AND b.expiry_date >= DATE('now') THEN b.qty_remaining ELSE 0 END), 0) as total_stock,
        CASE 
          WHEN COALESCE(SUM(CASE WHEN b.is_quarantined = 0 AND b.expiry_date >= DATE('now') THEN b.qty_remaining ELSE 0 END), 0) = 0 THEN 'Out of Stock'
          WHEN COALESCE(SUM(CASE WHEN b.is_quarantined = 0 AND b.expiry_date >= DATE('now') THEN b.qty_remaining ELSE 0 END), 0) <= m.min_stock_level THEN 'Low Stock'
          ELSE 'In Stock'
        END as status
      FROM medicines m
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN stock_batches b ON m.id = b.medicine_id
      GROUP BY m.id
      ORDER BY m.brand_name ASC
    `;
    const rows = await all(sql);

    const summary = rows.reduce((acc, r) => {
      acc.total_medicines += 1;
      if (r.status === 'In Stock') acc.in_stock += 1;
      else if (r.status === 'Low Stock') acc.low_stock += 1;
      else if (r.status === 'Out of Stock') acc.out_of_stock += 1;
      return acc;
    }, { total_medicines: 0, in_stock: 0, low_stock: 0, out_of_stock: 0 });

    res.json({ summary, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Currently Stocked & Inventory Valuation Report
router.get('/currently-stocked', async (req, res) => {
  try {
    const sql = `
      SELECT 
        m.id,
        m.brand_name,
        m.generic_name,
        m.strength,
        m.sku,
        c.name as category_name,
        SUM(b.qty_remaining) as stock_qty,
        m.selling_price,
        AVG(b.cost_price) as avg_cost_price,
        SUM(b.qty_remaining * b.cost_price) as total_cost_valuation,
        SUM(b.qty_remaining * m.selling_price) as total_retail_valuation,
        (SUM(b.qty_remaining * m.selling_price) - SUM(b.qty_remaining * b.cost_price)) as potential_profit
      FROM medicines m
      JOIN stock_batches b ON m.id = b.medicine_id
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE b.is_quarantined = 0 AND b.qty_remaining > 0
      GROUP BY m.id
      ORDER BY total_retail_valuation DESC
    `;
    const rows = await all(sql);

    const summary = rows.reduce((acc, r) => {
      acc.stocked_items += 1;
      acc.total_units += r.stock_qty;
      acc.total_cost_valuation += r.total_cost_valuation;
      acc.total_retail_valuation += r.total_retail_valuation;
      acc.potential_profit += r.potential_profit;
      return acc;
    }, { stocked_items: 0, total_units: 0, total_cost_valuation: 0, total_retail_valuation: 0, potential_profit: 0 });

    res.json({ summary, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy Reports
router.get('/daily-sales', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const sql = `
      SELECT DATE(sale_timestamp) as date,
        COUNT(*) as invoice_count,
        SUM(subtotal) as subtotal,
        SUM(discount_amount) as discount,
        SUM(tax_amount) as tax,
        SUM(grand_total) as grand_total
      FROM sales
      WHERE status = 'completed' AND sale_timestamp >= DATE('now', '-' || ? || ' days')
      GROUP BY DATE(sale_timestamp)
      ORDER BY date ASC
    `;
    const rows = await all(sql, [days]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/profit-margin', async (req, res) => {
  try {
    const sql = `
      SELECT 
        m.brand_name, m.generic_name, m.strength, m.sku,
        SUM(si.qty) as total_qty_sold,
        SUM(si.total_amount) as total_revenue,
        SUM(si.qty * b.cost_price) as total_cost,
        (SUM(si.total_amount) - SUM(si.qty * b.cost_price)) as gross_profit,
        CASE WHEN SUM(si.total_amount) > 0 
          THEN ROUND(((SUM(si.total_amount) - SUM(si.qty * b.cost_price)) / SUM(si.total_amount)) * 100, 2)
          ELSE 0 END as profit_margin_pct
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN medicines m ON si.medicine_id = m.id
      JOIN stock_batches b ON si.batch_id = b.id
      WHERE s.status = 'completed'
      GROUP BY m.id
      ORDER BY gross_profit DESC
    `;
    const rows = await all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tax-summary', async (req, res) => {
  try {
    const sql = `
      SELECT 
        si.gst_percent,
        SUM(si.total_amount - si.gst_amount) as taxable_amount,
        SUM(si.gst_amount) as total_tax_collected,
        COUNT(DISTINCT si.sale_id) as sales_count
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed'
      GROUP BY si.gst_percent
      ORDER BY si.gst_percent ASC
    `;
    const rows = await all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/best-sellers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const sql = `
      SELECT m.id, m.brand_name, m.generic_name, m.strength, m.sku, c.name as category_name,
        SUM(si.qty) as total_qty_sold,
        SUM(si.total_amount) as total_revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN medicines m ON si.medicine_id = m.id
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE s.status = 'completed'
      GROUP BY m.id
      ORDER BY total_qty_sold DESC
      LIMIT ?
    `;
    const rows = await all(sql, [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/slow-movers', async (req, res) => {
  try {
    const sql = `
      SELECT m.id, m.brand_name, m.generic_name, m.strength, m.sku, c.name as category_name,
        COALESCE(SUM(b.qty_remaining), 0) as stock_in_hand,
        COALESCE(SUM(si.qty), 0) as total_qty_sold
      FROM medicines m
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN stock_batches b ON m.id = b.medicine_id AND b.is_quarantined = 0
      LEFT JOIN sale_items si ON m.id = si.medicine_id
      GROUP BY m.id
      HAVING stock_in_hand > 0
      ORDER BY total_qty_sold ASC, stock_in_hand DESC
      LIMIT 20
    `;
    const rows = await all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
