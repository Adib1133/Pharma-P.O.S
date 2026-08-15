#  Pharmacy POS System — User Guide

> Offline Point-of-Sale & Store Management System  
> Version 2.0 | Standalone Windows Executable

---

## 🚀 Getting Started

### Launch the Application

**Double-click `Pharmacy POS.exe`**

A console window will open showing the server status, and your default browser will automatically open the POS terminal. No installation needed — no Node.js, no internet connection required.

```
╔═══════════════════════════════════════════════════╗
║       💊  PHARMACY POS SYSTEM  💊                 ║
║      Offline Point-of-Sale & Management           ║
╠═══════════════════════════════════════════════════╣
║  POS Terminal : http://127.0.0.1:4580/pos    ║
║  Admin Panel  : http://127.0.0.1:4580/admin  ║
╠═══════════════════════════════════════════════════╣
║  Status: Starting...                             ║
╚═══════════════════════════════════════════════════╝
```

If the browser doesn't open automatically, navigate to:
-  **POS Terminal** → `http://127.0.0.1:4580/pos`
-  **Admin Panel** → `http://127.0.0.1:4580/admin`

### Stop the Application

Close the black console window, or press **Ctrl+C** inside it.

---

##  Login Credentials

| User | Role | PIN |
|------|------|-----|
| Dr. Sarah Jenkins | Admin | `1234` |
| Alex Carter | Cashier | `5678` |

> **Admin** has full access to both the POS terminal and the Admin Panel.  
> **Cashier** has access to the POS terminal only.

To manage users, go to **Admin Panel → Users**.

---

##  File Structure

```
dist/
├── Pharmacy POS.exe       ← Launch this to start the system
├── pharmacy.db            ← Your database (all sales, medicines, customers)
├── backups/               ← Automatic daily database backups
├── uploads/               ← Temporary upload folder (logo processing)
└── src/public/            ← Frontend assets (HTML, CSS, JS)
    ├── pos/               ← POS terminal interface
    ├── admin/             ← Admin dashboard interface
    └── shared/            ← PDF/receipt shared libraries
```

> ⚠️ **Important:** Always keep all files and folders together in the same location.
> Never move only the `.exe` file — it needs the `src/` folder to serve the frontend.

---

## 🔄 Data Migration (From Previous Version)

If you are upgrading from the previous manual version of the POS software and want to carry over all medicines, stock batches, sales history, customers, and settings:

### Step 1 — Prerequisites
Ensure [Node.js (v22 or later)](https://nodejs.org) is installed on your machine.

### Step 2 — Run the Migration Script
Open a terminal in the **source code folder** (not the `dist/` folder) and run:

```bash
npm run migrate
```

This will:
- Read all data from the **old** `pharmacy.db` (at `C:\Users\...\Desktop\POS\pharmacy.db`)
- Insert it into the **new** `dist\pharmacy.db` using `INSERT OR IGNORE` (no duplicates)
- Auto-create a pre-migration backup of the new database before making any changes
- Print a summary of all migrated records

**Sample output:**
```
  Pharmacy POS — Data Migration
   Old DB: C:\Users\...\POS\pharmacy.db
   New DB: ...\dist\pharmacy.db

✔  Backed up new DB → pharmacy_pre_migration_....db

  Migration complete!

   Records migrated:
     categories                   7 rows
     suppliers                    5 rows
     users                        2 rows
     customers                    5 rows
     store_settings               12 rows
     medicines                    25 rows
     stock_batches                30 rows
     stock_audit_log              19 rows
     sales                        10 rows
     sale_items                   24 rows
     cash_register_sessions       2 rows
```

> **Safe to re-run:** The migration uses `INSERT OR IGNORE`, so running it multiple times will not create duplicate records.

### Step 3 — Restart the Exe
After migration, close and relaunch `Pharmacy POS.exe` to see all migrated data.

### Migrating to a Different Machine
To move data to a different PC, simply copy the entire `dist/` folder.
The `pharmacy.db` file contains **all** your data.

---

##  Database Backups

Backups are created **automatically every day** at midnight and stored in the `backups/` folder with timestamped filenames:

```
backups/
├── pharmacy_backup_2026-08-13T05-51-14Z.db
├── pharmacy_backup_2026-08-14T05-49-54Z.db
└── pharmacy_backup_2026-08-15T04-01-58Z.db
```

### Manual Backup
You can also create a manual backup at any time from:
**Admin Panel → Settings → Database Management → Create Backup**

### Restore a Backup
To restore from a backup:
1. Stop the application (close the console window)
2. Replace `pharmacy.db` with the backup file you want to restore
3. Rename the restored file to `pharmacy.db`
4. Relaunch `Pharmacy POS.exe`

---

##  Thermal Receipt Printing

The system supports 80mm ESC/POS USB thermal printers. Configure from:
**Admin Panel → Settings → Receipt & Printer Settings**

If no thermal printer is connected, receipts can be printed as **PDF** using the browser's built-in print dialog.

---

##  Accessing from Another Device on the Same Network

This system binds to `127.0.0.1` (loopback only) for security. To allow other devices (e.g. a display monitor or tablet) to connect, this would require a network binding change — contact your system administrator.

---

##  Troubleshooting

| Problem | Solution |
|---------|----------|
| Browser doesn't open automatically | Navigate manually to `http://127.0.0.1:4580/pos` |
| "Port already in use" message | The system is already running — the browser will open automatically |
| Console closes instantly | Re-launch as Administrator (right-click → Run as administrator) |
| Data not showing | Ensure `pharmacy.db` is in the same folder as the `.exe` |
| Backup files growing large | Delete old backups from the `backups/` folder manually |

---

##  Security & Privacy

- **100% Offline** — No internet connection is ever used
- **No cloud, no telemetry, no external APIs** — all data stays on your machine
- **No API tokens or external credentials** are stored anywhere in this software
- All data (medicines, sales, customers, audit logs) is stored locally in `pharmacy.db`

---

##  System Info

| | |
|--|--|
| **Platform** | Windows x64 |
| **Runtime** | Node.js v22 (bundled inside exe) |
| **Database** | SQLite 3 with WAL mode |
| **Server port** | 4580 (localhost only) |
| **Exe size** | ~64 MB (self-contained) |
