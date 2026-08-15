/**
 * Database wrapper using Node.js built-in node:sqlite module.
 *
 * Replaces the old sqlite3 npm package (a native C++ addon) with the
 * built-in node:sqlite (available since Node.js v22.5+). This allows
 * the app to be packaged as a single standalone executable with no
 * external native .node files required alongside it.
 *
 * API surface is identical to the previous wrapper so no routes need changing.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// When running as a pkg-bundled executable, resolve paths relative to
// the exe's location (process.execPath dir), not the virtual snapshot dir.
const isPackaged = typeof process.pkg !== 'undefined';
const appRoot = isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..', '..', '..');

const DB_PATH = path.join(appRoot, 'pharmacy.db');

let db = null;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA busy_timeout = 5000;');
    console.log('Connected to SQLite database at:', DB_PATH);
  }
  return db;
}

// ─── Promise wrappers (matching the old sqlite3 API surface) ───────────────

/**
 * Execute a write statement (INSERT/UPDATE/DELETE) and return
 * { lastInsertRowid as lastID, changes }.
 */
function run(sql, params = []) {
  try {
    const database = getDb();
    const stmt = database.prepare(sql);
    const info = stmt.run(...params);
    return Promise.resolve({ lastID: Number(info.lastInsertRowid), changes: info.changes });
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Execute a SELECT and return the first row (or undefined).
 */
function get(sql, params = []) {
  try {
    const database = getDb();
    const stmt = database.prepare(sql);
    const row = stmt.get(...params);
    return Promise.resolve(row);
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Execute a SELECT and return all rows.
 */
function all(sql, params = []) {
  try {
    const database = getDb();
    const stmt = database.prepare(sql);
    const rows = stmt.all(...params);
    return Promise.resolve(rows);
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Execute raw SQL (multiple statements, no params).
 * Used for schema initialization.
 */
function exec(sql) {
  try {
    const database = getDb();
    database.exec(sql);
    return Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Initialize the database: run PRAGMAs then apply the schema.
 */
async function initDb() {
  // getDb() already runs PRAGMAs on first connection
  const database = getDb();

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  database.exec(schemaSql);

  console.log('Database schema initialized (WAL + FK enforced).');
}

module.exports = {
  getDb,
  run,
  get,
  all,
  exec,
  initDb,
  DB_PATH
};
