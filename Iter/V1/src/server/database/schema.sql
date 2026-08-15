-- Schema for Offline Pharmacy POS System

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
    pin TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT,
    address TEXT,
    loyalty_points INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_name TEXT NOT NULL,
    generic_name TEXT NOT NULL,
    manufacturer TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    packing TEXT,
    strength TEXT,
    mrp REAL NOT NULL DEFAULT 0.0,
    selling_price REAL NOT NULL DEFAULT 0.0,
    purchase_price REAL NOT NULL DEFAULT 0.0,
    gst_percent REAL NOT NULL DEFAULT 12.0,
    hsn_code TEXT,
    schedule TEXT DEFAULT 'OTC',
    prescription_req INTEGER DEFAULT 0,
    sku TEXT UNIQUE,
    min_stock_level INTEGER DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    batch_no TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    qty_received INTEGER NOT NULL,
    qty_remaining INTEGER NOT NULL,
    purchase_date DATE DEFAULT (DATE('now')),
    cost_price REAL DEFAULT 0.0,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    is_quarantined INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER REFERENCES stock_batches(id) ON DELETE SET NULL,
    medicine_id INTEGER REFERENCES medicines(id) ON DELETE SET NULL,
    change_qty INTEGER NOT NULL,
    reason TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT UNIQUE NOT NULL,
    sale_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    cashier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    subtotal REAL NOT NULL,
    discount_amount REAL DEFAULT 0.0,
    tax_amount REAL NOT NULL,
    grand_total REAL NOT NULL,
    payment_method TEXT NOT NULL,
    payment_details TEXT,
    cash_given REAL DEFAULT 0.0,
    change_due REAL DEFAULT 0.0,
    status TEXT DEFAULT 'completed'
);

CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
    batch_id INTEGER NOT NULL REFERENCES stock_batches(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    gst_percent REAL NOT NULL,
    gst_amount REAL NOT NULL,
    total_amount REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS cash_register_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cashier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    opening_balance REAL NOT NULL DEFAULT 0.0,
    closing_balance_expected REAL,
    closing_balance_actual REAL,
    notes TEXT,
    status TEXT DEFAULT 'open'
);

CREATE TABLE IF NOT EXISTS held_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cashier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    customer_name TEXT,
    cart_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_medicines_brand ON medicines(brand_name);
CREATE INDEX IF NOT EXISTS idx_medicines_generic ON medicines(generic_name);
CREATE INDEX IF NOT EXISTS idx_medicines_sku ON medicines(sku);
CREATE INDEX IF NOT EXISTS idx_batches_med_exp ON stock_batches(medicine_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_no);
