/**
 * POS Launcher — Entry point for the packaged single executable.
 *
 * This file:
 *   1. Suppresses Node.js experimental warnings (node:sqlite warning)
 *   2. Resolves all paths relative to the executable location
 *   3. Starts the Express server
 *   4. Opens the system default browser at the POS terminal
 *   5. Provides a clean console status display
 */

'use strict';

// ─── Top-level error handlers — must come FIRST so any crash is visible ───────
// Without these, if the process crashes before the async IIFE, the console
// window disappears instantly and the user sees nothing.
process.on('uncaughtException', (err) => {
  console.error('\n\x1b[31m✖ Fatal Error:\x1b[0m', err.message);
  if (err.code === 'ERR_UNKNOWN_BUILTIN_MODULE' || err.message.includes('node:sqlite')) {
    console.error('\x1b[33m  Hint: This build requires the --experimental-sqlite Node.js flag.');
    console.error('  Please rebuild using: npm run build\x1b[0m');
  }
  console.log('\n\x1b[90m  Error details:', err.stack, '\x1b[0m');
  console.log('\n  Press Enter to close...');
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  console.error('\n\x1b[31m✖ Unhandled Error:\x1b[0m', reason);
  console.log('\n  Press Enter to close...');
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(1));
});

// Suppress the node:sqlite "ExperimentalWarning" from cluttering the console
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'ExperimentalWarning' && warning.message.includes('SQLite')) return;
  console.warn(warning.name + ':', warning.message);
});

const path = require('path');
const { exec } = require('child_process');

const PORT = 4580;
const HOST = '127.0.0.1';
const POS_URL  = `http://${HOST}:${PORT}/pos`;
const ADMIN_URL = `http://${HOST}:${PORT}/admin`;

// ─── ASCII Banner ───────────────────────────────────────────────────────────
function printBanner() {
  console.clear();
  console.log('\x1b[36m');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║       💊  PHARMACY POS SYSTEM  💊                 ║');
  console.log('║      Offline Point-of-Sale & Management           ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║  POS Terminal : \x1b[33mhttp://127.0.0.1:4580/pos\x1b[36m    ║`);
  console.log(`║  Admin Panel  : \x1b[33mhttp://127.0.0.1:4580/admin\x1b[36m  ║`);
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log('║  Status: \x1b[32mStarting...\x1b[36m                             ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('\x1b[0m');
}

// ─── Open Browser ───────────────────────────────────────────────────────────
function openBrowser(url) {
  const cmd = process.platform === 'win32'  ? `start "" "${url}"` :
              process.platform === 'darwin' ? `open "${url}"` :
              `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.error('Could not open browser automatically:', err.message);
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
printBanner();

const express   = require('express');
const cors      = require('cors');
const { initDb }               = require('./src/server/database/db');
const { initAutoBackupSchedule } = require('./src/server/utils/backup');

// Build the Express app manually (same as server.js) so we control the listen callback
const app = express();

// Middleware
app.use(cors({
  origin: [`http://${HOST}:${PORT}`, `http://localhost:${PORT}`],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static assets
const isPackaged = typeof process.pkg !== 'undefined';
const appRoot    = isPackaged ? path.dirname(process.execPath) : __dirname;
const publicDir  = path.join(appRoot, 'src', 'public');

app.use(express.static(publicDir));
app.use('/pos',   express.static(path.join(publicDir, 'pos')));
app.use('/admin', express.static(path.join(publicDir, 'admin')));
// Serve uploaded logos from the app root uploads folder
app.use('/uploads', express.static(path.join(appRoot, 'src', 'public', 'uploads')));

// API Routes
app.use('/api/auth',      require('./src/server/routes/auth'));
app.use('/api/medicines', require('./src/server/routes/medicines'));
app.use('/api/stock',     require('./src/server/routes/stock'));
app.use('/api/sales',     require('./src/server/routes/sales'));
app.use('/api/register',  require('./src/server/routes/register'));
app.use('/api/reports',   require('./src/server/routes/reports'));
app.use('/api/customers', require('./src/server/routes/customers'));
app.use('/api/suppliers', require('./src/server/routes/suppliers'));
app.use('/api/users',     require('./src/server/routes/users'));
app.use('/api/settings',  require('./src/server/routes/settings'));

app.get('/', (req, res) => res.redirect('/pos'));
app.get('/pos/*',   (req, res) => res.sendFile(path.join(publicDir, 'pos',   'index.html')));
app.get('/admin/*', (req, res) => res.sendFile(path.join(publicDir, 'admin', 'index.html')));

// ─── Start ───────────────────────────────────────────────────────────────────
(async () => {
  try {
    await initDb();
    initAutoBackupSchedule();

    const server = app.listen(PORT, HOST, () => {
      console.log('\x1b[32m✔ Server is running!\x1b[0m');
      console.log(`\x1b[36m  → POS Terminal  : \x1b[33m${POS_URL}\x1b[0m`);
      console.log(`\x1b[36m  → Admin Panel   : \x1b[33m${ADMIN_URL}\x1b[0m`);
      console.log('\x1b[90m  Press Ctrl+C to stop the server.\x1b[0m\n');
      setTimeout(() => openBrowser(POS_URL), 900);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\x1b[31m✖ Port ${PORT} is already in use!\x1b[0m`);
        console.log(`\x1b[33m  The POS may already be running. Opening browser...\x1b[0m`);
        openBrowser(POS_URL);
        setTimeout(() => process.exit(0), 2000);
      } else {
        console.error('\x1b[31m✖ Server error:\x1b[0m', err.message);
        process.exit(1);
      }
    });

  } catch (err) {
    console.error('\x1b[31m✖ Failed to start server:\x1b[0m', err.message);
    console.log('\nPress Enter to exit...');
    process.stdin.resume();
    process.stdin.once('data', () => process.exit(1));
  }
})();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\x1b[33m⚠ Shutting down POS server... Goodbye!\x1b[0m');
  process.exit(0);
});
