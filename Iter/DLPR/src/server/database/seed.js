const { initDb, run, get, all } = require('./db');

async function seed() {
  console.log('Initializing database schema...');
  await initDb();

  console.log('Seeding initial data...');

  // 1. Seed Store Settings
  const settings = [
    ['store_name', 'CureAll Pharmacy & Chemists'],
    ['store_tagline', 'Your Trusted Health & Wellness Partner'],
    ['store_address', '102 Healthcare Avenue, Medical District, Suite 4B'],
    ['store_phone', '+1 (555) 321-9876'],
    ['store_email', 'contact@cureallpharmacy.local'],
    ['store_gstin', '27AAACC1234H1Z5'],
    ['store_dl_no', 'DL-2024-998811'],
    ['tax_mode', 'inclusive'], // inclusive or exclusive
    ['receipt_footer', 'Thank you for visiting CureAll Pharmacy! Wish you good health. Keep out of reach of children.'],
    ['printer_type', 'pdf'], // 'escpos' or 'pdf'
    ['printer_paper_width', '80mm'] // '80mm' or '58mm'
  ];

  for (const [key, value] of settings) {
    await run(`INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?)`, [key, value]);
  }

  // 2. Seed Users
  await run(`DELETE FROM users`);
  await run(`INSERT INTO users (id, name, role, pin, active) VALUES 
    (1, 'Dr. Sarah Jenkins', 'admin', '1234', 1),
    (2, 'Alex Carter', 'cashier', '5678', 1)
  `);

  // 3. Seed Categories
  await run(`DELETE FROM categories`);
  const categories = [
    [1, 'Antibiotics & Anti-infectives', 'Prescription antibiotics and anti-bacterial agents'],
    [2, 'Analgesics & Anti-inflammatory', 'Painkillers, fever reducers, and anti-inflammatory medicines'],
    [3, 'Cardiovascular & Hypertension', 'Blood pressure regulators, cardiac care, and cholesterol control'],
    [4, 'Diabetes & Metabolic Care', 'Insulin, oral anti-diabetic agents, and testing supplies'],
    [5, 'Respiratory & Asthma', 'Inhalers, cough syrups, antihistamines, and bronchodilators'],
    [6, 'Vitamins & Dietary Supplements', 'Multivitamins, mineral supplements, and health boosters'],
    [7, 'OTC & Personal Care', 'Over-the-counter essentials, first aid, and hygiene products']
  ];

  for (const [id, name, desc] of categories) {
    await run(`INSERT INTO categories (id, name, description) VALUES (?, ?, ?)`, [id, name, desc]);
  }

  // 4. Seed Suppliers
  await run(`DELETE FROM suppliers`);
  const suppliers = [
    [1, 'Apex Lifesciences Corp', 'Robert Vance', '+1 (555) 111-2233', 'orders@apexlifesciences.com', '78 Pharma Park, Industrial Zone', '27APEXL9988A1Z0'],
    [2, 'MedDistributors Alliance', 'Elena Rostova', '+1 (555) 444-5566', 'sales@meddistributors.com', '12 Supply Chain Road, Logistics Hub', '27MEDDS7766B1Z2'],
    [3, 'Global BioHealth Ltd', 'David Sterling', '+1 (555) 777-8899', 'info@globalbiohealth.com', '45 Bio Tech Lane, Science City', '27GLOBH5544C1Z4'],
    [4, 'SunCare Formulations', 'Priya Sharma', '+1 (555) 999-0011', 'orders@suncareform.com', '90 Formulators Highway, Sector 5', '27SUNCF3322D1Z6'],
    [5, 'NovaPharm Logistics', 'Marcus Thorne', '+1 (555) 222-3344', 'supply@novapharm.com', '33 Central Depot, East Bay', '27NOVAP1100E1Z8']
  ];

  for (const s of suppliers) {
    await run(`INSERT INTO suppliers (id, name, contact_person, phone, email, address, gstin) VALUES (?, ?, ?, ?, ?, ?, ?)`, s);
  }

  // 5. Seed Customers
  await run(`DELETE FROM customers`);
  const customers = [
    [1, 'Walk-in Customer', '0000000000', '', 'Local', 0],
    [2, 'John Doe', '+15551234567', 'johndoe@email.com', '12 Maple Street', 120],
    [3, 'Alice Smith', '+15559876543', 'asmith@email.com', '45 Oak Ridge', 450],
    [4, 'Michael Johnson', '+15554567890', 'mjohnson@email.com', '89 Elm Court', 80],
    [5, 'Emily Brown', '+15557890123', 'ebrown@email.com', '23 Pine Avenue', 210]
  ];

  for (const c of customers) {
    await run(`INSERT INTO customers (id, name, phone, email, address, loyalty_points) VALUES (?, ?, ?, ?, ?, ?)`, c);
  }

  // 6. Seed Medicines (25 Items)
  await run(`DELETE FROM medicines`);
  const medicines = [
    // [id, brand, generic, mfr, cat_id, packing, mrp, selling_price, purchase_price, gst, hsn, schedule, rx, sku, min_stock]
    [1, 'Amoxil 500mg Capsule', 'Amoxicillin Trihydrate', 'Apex Lifesciences', 1, '10 Capsules Strip', 12.50, 10.00, 6.50, 12.0, '300410', 'H', 1, 'AMX500', 20],
    [2, 'Augmentin 625 Duo', 'Amoxicillin + Clavulanic Acid', 'GlaxoSmithKline', 1, '10 Tablets Strip', 24.00, 20.00, 14.00, 12.0, '300410', 'H', 1, 'AUG625', 15],
    [3, 'Azithral 500mg Tablet', 'Azithromycin', 'Alembic Pharma', 1, '5 Tablets Strip', 18.00, 15.00, 10.00, 12.0, '300410', 'H', 1, 'AZI500', 10],
    [4, 'Ciproquin 500mg', 'Ciprofloxacin', 'Cipla Ltd', 1, '10 Tablets Strip', 15.00, 12.50, 8.00, 12.0, '300410', 'H', 1, 'CIP500', 15],
    [5, 'Crocin 650mg Advance', 'Paracetamol / Acetaminophen', 'Haleon Healthcare', 2, '15 Tablets Strip', 4.50, 3.80, 2.20, 12.0, '300490', 'OTC', 0, 'CRO650', 50],
    [6, 'Dolo 650 Tablet', 'Paracetamol', 'Micro Labs', 2, '15 Tablets Strip', 4.00, 3.50, 2.00, 12.0, '300490', 'OTC', 0, 'DOL650', 50],
    [7, 'Brufen 400mg', 'Ibuprofen', 'Abbott Pharma', 2, '15 Tablets Strip', 3.50, 3.00, 1.60, 12.0, '300490', 'OTC', 0, 'BRU400', 30],
    [8, 'Voveran SR 100mg', 'Diclofenac Sodium', 'Novartis', 2, '10 Tablets Strip', 8.50, 7.20, 4.50, 12.0, '300490', 'H', 0, 'VOV100', 20],
    [9, 'Pantocid 40mg', 'Pantoprazole Sodium', 'Sun Pharma', 2, '15 Tablets Strip', 12.00, 10.00, 6.00, 12.0, '300490', 'OTC', 0, 'PAN40', 25],
    [10, 'Telma 40mg Tablet', 'Telmisartan', 'Glenmark Pharma', 3, '15 Tablets Strip', 11.00, 9.50, 5.80, 12.0, '300490', 'H', 1, 'TEL40', 20],
    [11, 'Amlokind 5mg', 'Amlodipine Besylate', 'Mankind Pharma', 3, '10 Tablets Strip', 3.50, 2.80, 1.50, 12.0, '300490', 'H', 1, 'AML5', 30],
    [12, 'Lipitor 10mg', 'Atorvastatin Calcium', 'Viatris', 3, '10 Tablets Strip', 16.00, 13.50, 8.50, 12.0, '300490', 'H', 1, 'LIP10', 15],
    [13, 'Glycomet GP 2', 'Metformin + Glimepiride', 'USV Private Ltd', 4, '15 Tablets Strip', 14.00, 11.80, 7.20, 12.0, '300490', 'H', 1, 'GLYGP2', 25],
    [14, 'Januvia 100mg', 'Sitagliptin Phosphate', 'MSD Pharma', 4, '7 Tablets Strip', 35.00, 30.00, 21.00, 12.0, '300490', 'H', 1, 'JAN100', 10],
    [15, 'Accu-Chek Active Strips', 'Blood Glucose Test Strips', 'Roche Diabetes Care', 4, '50 Strips Box', 28.00, 24.50, 17.00, 18.0, '902780', 'OTC', 0, 'ACCU50', 8],
    [16, 'Asthalin Inhaler 100mcg', 'Salbutamol / Albuterol', 'Cipla Ltd', 5, '200 MDI Doses', 16.50, 14.00, 9.00, 12.0, '300490', 'H', 1, 'AST100', 12],
    [17, 'Ascoril LS Syrup', 'Levosalbutamol + Ambroxol', 'Glenmark Pharma', 5, '100ml Bottle', 9.00, 7.80, 4.60, 12.0, '300490', 'OTC', 0, 'ASC100', 15],
    [18, 'Allegra 120mg Tablet', 'Fexofenadine Hydrochloride', 'Sanofi India', 5, '10 Tablets Strip', 13.00, 11.00, 6.80, 12.0, '300490', 'OTC', 0, 'ALL120', 20],
    [19, 'Becosules Z Capsule', 'B-Complex + Vitamin C + Zinc', 'Pfizer Limited', 6, '20 Capsules Strip', 5.50, 4.80, 2.90, 12.0, '300450', 'OTC', 0, 'BEC20', 40],
    [20, 'Shelcal 500mg Tablet', 'Calcium Carbonate + Vit D3', 'Torrent Pharma', 6, '15 Tablets Strip', 8.00, 6.80, 4.00, 12.0, '300450', 'OTC', 0, 'SHE500', 30],
    [21, 'Evion 400mg Capsule', 'Vitamin E / Tocopheryl', 'Procter & Gamble', 6, '10 Capsules Strip', 4.20, 3.60, 2.10, 12.0, '300450', 'OTC', 0, 'EVI400', 35],
    [22, 'Dettol Antiseptic Liquid', 'Chloroxylenol', 'Reckitt Benckiser', 7, '250ml Bottle', 6.00, 5.20, 3.40, 18.0, '380894', 'OTC', 0, 'DET250', 20],
    [23, 'Band-Aid Tough Strips', 'Adhesive First Aid Bandages', 'Johnson & Johnson', 7, '20 Strips Box', 3.00, 2.50, 1.40, 18.0, '300510', 'OTC', 0, 'BAN20', 30],
    [24, 'Vicks Vaporub 50g', 'Menthol + Camphor Balm', 'Procter & Gamble', 7, '50g Jar', 4.50, 3.90, 2.30, 12.0, '300490', 'OTC', 0, 'VIC50', 25],
    [25, 'Otrivin Adult Nasal Spray', 'Xylometazoline HCl', 'Haleon Healthcare', 5, '10ml Spray Bottle', 7.50, 6.20, 3.80, 12.0, '300490', 'OTC', 0, 'OTR10', 15]
  ];

  for (const m of medicines) {
    await run(`INSERT INTO medicines (id, brand_name, generic_name, manufacturer, category_id, packing, mrp, selling_price, purchase_price, gst_percent, hsn_code, schedule, prescription_req, sku, min_stock_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, m);
  }

  // 7. Seed Stock Batches (Batch-wise inventory, incorporating FEFO, near-expiry, and expired items)
  await run(`DELETE FROM stock_batches`);
  const today = new Date();
  
  function addDays(days) {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  const batches = [
    // medicine_id, batch_no, expiry_date, qty_received, qty_remaining, purchase_date, cost_price, supplier_id, is_quarantined
    // Amoxil 500
    [1, 'AMX-2024-01', addDays(45), 100, 80, addDays(-60), 6.50, 1, 0], // Near Expiry (45 days) -> FEFO pick #1
    [1, 'AMX-2024-02', addDays(300), 150, 150, addDays(-10), 6.50, 1, 0], // Fresh batch
    
    // Augmentin 625
    [2, 'AUG-8921', addDays(15), 50, 30, addDays(-90), 14.00, 2, 0], // Urgent Expiry (15 days) -> FEFO pick #1
    [2, 'AUG-9104', addDays(180), 80, 80, addDays(-20), 14.00, 2, 0],
    
    // Azithral 500
    [3, 'AZI-771', addDays(-10), 20, 20, addDays(-200), 10.00, 1, 1], // EXPIRED (Quarantined)
    [3, 'AZI-802', addDays(120), 60, 55, addDays(-30), 10.00, 1, 0],

    // Ciproquin 500
    [4, 'CIP-3301', addDays(90), 100, 90, addDays(-40), 8.00, 3, 0],
    
    // Crocin 650
    [5, 'CRO-A11', addDays(25), 200, 110, addDays(-120), 2.20, 4, 0], // 25 days FEFO
    [5, 'CRO-A12', addDays(400), 300, 300, addDays(-15), 2.20, 4, 0],

    // Dolo 650
    [6, 'DOL-901', addDays(60), 250, 200, addDays(-50), 2.00, 4, 0],
    [6, 'DOL-902', addDays(500), 300, 300, addDays(-5), 2.00, 4, 0],

    // Brufen 400
    [7, 'BRU-102', addDays(210), 100, 85, addDays(-45), 1.60, 2, 0],

    // Voveran SR 100
    [8, 'VOV-554', addDays(85), 60, 40, addDays(-70), 4.50, 3, 0],

    // Pantocid 40
    [9, 'PAN-001', addDays(140), 120, 100, addDays(-30), 6.00, 3, 0],

    // Telma 40
    [10, 'TEL-881', addDays(320), 90, 75, addDays(-25), 5.80, 1, 0],

    // Amlokind 5
    [11, 'AML-220', addDays(180), 150, 130, addDays(-40), 1.50, 1, 0],

    // Lipitor 10
    [12, 'LIP-441', addDays(240), 80, 70, addDays(-60), 8.50, 3, 0],

    // Glycomet GP 2
    [13, 'GLY-773', addDays(190), 100, 80, addDays(-50), 7.20, 2, 0],

    // Januvia 100
    [14, 'JAN-109', addDays(110), 40, 35, addDays(-35), 21.00, 3, 0],

    // Accu-Chek Strips
    [15, 'ACC-501', addDays(360), 30, 22, addDays(-15), 17.00, 5, 0],

    // Asthalin Inhaler
    [16, 'AST-302', addDays(270), 40, 32, addDays(-40), 9.00, 2, 0],

    // Ascoril LS
    [17, 'ASC-884', addDays(160), 50, 42, addDays(-30), 4.60, 4, 0],

    // Allegra 120
    [18, 'ALL-601', addDays(220), 80, 68, addDays(-45), 6.80, 4, 0],

    // Becosules Z
    [19, 'BEC-991', addDays(310), 150, 120, addDays(-20), 2.90, 4, 0],

    // Shelcal 500
    [20, 'SHE-442', addDays(280), 100, 88, addDays(-30), 4.00, 4, 0],

    // Evion 400
    [21, 'EVI-331', addDays(350), 120, 105, addDays(-15), 2.10, 4, 0],

    // Dettol 250ml
    [22, 'DET-108', addDays(500), 50, 45, addDays(-10), 3.40, 5, 0],

    // Band-Aid Box
    [23, 'BAN-009', addDays(700), 80, 72, addDays(-5), 1.40, 5, 0],

    // Vicks Vaporub
    [24, 'VIC-701', addDays(450), 60, 50, addDays(-20), 2.30, 5, 0],

    // Otrivin Spray
    [25, 'OTR-404', addDays(230), 40, 33, addDays(-25), 3.80, 2, 0]
  ];

  for (const b of batches) {
    await run(`INSERT INTO stock_batches (medicine_id, batch_no, expiry_date, qty_received, qty_remaining, purchase_date, cost_price, supplier_id, is_quarantined) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, b);
  }

  // 8. Seed Historical Sales
  await run(`DELETE FROM sales`);
  await run(`DELETE FROM sale_items`);

  const sale1Time = new Date(Date.now() - 86400000 * 2).toISOString(); // 2 days ago
  const sale2Time = new Date(Date.now() - 3600000 * 4).toISOString(); // 4 hours ago

  // Sale 1
  const s1 = await run(`INSERT INTO sales 
    (invoice_no, sale_timestamp, cashier_id, customer_id, subtotal, discount_amount, tax_amount, grand_total, payment_method, payment_details, cash_given, change_due, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['INV-20260804-001', sale1Time, 2, 2, 33.80, 0.00, 4.06, 37.86, 'cash', '{"mode":"cash"}', 50.00, 12.14, 'completed']
  );

  await run(`INSERT INTO sale_items (sale_id, medicine_id, batch_id, qty, unit_price, gst_percent, gst_amount, total_amount) VALUES 
    (?, 5, 5, 2, 3.80, 12.0, 0.91, 7.60),
    (?, 2, 3, 1, 20.00, 12.0, 2.40, 20.00),
    (?, 20, 21, 1, 6.80, 12.0, 0.82, 6.80)
  `, [s1.lastID, s1.lastID, s1.lastID]);

  // Sale 2
  const s2 = await run(`INSERT INTO sales 
    (invoice_no, sale_timestamp, cashier_id, customer_id, subtotal, discount_amount, tax_amount, grand_total, payment_method, payment_details, cash_given, change_due, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['INV-20260806-002', sale2Time, 2, 3, 34.50, 2.00, 3.90, 36.40, 'card', '{"card_type":"Visa","last4":"4321","auth_code":"889212"}', 36.40, 0.00, 'completed']
  );

  await run(`INSERT INTO sale_items (sale_id, medicine_id, batch_id, qty, unit_price, gst_percent, gst_amount, total_amount) VALUES 
    (?, 1, 1, 2, 10.00, 12.0, 2.40, 20.00),
    (?, 16, 17, 1, 14.00, 12.0, 1.68, 14.00)
  `, [s2.lastID, s2.lastID]);

  console.log('Seed completed successfully!');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
