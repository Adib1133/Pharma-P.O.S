const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/db');

// List suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await all(`
      SELECT s.*,
        COUNT(b.id) as total_batches_supplied
      FROM suppliers s
      LEFT JOIN stock_batches b ON s.id = b.supplier_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `);
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create supplier
router.post('/', async (req, res) => {
  try {
    const { name, contact_person, phone, email, address, gstin } = req.body;
    if (!name) return res.status(400).json({ error: 'Supplier name is required' });

    const result = await run(`
      INSERT INTO suppliers (name, contact_person, phone, email, address, gstin)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, contact_person || '', phone || '', email || '', address || '', gstin || '']);

    const newSupplier = await get('SELECT * FROM suppliers WHERE id = ?', [result.lastID]);
    res.status(201).json(newSupplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update supplier
router.put('/:id', async (req, res) => {
  try {
    const { name, contact_person, phone, email, address, gstin } = req.body;
    await run(`
      UPDATE suppliers SET
        name = COALESCE(?, name),
        contact_person = COALESCE(?, contact_person),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        gstin = COALESCE(?, gstin)
      WHERE id = ?
    `, [name, contact_person, phone, email, address, gstin, req.params.id]);

    const updated = await get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete supplier
router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
