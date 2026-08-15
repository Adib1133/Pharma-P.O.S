const fs = require('fs');
const path = require('path');
const { DB_PATH } = require('../database/db');

const BACKUP_DIR = path.join(__dirname, '..', '..', '..', 'backups');

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

function initAutoBackupSchedule() {
  // Trigger backup once on app start
  createBackup().catch(err => console.error('[Backup Error]', err));

  // Schedule daily backup (every 24 hours)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    createBackup().catch(err => console.error('[Backup Error]', err));
  }, TWENTY_FOUR_HOURS);
}

module.exports = {
  createBackup,
  listBackups,
  initAutoBackupSchedule,
  BACKUP_DIR
};
