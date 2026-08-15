const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { run, all, DB_PATH } = require('../database/db');
const { createBackup, listBackups, BACKUP_DIR } = require('../utils/backup');

const upload = multer({ dest: 'uploads/' });

// Get settings
router.get('/', async (req, res) => {
  try {
    const rows = await all('SELECT key, value FROM store_settings');
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings
router.post('/', async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await run('INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?)', [key, String(value)]);
    }
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logo Upload
router.post('/logo', upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No logo file provided' });

  try {
    const ext = path.extname(req.file.originalname) || '.png';
    const targetDir = path.join(__dirname, '..', '..', 'public', 'uploads');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const targetPath = path.join(targetDir, `logo${ext}`);
    fs.copyFileSync(req.file.path, targetPath);
    fs.unlinkSync(req.file.path);

    const logoUrl = `/uploads/logo${ext}?t=${Date.now()}`;
    await run('INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?)', ['store_logo', logoUrl]);

    res.json({ success: true, logo_url: logoUrl });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// Backup List
router.get('/backups', (req, res) => {
  try {
    const backups = listBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger Manual Backup
router.post('/backup/create', async (req, res) => {
  try {
    const backupInfo = await createBackup();
    res.json({ success: true, backup: backupInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download latest backup
router.get('/backup/download', async (req, res) => {
  try {
    const backups = listBackups();
    if (backups.length === 0) {
      await createBackup();
    }
    const latest = listBackups()[0];
    const fullPath = path.join(BACKUP_DIR, latest.fileName);
    res.download(fullPath, latest.fileName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore Database from Upload
router.post('/backup/restore', upload.single('backup_file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No database backup file provided' });

  try {
    // Backup current DB before overwrite
    await createBackup();

    // Replace current database with uploaded file
    fs.copyFileSync(req.file.path, DB_PATH);
    fs.unlinkSync(req.file.path);

    res.json({ success: true, message: 'Database successfully restored! Please restart application to ensure cached states refresh.' });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
