/**
 * build.js — POS Executable Builder
 *
 * Runs @yao-pkg/pkg to produce a standalone Windows executable:
 *   dist/
 *     "Pharmacy POS.exe"   ← double-click to launch
 *     pharmacy.db          ← database (auto-created on first run)
 *     backups/             ← auto-created by the server
 *     uploads/             ← logo uploads folder
 *
 * Usage: node build.js
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

console.log('\n🔨  Building Pharmacy POS Executable...\n');

// ─── 1. Install pkg devDependency if missing ──────────────────────────────
try {
  require.resolve('@yao-pkg/pkg');
} catch {
  console.log('  Installing @yao-pkg/pkg...');
  execSync('npm install --save-dev @yao-pkg/pkg', { stdio: 'inherit', cwd: ROOT });
}

// ─── 2. Create dist directory ─────────────────────────────────────────────
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

// ─── 3. Run pkg ───────────────────────────────────────────────────────────
console.log('  Packaging with @yao-pkg/pkg (this may take a minute)...\n');

const outputExe = path.join(DIST, 'Pharmacy POS.exe');

const result = spawnSync(
  'npx',
  [
    '@yao-pkg/pkg',
    'launcher.js',
    '--target', 'node22-win-x64',
    '--output', outputExe,
    '--compress', 'GZip',
    '--public',
    '--options', 'experimental-sqlite'
  ],
  { stdio: 'inherit', cwd: ROOT, shell: false }
);

if (result.status !== 0) {
  console.error('\n❌  Build failed. See errors above.');
  process.exit(1);
}

// ─── 4. Copy schema.sql into dist (needed at runtime for schema init) ─────
const schemaDir = path.join(DIST, 'src', 'server', 'database');
fs.mkdirSync(schemaDir, { recursive: true });
fs.copyFileSync(
  path.join(ROOT, 'src', 'server', 'database', 'schema.sql'),
  path.join(schemaDir, 'schema.sql')
);

// ─── 5. Copy public assets into dist ──────────────────────────────────────
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('\n  Copying static assets...');
copyDir(path.join(ROOT, 'src', 'public'), path.join(DIST, 'src', 'public'));

// ─── 6. Create required empty directories in dist ─────────────────────────
fs.mkdirSync(path.join(DIST, 'backups'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'uploads'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'src', 'public', 'uploads'), { recursive: true });

// ─── 7. Write a README for the dist folder ────────────────────────────────
fs.writeFileSync(path.join(DIST, 'README.txt'), `
PHARMACY POS SYSTEM
===================

HOW TO USE:
  Double-click "Pharmacy POS.exe" to launch the system.
  Your default browser will open automatically at the POS terminal.

FILES:
  Pharmacy POS.exe  - The application (double-click to start)
  pharmacy.db       - Your data (created automatically on first run)
  backups/          - Automatic daily database backups
  uploads/          - Store logo and uploaded files

ACCESSING THE SYSTEM:
  POS Terminal : http://127.0.0.1:4580/pos
  Admin Panel  : http://127.0.0.1:4580/admin

TO STOP:
  Close the black console window, or press Ctrl+C inside it.

IMPORTANT:
  Keep all files in this folder together. Do NOT move only the .exe.
  Your pharmacy.db file contains all your sales data - back it up regularly!
`.trim());

// ─── Done ─────────────────────────────────────────────────────────────────
console.log('\n\x1b[32m✔ Build complete!\x1b[0m');
console.log(`\n  Output folder: \x1b[33m${DIST}\x1b[0m`);
console.log('  Files created:');
fs.readdirSync(DIST).forEach(f => console.log(`    • ${f}`));
console.log('\n  \x1b[36mDouble-click "Pharmacy POS.exe" to launch!\x1b[0m\n');
