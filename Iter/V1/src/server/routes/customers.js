const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/db');

// List customers
router.get('/', async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q}%` : '%';
    const customers = await all(`
      SELECT c.*,
        COUNT(s.id) as total_orders,
        COALESCE(SUM(s.grand_total), 0) as total_spent
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id AND s.status = 'completed'
      WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?
      GROUP BY c.id
      ORDER BY c.name ASC
    `, [q, q, q]);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone number are required' });

    const result = await run(`
      INSERT INTO customers (name, phone, email, address, loyalty_points)
      VALUES (?, ?, ?, ?, 0)
    `, [name, phone, email || '', address || '']);

    const newCustomer = await get('SELECT * FROM customers WHERE id = ?', [result.lastID]);
    res.status(201).json(newCustomer);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'A customer with this phone number already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, address, loyalty_points } = req.body;
    await run(`
      UPDATE customers SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        loyalty_points = COALESCE(?, loyalty_points)
      WHERE id = ?
    `, [name, phone, email, address, loyalty_points, req.params.id]);

    const updated = await get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id == 1) return res.status(400).json({ error: 'Cannot delete Walk-in Customer' });
    await run('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
