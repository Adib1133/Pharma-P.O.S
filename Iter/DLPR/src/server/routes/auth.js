const express = require('express');
const router = express.Router();
const { get, all } = require('../database/db');

// Login with PIN
router.post('/login', async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    const user = await get('SELECT id, name, role, pin, active FROM users WHERE pin = ? AND active = 1', [String(pin)]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid PIN or user deactivated' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List active cashiers (for PIN login dropdown or cashier switch)
router.get('/users', async (req, res) => {
  try {
    const users = await all('SELECT id, name, role FROM users WHERE active = 1 ORDER BY name ASC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
