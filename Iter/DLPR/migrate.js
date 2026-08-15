/**
 * migrate.js — Full data migration from old POS database → new dist/pharmacy.db
 *
 * Migrates ALL data from the previous software's pharmacy.db into the
 * new executable's database with full conflict handling:
 *   - categories, suppliers, customers, users, store_settings
 *   - medicines, stock_batches, stock_audit_log
 *   - sales, sale_items, cash_register_sessions
 *
 * Run: node --experimental-sqlite migrate.js
 */

'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

// ─── CONFIGURE THIS ───────────────────────────────────────────────────────────
// Set OLD_DB_PATH to the full path of your previous pharmacy.db file.
// Default: the V1 POS software location on this machine.
const OLD_DB_PATH = path.join('C:\\Users\\MPL\\Desktop\\POS\\pharmacy.db');
// ──────────────────────────────────────────────────────────────────────────────

const NEW_DB_PATH = path.join(__dirname, 'dist', 'pharmacy.db');

if (!fs.existsSync(OLD_DB_PATH)) {
  console.error('❌  Old database not found at:', OLD_DB_PATH);
  process.exit(1);
}
if (!fs.existsSync(NEW_DB_PATH)) {
  console.error('❌  New dist database not found at:', NEW_DB_PATH);
  process.exit(1);
}

console.log('\n🔄  Pharmacy POS — Data Migration');
console.log('   Old DB:', OLD_DB_PATH);
console.log('   New DB:', NEW_DB_PATH);
console.log();

// Backup new DB before migration
const backupPath = NEW_DB_PATH.replace('.db', `_pre_migration_${Date.now()}.db`);
fs.copyFileSync(NEW_DB_PATH, backupPath);
console.log(`✔  Backed up new DB → ${path.basename(backupPath)}\n`);

const src = new DatabaseSync(OLD_DB_PATH, { readonly: true });
const dst = new DatabaseSync(NEW_DB_PATH);

dst.exec('PRAGMA foreign_keys = OFF;');
dst.exec('BEGIN TRANSACTION;');

let stats = {};

try {

  // ─── 1. CATEGORIES ──────────────────────────────────────────────────────
  const categories = src.prepare('SELECT * FROM categories').all();
  const insCategory = dst.prepare(`
    INSERT OR IGNORE INTO categories (id, name, description) VALUES (?, ?, ?)
  `);
  categories.forEach(r => insCategory.run(r.id, r.name, r.description || null));
  stats.categories = categories.length;

  // ─── 2. SUPPLIERS ───────────────────────────────────────────────────────
  const suppliers = src.prepare('SELECT * FROM suppliers').all();
  const insSupplier = dst.prepare(`
    INSERT OR IGNORE INTO suppliers (id, name, contact_person, phone, email, address, gstin, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  suppliers.forEach(r => insSupplier.run(
    r.id, r.name, r.contact_person || null, r.phone || null,
    r.email || null, r.address || null, r.gstin || null, r.created_at || null
  ));
  stats.suppliers = suppliers.length;

  // ─── 3. USERS ───────────────────────────────────────────────────────────
  const users = src.prepare('SELECT * FROM users').all();
  const insUser = dst.prepare(`
    INSERT OR IGNORE INTO users (id, name, role, pin, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  users.forEach(r => insUser.run(
    r.id, r.name, r.role, r.pin, r.active ?? 1, r.created_at || null
  ));
  stats.users = users.length;

  // ─── 4. CUSTOMERS ───────────────────────────────────────────────────────
  const customers = src.prepare('SELECT * FROM customers').all();
  const insCust = dst.prepare(`
    INSERT OR IGNORE INTO customers (id, name, phone, email, address, loyalty_points, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  customers.forEach(r => insCust.run(
    r.id, r.name,
    (r.phone && r.phone.trim() && r.phone !== '0000000000') ? r.phone.trim() : null,
    r.email || null, r.address || null,
    r.loyalty_points || 0, r.created_at || null
  ));
  stats.customers = customers.length;

  // ─── 5. STORE SETTINGS ──────────────────────────────────────────────────
  const settings = src.prepare('SELECT * FROM store_settings').all();
  const insSetting = dst.prepare(`
    INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?)
  `);
  settings.forEach(r => insSetting.run(r.key, r.value));
  stats.store_settings = settings.length;

  // ─── 6. MEDICINES ───────────────────────────────────────────────────────
  const medicines = src.prepare('SELECT * FROM medicines').all();
  const insMed = dst.prepare(`
    INSERT OR IGNORE INTO medicines
      (id, brand_name, generic_name, strength, manufacturer, category_id,
       packing, sku, mrp, selling_price, purchase_price, gst_percent,
       hsn_code, schedule, prescription_req, min_stock_level, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  medicines.forEach(r => insMed.run(
    r.id, r.brand_name, r.generic_name, r.strength || null,
    r.manufacturer || null, r.category_id || null, r.packing || null,
    r.sku || null, r.mrp || 0, r.selling_price || 0, r.purchase_price || 0,
    r.gst_percent || 0, r.hsn_code || null, r.schedule || 'OTC',
    r.prescription_req ? 1 : 0, r.min_stock_level || 10, r.created_at || null
  ));
  stats.medicines = medicines.length;

  // ─── 7. STOCK BATCHES ───────────────────────────────────────────────────
  const batches = src.prepare('SELECT * FROM stock_batches').all();
  const insBatch = dst.prepare(`
    INSERT OR IGNORE INTO stock_batches
      (id, medicine_id, batch_no, expiry_date, qty_received, qty_remaining,
       purchase_date, cost_price, supplier_id, is_quarantined, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  batches.forEach(r => insBatch.run(
    r.id, r.medicine_id, r.batch_no, r.expiry_date,
    r.qty_received, r.qty_remaining,
    r.purchase_date || null, r.cost_price || 0,
    r.supplier_id || null, r.is_quarantined || 0, r.created_at || null
  ));
  stats.stock_batches = batches.length;

  // ─── 8. STOCK AUDIT LOG ─────────────────────────────────────────────────
  const auditLogs = src.prepare('SELECT * FROM stock_audit_log').all();
  const insAudit = dst.prepare(`
    INSERT OR IGNORE INTO stock_audit_log
      (id, batch_id, medicine_id, change_qty, reason, user_id, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  auditLogs.forEach(r => insAudit.run(
    r.id, r.batch_id, r.medicine_id || null,
    r.change_qty, r.reason || null, r.user_id || null, r.timestamp || null
  ));
  stats.stock_audit_log = auditLogs.length;

  // ─── 9. SALES ───────────────────────────────────────────────────────────
  const sales = src.prepare('SELECT * FROM sales').all();
  const insSale = dst.prepare(`
    INSERT OR IGNORE INTO sales
      (id, invoice_no, sale_timestamp, cashier_id, customer_id,
       subtotal, discount_amount, tax_amount, grand_total,
       payment_method, payment_details, cash_given, change_due, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  sales.forEach(r => insSale.run(
    r.id, r.invoice_no, r.sale_timestamp, r.cashier_id, r.customer_id || null,
    r.subtotal || 0, r.discount_amount || 0, r.tax_amount || 0, r.grand_total || 0,
    r.payment_method || 'cash',
    r.payment_details || '{}', r.cash_given || 0, r.change_due || 0,
    r.status || 'completed'
  ));
  stats.sales = sales.length;

  // ─── 10. SALE ITEMS ─────────────────────────────────────────────────────
  const saleItems = src.prepare('SELECT * FROM sale_items').all();
  const insSaleItem = dst.prepare(`
    INSERT OR IGNORE INTO sale_items
      (id, sale_id, medicine_id, batch_id, qty, unit_price, gst_percent, gst_amount, total_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  saleItems.forEach(r => insSaleItem.run(
    r.id, r.sale_id, r.medicine_id, r.batch_id,
    r.qty, r.unit_price, r.gst_percent || 0, r.gst_amount || 0, r.total_amount || 0
  ));
  stats.sale_items = saleItems.length;

  // ─── 11. CASH REGISTER SESSIONS ─────────────────────────────────────────
  const sessions = src.prepare('SELECT * FROM cash_register_sessions').all();
  const insSession = dst.prepare(`
    INSERT OR IGNORE INTO cash_register_sessions
      (id, cashier_id, opened_at, closed_at, opening_balance,
       closing_balance_expected, closing_balance_actual, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  sessions.forEach(r => insSession.run(
    r.id, r.cashier_id, r.opened_at, r.closed_at || null,
    r.opening_balance || 0, r.closing_balance_expected || null,
    r.closing_balance_actual || null, r.notes || null,
    r.status || 'closed'
  ));
  stats.cash_register_sessions = sessions.length;

  // ─── 12. Reset auto-increment sequences ────────────────────────────────
  // Ensure new inserts get IDs higher than migrated ones
  Object.keys(stats).forEach(tbl => {
    try {
      const maxId = dst.prepare(`SELECT MAX(id) as m FROM "${tbl}"`).get();
      if (maxId && maxId.m) {
        dst.prepare(`INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES (?, ?)`).run(tbl, maxId.m);
      }
    } catch(_) {}
  });

  dst.exec('COMMIT;');
  dst.exec('PRAGMA foreign_keys = ON;');

  // ─── Summary ────────────────────────────────────────────────────────────
  console.log('✅  Migration complete!\n');
  console.log('   Records migrated:');
  Object.entries(stats).forEach(([table, count]) => {
    console.log(`     ${table.padEnd(28)} ${count} rows`);
  });
  console.log('\n   New database:', NEW_DB_PATH);
  console.log('   Pre-migration backup:', path.basename(backupPath));
  console.log('\n   ✔ The exe will now show all data from the previous software.');
  console.log('   Re-copy dist/pharmacy.db if the exe is already running.\n');

} catch (err) {
  dst.exec('ROLLBACK;');
  console.error('\n❌  Migration FAILED — rolled back all changes.');
  console.error('    Error:', err.message);
  process.exit(1);
} finally {
  src.close();
  dst.close();
}
