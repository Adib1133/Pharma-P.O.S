const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/db');

// List all users
router.get('/', async (req, res) => {
  try {
    const users = await all('SELECT id, name, role, active, created_at FROM users ORDER BY name ASC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { name, role, pin } = req.body;
    if (!name || !role || !pin) {
      return res.status(400).json({ error: 'Name, role, and PIN are required' });
    }
    if (!['admin', 'cashier'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or cashier' });
    }

    const result = await run(`
      INSERT INTO users (name, role, pin, active)
      VALUES (?, ?, ?, 1)
    `, [name, role, String(pin)]);

    const newUser = await get('SELECT id, name, role, active, created_at FROM users WHERE id = ?', [result.lastID]);
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user / Change PIN
router.put('/:id', async (req, res) => {
  try {
    const { name, role, pin, active } = req.body;
    await run(`
      UPDATE users SET
        name = COALESCE(?, name),
        role = COALESCE(?, role),
        pin = COALESCE(?, pin),
        active = COALESCE(?, active)
      WHERE id = ?
    `, [name, role, pin ? String(pin) : null, active, req.params.id]);

    const updated = await get('SELECT id, name, role, active, created_at FROM users WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id == 1) return res.status(400).json({ error: 'Cannot delete primary admin user' });
    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
