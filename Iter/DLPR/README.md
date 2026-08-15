# Pharmacy POS — Developer Reference (V2)

Offline Pharmacy Point-of-Sale & Management System  
**Node.js + Express + SQLite (built-in `node:sqlite`) | Windows Standalone Executable**

---

## Features

### POS Terminal (`/pos`)
- Barcode scanner wedge support (hardware keyboard input buffering)
- Fast medicine lookup — Brand Name, Generic Name, HSN, SKU
- FEFO (First Expiry First Out) automatic batch assignment
- Manual batch override modal with stock/expiry badges
- Multi-payment: Cash (change calculator), Card, Mobile/QR
- Hold & Recall sales with customer notes
- Cash register open/close sessions with float tracking

### Admin Panel (`/admin`)
- Medicine master CRUD + Bulk CSV import
- Batch inventory with low-stock alerts and 30/60/90-day expiry warnings
- Stock adjustment with mandatory audit logging
- Sales history, receipt reprint, cashier tracking
- Reports: daily/monthly revenue, profit margin, GST, best sellers, slow movers
- Customer loyalty point system
- Supplier directory linked to stock batches
- Role-based PIN authentication (Admin / Cashier)
- Store settings, receipt branding, USB thermal receipt config

### Receipt Engine
- Raw ESC/POS binary output for 80mm/58mm thermal printers
- HTML/PDF fallback via browser print dialog

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js v22+ · Express 4 |
| Database | `node:sqlite` (built-in, no native addon) · WAL mode · FK enforcement |
| Frontend | Vanilla JS SPA · CSS3 Grid/Flex · Google Fonts |
| Packaging | `@yao-pkg/pkg` → single `.exe` |
| File upload | `multer` |

---

## Quick Start (Development)

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm start
# → http://127.0.0.1:4580/pos
# → http://127.0.0.1:4580/admin
```

> Node.js v22.5+ is required (for built-in `node:sqlite`).

---

## NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm start` | `node --experimental-sqlite src/server/server.js` | Start dev server |
| `npm run launch` | `node --experimental-sqlite launcher.js` | Start via launcher (same as exe behaviour) |
| `npm run build` | `node build.js` | Build `dist/Pharmacy POS.exe` |
| `npm run migrate` | `node --experimental-sqlite migrate.js` | Migrate data from old POS database |
| `npm run seed` | `node --experimental-sqlite src/server/database/seed.js` | Re-seed sample data |
| `npm test` | `node --experimental-sqlite test.js` | Run API test suite |

---

## Building the Executable

```bash
npm run build
```

Produces `dist/Pharmacy POS.exe` — a self-contained Windows x64 binary (~64 MB) bundling:
- Node.js v22 runtime
- All server JS (Express routes, DB layer, utilities)
- Frontend assets (HTML, CSS, JS)
- SQLite schema

**No** Node.js installation needed on the target machine.

> Rebuild is needed after any source code change. The `pharmacy.db` in `dist/` persists between builds.

---

## Data Migration

To import all data from the previous (V1) software:

```bash
npm run migrate
```

The script reads from `C:\Users\...\Desktop\POS\pharmacy.db` and inserts into `dist\pharmacy.db`.  
Uses `INSERT OR IGNORE` — safe to re-run, no duplicates. Creates a timestamped backup first.

To migrate from a **different path**, edit the `OLD_DB_PATH` constant at the top of `migrate.js`.

---

## Directory Structure

```
V2 Iteration/POS software/
├── launcher.js            ← Entry point for packaged exe
├── build.js               ← Builds dist/Pharmacy POS.exe via pkg
├── migrate.js             ← Migrates data from old POS database
├── package.json
├── pharmacy.db            ← Dev database (separate from dist/)
├── backups/               ← Dev server auto-backups
└── src/
    ├── server/
    │   ├── server.js      ← Express app (binds to 127.0.0.1:4580)
    │   ├── database/
    │   │   ├── db.js      ← node:sqlite wrapper (async Promise API)
    │   │   ├── schema.sql ← Full DB schema (CREATE TABLE IF NOT EXISTS)
    │   │   └── seed.js    ← Sample data seeder
    │   ├── routes/        ← REST API modules
    │   │   ├── auth.js    ← PIN authentication
    │   │   ├── medicines.js
    │   │   ├── stock.js
    │   │   ├── sales.js
    │   │   ├── register.js
    │   │   ├── reports.js
    │   │   ├── customers.js
    │   │   ├── suppliers.js
    │   │   ├── users.js
    │   │   └── settings.js
    │   └── utils/
    │       ├── escpos.js  ← ESC/POS thermal receipt generator
    │       └── backup.js  ← Auto-backup scheduler (WAL-safe)
    └── public/
        ├── pos/           ← POS terminal SPA
        ├── admin/         ← Admin dashboard SPA
        └── shared/        ← jsPDF, html2canvas, receipt-engine
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | PIN login |
| GET/POST | `/api/medicines` | Medicine list / Add medicine |
| GET | `/api/stock/batches` | All stock batches |
| GET | `/api/stock/fefo/:medicineId` | FEFO batch for sale |
| GET | `/api/stock/low-stock` | Low stock alerts |
| GET | `/api/stock/expiry-alerts` | Expiring batch alerts |
| POST | `/api/stock/adjust` | Manual stock adjustment |
| POST | `/api/sales/checkout` | Process a sale (transactional) |
| GET | `/api/sales/held/list` | Held sales |
| GET | `/api/reports/dashboard-kpis` | Dashboard summary |
| GET | `/api/reports/sales-report` | Sales report (date range) |
| GET | `/api/reports/profit-margin` | Profit margin report |
| GET | `/api/settings` | Store settings |
| POST | `/api/settings/logo` | Upload store logo |
| POST/GET | `/api/register/open` `/api/register/close` | Cash drawer sessions |

---

## Default Login PINs

| User | Role | PIN |
|------|------|-----|
| Dr. Sarah Jenkins | Admin | `1234` |
| Alex Carter | Cashier | `1234` |

---

## Security Notes

- Server binds strictly to `127.0.0.1` — no LAN or internet exposure
- CORS restricted to `http://127.0.0.1:4580` and `http://localhost:4580` only
- No API tokens, no cloud services, no telemetry of any kind
- All data stays in `pharmacy.db` on the local machine
- Foreign keys enforced; checkout is wrapped in a DB transaction (atomic)

---

## Key Technical Decisions

| Decision | Reason |
|----------|--------|
| `node:sqlite` instead of `sqlite3` npm package | Built-in module (Node v22.5+) → no native `.node` addon → enables true single-file exe bundling |
| `@yao-pkg/pkg` with `--options experimental-sqlite` | Embeds the runtime flag into the binary so `node:sqlite` works without Node.js installed |
| Pkg-aware path resolution (`process.pkg`) | All writable paths (DB, uploads, backups) resolve relative to the exe location, not the read-only virtual snapshot |
| WAL mode + `busy_timeout = 5000` | Prevents database locking under concurrent reads during backup |
| `BEGIN/COMMIT/ROLLBACK` on checkout | Guarantees atomicity — a failed stock deduction rolls back the entire sale |
