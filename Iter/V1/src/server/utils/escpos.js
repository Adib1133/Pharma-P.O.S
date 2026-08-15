/**
 * ESC/POS Thermal Printer Buffer Generator
 * Formats a sale record into standard 80mm / 58mm raw ESC/POS byte commands.
 */

function padRight(str, len) {
  str = String(str || '');
  return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
}

function padLeft(str, len) {
  str = String(str || '');
  return str.length >= len ? str.substring(0, len) : ' '.repeat(len - str.length) + str;
}

function generateEscPosBuffer(sale, storeSettings) {
  const ESC = '\x1B';
  const GS = '\x1D';
  let commands = '';

  // Initialize printer
  commands += ESC + '@'; // Reset
  commands += ESC + 'a' + '\x01'; // Center alignment
  commands += ESC + 'E' + '\x01'; // Bold ON

  // Store Header
  const storeName = storeSettings.store_name || 'CureAll Pharmacy';
  commands += `${storeName.toUpperCase()}\n`;
  commands += ESC + 'E' + '\x00'; // Bold OFF

  if (storeSettings.store_tagline) commands += `${storeSettings.store_tagline}\n`;
  if (storeSettings.store_address) commands += `${storeSettings.store_address}\n`;
  if (storeSettings.store_phone) commands += `Ph: ${storeSettings.store_phone}\n`;
  if (storeSettings.store_gstin) commands += `GSTIN: ${storeSettings.store_gstin}\n`;
  if (storeSettings.store_dl_no) commands += `Lic: ${storeSettings.store_dl_no}\n`;

  commands += '------------------------------------------------\n';
  commands += ESC + 'a' + '\x00'; // Left align

  // Invoice & Customer Metadata
  commands += `Invoice No : ${sale.invoice_no}\n`;
  commands += `Date & Time: ${new Date(sale.sale_timestamp).toLocaleString()}\n`;
  commands += `Cashier    : ${sale.cashier_name || 'Cashier'}\n`;
  if (sale.customer_name && sale.customer_name !== 'Walk-in Customer') {
    commands += `Customer   : ${sale.customer_name} (${sale.customer_phone || ''})\n`;
  }
  commands += '------------------------------------------------\n';

  // Table Header (80mm ~ 48 chars wide)
  // Item Name (18) | Batch (8) | Qty (4) | Rate (7) | Total (7)
  commands += padRight('Item Name', 18) + ' ' +
              padRight('Batch', 8) + ' ' +
              padLeft('Qty', 4) + ' ' +
              padLeft('Rate', 7) + ' ' +
              padLeft('Total', 7) + '\n';
  commands += '------------------------------------------------\n';

  // Line items
  if (sale.items && Array.isArray(sale.items)) {
    for (const item of sale.items) {
      const name = padRight(item.brand_name || item.medicine_name || 'Medicine', 18);
      const batch = padRight(item.batch_no || 'N/A', 8);
      const qty = padLeft(item.qty, 4);
      const price = padLeft(Number(item.unit_price).toFixed(2), 7);
      const total = padLeft(Number(item.total_amount).toFixed(2), 7);

      commands += `${name} ${batch} ${qty} ${price} ${total}\n`;
      if (item.expiry_date) {
        commands += `  Exp: ${item.expiry_date} | GST: ${item.gst_percent}%\n`;
      }
    }
  }

  commands += '------------------------------------------------\n';

  // Totals Section (Right Aligned)
  commands += ESC + 'a' + '\x02'; // Right align
  commands += `Subtotal: $${Number(sale.subtotal).toFixed(2)}\n`;
  if (Number(sale.discount_amount) > 0) {
    commands += `Discount: -$${Number(sale.discount_amount).toFixed(2)}\n`;
  }
  commands += `GST Tax: $${Number(sale.tax_amount).toFixed(2)}\n`;
  
  commands += ESC + 'E' + '\x01'; // Bold
  commands += `GRAND TOTAL: $${Number(sale.grand_total).toFixed(2)}\n`;
  commands += ESC + 'E' + '\x00'; // Bold off

  commands += `Payment Method: ${String(sale.payment_method).toUpperCase()}\n`;
  if (sale.payment_method === 'cash') {
    commands += `Cash Given: $${Number(sale.cash_given || 0).toFixed(2)}\n`;
    commands += `Change Due: $${Number(sale.change_due || 0).toFixed(2)}\n`;
  }

  // Footer
  commands += '\n' + ESC + 'a' + '\x01'; // Center align
  const footer = storeSettings.receipt_footer || 'Thank you for your visit!';
  commands += `${footer}\n`;
  commands += `* ${sale.invoice_no} *\n\n\n`;

  // Cut Paper Command
  commands += GS + 'V' + '\x42' + '\x00';

  return Buffer.from(commands, 'latin1');
}

function generatePlainTextReceipt(sale, storeSettings) {
  const storeName = storeSettings.store_name || 'CureAll Pharmacy';
  let txt = `================================================\n`;
  txt += `            ${storeName.toUpperCase()}\n`;
  if (storeSettings.store_tagline) txt += `        ${storeSettings.store_tagline}\n`;
  if (storeSettings.store_address) txt += `  ${storeSettings.store_address}\n`;
  if (storeSettings.store_phone) txt += `          Ph: ${storeSettings.store_phone}\n`;
  if (storeSettings.store_gstin) txt += `       GSTIN: ${storeSettings.store_gstin}\n`;
  if (storeSettings.store_dl_no) txt += `        Lic: ${storeSettings.store_dl_no}\n`;
  txt += `================================================\n`;
  txt += `Invoice No : ${sale.invoice_no}\n`;
  txt += `Date & Time: ${new Date(sale.sale_timestamp).toLocaleString()}\n`;
  txt += `Cashier    : ${sale.cashier_name || 'Cashier'}\n`;
  if (sale.customer_name && sale.customer_name !== 'Walk-in Customer') {
    txt += `Customer   : ${sale.customer_name} (${sale.customer_phone || ''})\n`;
  }
  txt += `------------------------------------------------\n`;
  txt += padRight('Item Name', 18) + ' ' +
         padRight('Batch', 8) + ' ' +
         padLeft('Qty', 4) + ' ' +
         padLeft('Rate', 7) + ' ' +
         padLeft('Total', 7) + '\n';
  txt += `------------------------------------------------\n`;

  if (sale.items && Array.isArray(sale.items)) {
    for (const item of sale.items) {
      const name = padRight(item.brand_name || item.medicine_name || 'Medicine', 18);
      const batch = padRight(item.batch_no || 'N/A', 8);
      const qty = padLeft(item.qty, 4);
      const price = padLeft(Number(item.unit_price).toFixed(2), 7);
      const total = padLeft(Number(item.total_amount).toFixed(2), 7);

      txt += `${name} ${batch} ${qty} ${price} ${total}\n`;
      if (item.expiry_date) {
        txt += `  Exp: ${item.expiry_date} | GST: ${item.gst_percent}%\n`;
      }
    }
  }

  txt += `------------------------------------------------\n`;
  txt += padLeft(`Subtotal: $${Number(sale.subtotal).toFixed(2)}`, 48) + '\n';
  if (Number(sale.discount_amount) > 0) {
    txt += padLeft(`Discount: -$${Number(sale.discount_amount).toFixed(2)}`, 48) + '\n';
  }
  txt += padLeft(`GST Tax: $${Number(sale.tax_amount).toFixed(2)}`, 48) + '\n';
  txt += padLeft(`GRAND TOTAL: $${Number(sale.grand_total).toFixed(2)}`, 48) + '\n';
  txt += padLeft(`Payment: ${String(sale.payment_method).toUpperCase()}`, 48) + '\n';
  if (sale.payment_method === 'cash') {
    txt += padLeft(`Cash Given: $${Number(sale.cash_given || 0).toFixed(2)}`, 48) + '\n';
    txt += padLeft(`Change Due: $${Number(sale.change_due || 0).toFixed(2)}`, 48) + '\n';
  }
  txt += `================================================\n`;
  txt += `  ${storeSettings.receipt_footer || 'Thank you for your visit!'}\n`;
  txt += `================================================\n`;

  return txt;
}

module.exports = {
  generateEscPosBuffer,
  generatePlainTextReceipt
};
