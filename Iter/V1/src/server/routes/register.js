const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/db');

// Get current open session for cashier
router.get('/current', async (req, res) => {
  try {
    const cashier_id = req.query.cashier_id || 1;
    const session = await get(`
      SELECT * FROM cash_register_sessions 
      WHERE cashier_id = ? AND status = 'open'
      ORDER BY opened_at DESC LIMIT 1
    `, [cashier_id]);

    if (!session) {
      return res.json({ isOpen: false, session: null });
    }

    // Calculate total cash collected during this session
    const cashTotal = await get(`
      SELECT COALESCE(SUM(grand_total), 0) as total_cash_sales
      FROM sales
      WHERE cashier_id = ? AND payment_method = 'cash' AND sale_timestamp >= ? AND status = 'completed'
    `, [cashier_id, session.opened_at]);

    const totalSalesCount = await get(`
      SELECT COUNT(*) as sales_count, COALESCE(SUM(grand_total), 0) as total_revenue
      FROM sales
      WHERE cashier_id = ? AND sale_timestamp >= ? AND status = 'completed'
    `, [cashier_id, session.opened_at]);

    const expectedCash = session.opening_balance + (cashTotal ? cashTotal.total_cash_sales : 0);

    res.json({
      isOpen: true,
      session: {
        ...session,
        cash_sales: cashTotal ? cashTotal.total_cash_sales : 0,
        total_sales_count: totalSalesCount ? totalSalesCount.sales_count : 0,
        total_revenue: totalSalesCount ? totalSalesCount.total_revenue : 0,
        expected_cash: expectedCash
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Open register session
router.post('/open', async (req, res) => {
  try {
    const { cashier_id, opening_balance } = req.body;
    const cid = cashier_id || 1;
    const openFloat = parseFloat(opening_balance) || 0;

    // Close any unclosed lingering session
    await run(`UPDATE cash_register_sessions SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE cashier_id = ? AND status = 'open'`, [cid]);

    const result = await run(`
      INSERT INTO cash_register_sessions (cashier_id, opening_balance, status)
      VALUES (?, ?, 'open')
    `, [cid, openFloat]);

    const newSession = await get('SELECT * FROM cash_register_sessions WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, session: newSession });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Close register session
router.post('/close', async (req, res) => {
  try {
    const { session_id, closing_balance_actual, notes } = req.body;
    if (!session_id || closing_balance_actual === undefined) {
      return res.status(400).json({ error: 'Session ID and actual closing count are required' });
    }

    const session = await get('SELECT * FROM cash_register_sessions WHERE id = ?', [session_id]);
    if (!session) return res.status(404).json({ error: 'Register session not found' });

    // Calculate total cash sales in session
    const cashTotal = await get(`
      SELECT COALESCE(SUM(grand_total), 0) as total_cash_sales
      FROM sales
      WHERE cashier_id = ? AND payment_method = 'cash' AND sale_timestamp >= ? AND status = 'completed'
    `, [session.cashier_id, session.opened_at]);

    const expectedCash = session.opening_balance + (cashTotal ? cashTotal.total_cash_sales : 0);
    const actualCash = parseFloat(closing_balance_actual);
    const variance = actualCash - expectedCash;

    await run(`
      UPDATE cash_register_sessions SET
        status = 'closed',
        closed_at = CURRENT_TIMESTAMP,
        closing_balance_expected = ?,
        closing_balance_actual = ?,
        notes = ?
      WHERE id = ?
    `, [expectedCash, actualCash, notes || `Variance: $${variance.toFixed(2)}`, session_id]);

    const closedSession = await get('SELECT * FROM cash_register_sessions WHERE id = ?', [session_id]);

    res.json({
      success: true,
      session: closedSession,
      expectedCash,
      actualCash,
      variance
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
