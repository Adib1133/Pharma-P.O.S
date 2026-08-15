const fs = require('fs');
const path = require('path');
const { DB_PATH } = require('../database/db');

// When running as a pkg-packaged exe, __dirname points to the virtual snapshot
// filesystem (/snapshot/...) which is read-only. All writable paths (backups,
// uploads, DB) must be resolved relative to the real exe directory instead.
const isPackaged = typeof process.pkg !== 'undefined';
const appRoot = isPackaged
  ? path.dirname(process.execPath)
  : path.join(__dirname, '..', '..', '..');

const BACKUP_DIR = path.join(appRoot, 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function createBackup() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(DB_PATH)) {
      return reject(new Error('Database file does not exist'));
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `pharmacy_backup_${timestamp}.db`;
    const destPath = path.join(BACKUP_DIR, backupFileName);

    fs.copyFile(DB_PATH, destPath, (err) => {
      if (err) return reject(err);
      console.log(`[Backup] Successfully created local DB backup: ${backupFileName}`);
      resolve({ fileName: backupFileName, fullPath: destPath });
    });
  });
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  const files = fs.readdirSync(BACKUP_DIR);
  return files
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        fileName: f,
        size: stat.size,
        createdAt: stat.birthtime
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

// FIX #15: Delay the startup backup by 5 seconds.
// Previously, createBackup() fired immediately after initDb(), while
// SQLite's WAL journal may not have checkpointed yet, potentially resulting
// in a backup copy that is incomplete or reflects an inconsistent state.
// A 5-second delay allows WAL to settle before the DB file is copied.
function initAutoBackupSchedule() {
  const FIVE_SECONDS = 5 * 1000;
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  // Delayed first backup on startup
  setTimeout(() => {
    createBackup().catch(err => console.error('[Backup Error] Startup backup failed:', err));
  }, FIVE_SECONDS);

  // Recurring daily backup
  setInterval(() => {
    createBackup().catch(err => console.error('[Backup Error] Scheduled backup failed:', err));
  }, TWENTY_FOUR_HOURS);
}

module.exports = {
  createBackup,
  listBackups,
  initAutoBackupSchedule,
  BACKUP_DIR
};
