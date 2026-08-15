# Offline Pharmacy Point-of-Sale (POS) & Management System

A complete, production-grade, 100% offline Point-of-Sale (POS) and Pharmacy Store Management System built with **Node.js, Express, SQLite (WAL Mode)**, and dual **Single Page Application (SPA)** frontends.

---

## 🌟 Key Features

### 💻 POS Terminal (`/pos`)
- **Touch-Optimized UI**: Teal/dark teal/white high-contrast theme designed for 15" touchscreens up to 4K monitors.
- **Barcode Scanner Support**: Hardware keyboard wedge listener buffers barcode inputs instantly without losing focus.
- **Fast Medicine Lookup**: Type-ahead search by Brand Name, Generic Name, HSN code, or SKU/Barcode.
- **FEFO (First Expiry First Out)**: Automatic batch assignment picking the earliest-expiring batch first.
- **Manual Batch Selector**: Touch modal to override FEFO batch selection with real-time stock and expiry badges.
- **Multi-Payment Options**: Cash (with instant change calculator and quick cash buttons like $10, $20, $50, $100), Card ref entry, Mobile Wallet / QR reference.
- **Held & Recall Sales**: Place active carts on hold with customer notes and recall them anytime.
- **Daily Cash Register Drawer**: Open/Close register drawer session with opening float, expected vs actual cash calculation, and variance summary.

### ⚙️ Admin Dashboard (`/admin`)
- **Medicine Master**: Full CRUD for brand name, generic name, manufacturer, category, packing, MRP, selling/purchase price, GST %, HSN, Schedule (H/H1/X/OTC), and Rx requirements.
- **Bulk CSV Import**: One-click import tool for uploading medicine master data from CSV files.
- **Batch Inventory & FEFO**: Track inventory per batch (batch no., expiry date, qty received/remaining, purchase cost, supplier). Low stock alerts and 30/60/90 day expiry warnings. Auto-disable expired batches.
- **Stock Audit Log**: Manual stock adjustment interface with mandatory audit logging.
- **Sales History**: Complete invoice ledger with date filtering, invoice lookup, cashier tracking, and receipt reprinting.
- **Analytics & Reports**: Daily/Monthly sales revenue, gross profit margin breakdown, GST tax collected, top sellers, and slow movers / dead stock.
- **Customer Loyalty**: Customer profile management linked to sales for loyalty points accumulation (1 point per $10 spent).
- **Supplier Directory**: Vendor contacts and GSTIN records linked to stock batch entries.
- **User Security**: Role-based access control (Admin & Cashier), PIN authentication code, auto-lock terminal feature.
- **Store Settings & USB Backup**: Store branding, GSTIN/DL license config, receipt policy footers, instant DB backup download, and DB snapshot restoration.

### 🧾 Dual-Mode Receipt Generator
- **ESC/POS Thermal Printing**: Outputs raw binary ESC/POS command buffers for 80mm / 58mm thermal printers over USB/Serial.
- **HTML / PDF Print Fallback**: High-resolution printable receipt view with store logo, tax breakdown, and invoice barcodes.

---

## 🛠️ Technology Stack & Architecture

- **Backend**: Node.js + Express bound strictly to `127.0.0.1:4580` (100% offline security).
- **Database**: SQLite (`pharmacy.db`) with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and Foreign Key enforcement enabled.
- **Frontend**: Responsive Single Page Applications (SPAs) built with modern JavaScript, CSS grid/flexbox, and Google Fonts (`Outfit`).
- **Dependencies**: `express`, `sqlite3`, `cors`, `multer`.

---

## 🚀 Quick Start Guide (Windows / Linux)

### 1. Prerequisites
Ensure **Node.js (v18+)** and **npm** are installed on your machine.

### 2. Installation & Setup
Open terminal in the project directory (`c:\Users\MPL\Desktop\POS`):

```bash
# Install dependencies
npm install

# Seed SQLite database with pre-populated sample data
npm run seed
```

### 3. Run Application
```bash
npm start
```

Once started, open your web browser or point your POS hardware browser to:
- 🛒 **POS Cashier Terminal**: `http://localhost:4580/pos`
- ⚙️ **Admin Website Dashboard**: `http://localhost:4580/admin`

---

## 🔑 Default Login Credentials

- **Primary Admin**: PIN `1234` (Full access to Admin Website & POS)
- **Cashier User**: PIN `5678` (POS Terminal access)

---

## 🧪 Verification & Testing

To run the automated end-to-end API test suite:

```bash
npm test
```

---

## 📁 Directory Structure

```
POS/
├── package.json               # Project dependencies and script declarations
├── pharmacy.db                # SQLite database (generated on seed/run)
├── README.md                  # System documentation
├── test.js                    # End-to-end verification script
├── backups/                   # Local database backups folder
└── src/
    ├── server/                # Backend API & Database engine
    │   ├── server.js          # Express server bound to 127.0.0.1:4580
    │   ├── database/          # SQLite schema, db wrapper, seed script
    │   │   ├── db.js
    │   │   ├── schema.sql
    │   │   └── seed.js
    │   ├── routes/            # REST API endpoint modules
    │   │   ├── auth.js
    │   │   ├── medicines.js
    │   │   ├── stock.js
    │   │   ├── sales.js
    │   │   ├── register.js
    │   │   ├── reports.js
    │   │   ├── customers.js
    │   │   ├── suppliers.js
    │   │   ├── users.js
    │   │   └── settings.js
    │   └── utils/             # ESC/POS printer & backup utilities
    │       ├── escpos.js
    │       └── backup.js
    └── public/                # Dual SPA Frontends
        ├── pos/               # Touch POS Terminal UI
        │   ├── index.html
        │   ├── pos.css
        │   └── pos.js
        └── admin/             # Desktop Admin Dashboard UI
            ├── index.html
            ├── admin.css
            └── admin.js
```

---

## 🔒 Security & Offline Guarantee

- The embedded Express HTTP server binds strictly to loopback interface `127.0.0.1`.
- No external APIs, cloud services, telemetry, or network connections are utilized.
- All transactional data, audit logs, customer profiles, and backup files remain local on your hard drive.
