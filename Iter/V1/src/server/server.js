const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./database/db');
const { initAutoBackupSchedule } = require('./utils/backup');

const app = express();
const PORT = 4580;
const HOST = '127.0.0.1'; // Bind strictly to 127.0.0.1 for 100% offline security

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Asset Directories
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.use('/pos', express.static(path.join(publicDir, 'pos')));
app.use('/admin', express.static(path.join(publicDir, 'admin')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/register', require('./routes/register'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));

// Redirect root to POS UI
app.get('/', (req, res) => {
  res.redirect('/pos');
});

// SPA fallback routes
app.get('/pos/*', (req, res) => {
  res.sendFile(path.join(publicDir, 'pos', 'index.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin', 'index.html'));
});

// Start Server
async function startServer() {
  try {
    await initDb();
    initAutoBackupSchedule();

    app.listen(PORT, HOST, () => {
      console.log(`====================================================`);
      console.log(` Pharmacy POS & Management System is Running Local!`);
      console.log(` POS Terminal : http://${HOST}:${PORT}/pos`);
      console.log(` Admin Panel  : http://${HOST}:${PORT}/admin`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to launch application server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
