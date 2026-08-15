const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Resolve writable upload dir relative to exe when packaged, not snapshot
const isPackaged = typeof process.pkg !== 'undefined';
const appRoot = isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..', '..', '..');
const UPLOAD_TEMP_DIR = path.join(appRoot, 'uploads');
if (!fs.existsSync(UPLOAD_TEMP_DIR)) fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
const upload = multer({ dest: UPLOAD_TEMP_DIR });
const { run, get, all } = require('../database/db');

// Type-ahead medicine search (for POS & Admin search bars)
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q}%` : '%';
    const sql = `
      SELECT m.*, c.name as category_name,
        COALESCE(SUM(CASE WHEN b.is_quarantined = 0 AND b.expiry_date >= DATE('now') THEN b.qty_remaining ELSE 0 END), 0) as total_stock
      FROM medicines m
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN stock_batches b ON m.id = b.medicine_id
      WHERE m.brand_name LIKE ? OR m.generic_name LIKE ? OR m.sku LIKE ? OR m.hsn_code LIKE ?
      GROUP BY m.id
      ORDER BY m.brand_name ASC
      LIMIT 30
    `;
    const results = await all(sql, [q, q, q, q]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all medicines with stock info and category
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT m.*, c.name as category_name,
        COALESCE(SUM(CASE WHEN b.is_quarantined = 0 AND b.expiry_date >= DATE('now') THEN b.qty_remaining ELSE 0 END), 0) as total_stock
      FROM medicines m
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN stock_batches b ON m.id = b.medicine_id
      GROUP BY m.id
      ORDER BY m.brand_name ASC
    `;
    const medicines = await all(sql);
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await all('SELECT * FROM categories ORDER BY name ASC');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single medicine details with batch breakdown
router.get('/:id', async (req, res) => {
  try {
    const med = await get('SELECT m.*, c.name as category_name FROM medicines m LEFT JOIN categories c ON m.category_id = c.id WHERE m.id = ?', [req.params.id]);
    if (!med) return res.status(404).json({ error: 'Medicine not found' });
    
    const batches = await all('SELECT b.*, s.name as supplier_name FROM stock_batches b LEFT JOIN suppliers s ON b.supplier_id = s.id WHERE b.medicine_id = ? ORDER BY b.expiry_date ASC', [req.params.id]);
    med.batches = batches;

    res.json(med);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new medicine
router.post('/', async (req, res) => {
  try {
    const {
      brand_name, generic_name, strength, manufacturer, category_id, packing,
      mrp, selling_price, purchase_price, gst_percent, hsn_code,
      schedule, prescription_req, sku, min_stock_level
    } = req.body;

    if (!brand_name || !generic_name || selling_price === undefined) {
      return res.status(400).json({ error: 'Brand name, generic name, and selling price are required' });
    }

    const generatedSku = sku || ('MED' + Math.floor(100000 + Math.random() * 900000));

    const result = await run(`
      INSERT INTO medicines 
      (brand_name, generic_name, strength, manufacturer, category_id, packing, mrp, selling_price, purchase_price, gst_percent, hsn_code, schedule, prescription_req, sku, min_stock_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      brand_name, generic_name, strength || '', manufacturer || '', category_id || null, packing || 'Strip',
      mrp || selling_price, selling_price, purchase_price || 0, gst_percent || 12, hsn_code || '3004',
      schedule || 'OTC', prescription_req ? 1 : 0, generatedSku, min_stock_level || 10
    ]);

    const newMed = await get('SELECT * FROM medicines WHERE id = ?', [result.lastID]);
    res.status(201).json(newMed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update medicine
router.put('/:id', async (req, res) => {
  try {
    const {
      brand_name, generic_name, strength, manufacturer, category_id, packing,
      mrp, selling_price, purchase_price, gst_percent, hsn_code,
      schedule, prescription_req, sku, min_stock_level
    } = req.body;

    await run(`
      UPDATE medicines SET
        brand_name = ?, generic_name = ?, strength = ?, manufacturer = ?, category_id = ?, packing = ?,
        mrp = ?, selling_price = ?, purchase_price = ?, gst_percent = ?, hsn_code = ?,
        schedule = ?, prescription_req = ?, sku = ?, min_stock_level = ?
      WHERE id = ?
    `, [
      brand_name, generic_name, strength || '', manufacturer, category_id || null, packing,
      mrp, selling_price, purchase_price, gst_percent, hsn_code,
      schedule, prescription_req ? 1 : 0, sku, min_stock_level, req.params.id
    ]);

    const updatedMed = await get('SELECT * FROM medicines WHERE id = ?', [req.params.id]);
    res.json(updatedMed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete medicine
router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM medicines WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Medicine deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk CSV Import
router.post('/import-csv', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

  try {
    const content = fs.readFileSync(req.file.path, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'CSV file is empty or missing headers' });
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    let importedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
      if (row.length < headers.length) continue;

      const rowData = {};
      headers.forEach((h, idx) => {
        rowData[h] = row[idx];
      });

      const brand = rowData['brand_name'] || rowData['brand'] || rowData['name'];
      const generic = rowData['generic_name'] || rowData['generic'] || brand;
      if (!brand) continue;

      const mrp = parseFloat(rowData['mrp']) || 10.0;
      const sp = parseFloat(rowData['selling_price']) || mrp;
      const pp = parseFloat(rowData['purchase_price']) || (sp * 0.7);
      const sku = rowData['sku'] || ('MED' + Math.floor(100000 + Math.random() * 900000));

      await run(`
        INSERT OR REPLACE INTO medicines 
        (brand_name, generic_name, manufacturer, packing, mrp, selling_price, purchase_price, gst_percent, hsn_code, schedule, prescription_req, sku, min_stock_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        brand, generic, rowData['manufacturer'] || '', rowData['packing'] || '10 Strip',
        mrp, sp, pp, parseFloat(rowData['gst_percent']) || 12, rowData['hsn_code'] || '3004',
        rowData['schedule'] || 'OTC', rowData['prescription_req'] === '1' ? 1 : 0, sku, 10
      ]);

      importedCount++;
    }

    fs.unlinkSync(req.file.path);
    res.json({ success: true, count: importedCount, message: `Successfully imported ${importedCount} medicines` });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
