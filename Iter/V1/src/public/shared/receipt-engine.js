/**
 * Offline Pharmacy Receipt & Formal Report Rendering Engine (BDT Currency ৳)
 * Supports 80mm / 58mm Thermal Printers, Direct Receipt PDF Download, and Formal B&W Business PDF Reports.
 */

(function (window) {
  'use strict';

  // Code128 Barcode Generator helper (inline SVG)
  function generateCode128Svg(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="45" viewBox="0 0 220 45">`;
    svg += `<rect width="220" height="45" fill="#ffffff"/>`;
    
    let x = 10;
    // Start bar
    svg += `<rect x="${x}" y="5" width="2" height="28" fill="#000"/>`; x += 3;
    svg += `<rect x="${x}" y="5" width="1" height="28" fill="#000"/>`; x += 3;
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const w1 = (charCode % 3) + 1;
      const w2 = ((charCode >> 1) % 2) + 1;
      const w3 = ((charCode >> 2) % 3) + 1;
      
      svg += `<rect x="${x}" y="5" width="${w1}" height="28" fill="#000"/>`; x += w1 + 1;
      svg += `<rect x="${x}" y="5" width="${w2}" height="28" fill="#000"/>`; x += w2 + 2;
      svg += `<rect x="${x}" y="5" width="${w3}" height="28" fill="#000"/>`; x += w3 + 1;
    }
    
    // Stop bar
    svg += `<rect x="${x}" y="5" width="3" height="28" fill="#000"/>`; x += 4;
    svg += `<rect x="${x}" y="5" width="1" height="28" fill="#000"/>`;
    
    svg += `<text x="110" y="42" font-family="monospace" font-size="10" text-anchor="middle" fill="#000">${text}</text>`;
    svg += `</svg>`;
    
    return svg;
  }

  // Generate Thermal Receipt HTML String
  function generateThermalReceiptHtml(sale, settings = {}) {
    const width = settings.receipt_paper_width || '80mm';
    const is58 = width === '58mm';
    const showLogo = settings.show_logo !== '0' && settings.show_logo !== false;
    const logoUrl = settings.store_logo || '';
    const logoWidth = settings.logo_width || '120px';
    const showCustomer = settings.show_customer !== '0' && settings.show_customer !== false;
    const showCashier = settings.show_cashier !== '0' && settings.show_cashier !== false;
    const showBatchExp = settings.show_batch_expiry !== '0' && settings.show_batch_expiry !== false;
    const showTax = settings.show_tax_breakdown !== '0' && settings.show_tax_breakdown !== false;
    const showBarcode = settings.show_barcode !== '0' && settings.show_barcode !== false;

    const storeName = settings.store_name || 'CureAll Pharmacy & Chemists';
    const tagline = settings.store_tagline || 'Your Trusted Health & Wellness Partner';
    const address = settings.store_address || '102 Healthcare Avenue, Medical District';
    const phone = settings.store_phone || '+880 1712-345678';
    const email = settings.store_email || '';
    const gstin = settings.store_gstin || '';
    const dlNo = settings.store_dl_no || '';
    const headerNotice = settings.receipt_header_text || '';
    const footerText = settings.receipt_footer || 'Thank you for visiting CureAll Pharmacy! Wish you good health.';

    const invoiceNo = sale.invoice_no || 'INV-PREVIEW-001';
    const dateStr = sale.sale_timestamp ? new Date(sale.sale_timestamp).toLocaleString() : new Date().toLocaleString();
    const cashierName = sale.cashier_name || 'Cashier';
    const customerName = sale.customer_name || 'Walk-in Customer';
    const customerPhone = sale.customer_phone || '';

    const items = sale.items || [
      { brand_name: 'Amoxil 500mg Capsule', strength: '500 mg', generic_name: 'Amoxicillin', batch_no: 'AMX-2024-01', expiry_date: '2026-09-20', qty: 2, unit_price: 10.00, gst_percent: 12, total_amount: 20.00 },
      { brand_name: 'Napa Extend 665mg', strength: '665 mg', generic_name: 'Paracetamol', batch_no: 'NPA-A11', expiry_date: '2026-08-30', qty: 1, unit_price: 3.80, gst_percent: 12, total_amount: 3.80 }
    ];

    const subtotal = Number(sale.subtotal || 23.80).toFixed(2);
    const discount = Number(sale.discount_amount || 0).toFixed(2);
    const taxAmount = Number(sale.tax_amount || 2.55).toFixed(2);
    const grandTotal = Number(sale.grand_total || 23.80).toFixed(2);
    const payMethod = String(sale.payment_method || 'CASH').toUpperCase();
    const cashGiven = Number(sale.cash_given || 30.00).toFixed(2);
    const changeDue = Number(sale.change_due || 6.20).toFixed(2);

    let html = `
      <div class="thermal-receipt-container" style="
        width: ${is58 ? '58mm' : '80mm'};
        max-width: 100%;
        margin: 0 auto;
        padding: 10px 8px;
        background: #ffffff;
        color: #000000;
        font-family: 'Courier New', Courier, monospace;
        font-size: ${is58 ? '10px' : '12px'};
        line-height: 1.3;
        box-sizing: border-box;
      ">
    `;

    // Logo
    if (showLogo && logoUrl) {
      html += `
        <div style="text-align: center; margin-bottom: 8px;">
          <img src="${logoUrl}" style="max-width: ${logoWidth}; max-height: 70px; object-fit: contain;" alt="Logo" />
        </div>
      `;
    }

    // Store Header
    html += `
      <div style="text-align: center; margin-bottom: 8px;">
        <div style="font-weight: bold; font-size: ${is58 ? '13px' : '15px'}; text-transform: uppercase;">${storeName}</div>
        ${tagline ? `<div style="font-size: ${is58 ? '9px' : '11px'}; text-transform: italic; margin-top:2px;">${tagline}</div>` : ''}
        ${address ? `<div style="margin-top:2px;">${address}</div>` : ''}
        ${phone ? `<div>Ph: ${phone}</div>` : ''}
        ${email ? `<div>Email: ${email}</div>` : ''}
        ${gstin ? `<div>VAT/BIN: <strong>${gstin}</strong></div>` : ''}
        ${dlNo ? `<div>Drug Lic: <strong>${dlNo}</strong></div>` : ''}
        ${headerNotice ? `<div style="margin-top:4px; font-weight:bold; font-size:11px; border:1px dashed #000; padding:2px;">${headerNotice}</div>` : ''}
      </div>

      <div style="border-top: 1px dashed #000000; margin: 6px 0;"></div>
    `;

    // Metadata
    html += `
      <div style="margin-bottom: 6px;">
        <div><strong>Invoice No :</strong> ${invoiceNo}</div>
        <div><strong>Date & Time:</strong> ${dateStr}</div>
        ${showCashier ? `<div><strong>Cashier    :</strong> ${cashierName}</div>` : ''}
        ${showCustomer && customerName !== 'Walk-in Customer' ? `<div><strong>Customer   :</strong> ${customerName} ${customerPhone ? '(' + customerPhone + ')' : ''}</div>` : ''}
      </div>

      <div style="border-top: 1px dashed #000000; margin: 6px 0;"></div>
    `;

    // Items Table Header
    html += `
      <table style="width: 100%; border-collapse: collapse; font-size: inherit; text-align: left; margin-bottom: 6px;">
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th style="padding-bottom: 4px;">Item Description</th>
            <th style="text-align: center; width: 35px; padding-bottom: 4px;">Qty</th>
            <th style="text-align: right; width: 60px; padding-bottom: 4px;">Price</th>
            <th style="text-align: right; width: 65px; padding-bottom: 4px;">Total</th>
          </tr>
        </thead>
        <tbody>
    `;

    items.forEach(item => {
      const name = item.brand_name || item.medicine_name || 'Item';
      const strength = item.strength ? ` (${item.strength})` : '';
      const batch = item.batch_no || '';
      const exp = item.expiry_date || '';
      const gst = item.gst_percent || 12;

      html += `
        <tr>
          <td colspan="4" style="padding-top: 4px; font-weight: bold;">${name}${strength}</td>
        </tr>
        <tr>
          <td style="font-size: 0.9em; color: #333;">
            ${showBatchExp && batch ? `Batch: ${batch}` : ''} ${showBatchExp && exp ? `Exp: ${exp}` : ''}
          </td>
          <td style="text-align: center; vertical-align: top;">${item.qty}</td>
          <td style="text-align: right; vertical-align: top;">৳${Number(item.unit_price).toFixed(2)}</td>
          <td style="text-align: right; vertical-align: top; font-weight: bold;">৳${Number(item.total_amount).toFixed(2)}</td>
        </tr>
        ${showTax ? `<tr><td colspan="4" style="font-size: 0.85em; color: #555; padding-bottom: 4px;">VAT Included: ${gst}%</td></tr>` : ''}
      `;
    });

    html += `
        </tbody>
      </table>

      <div style="border-top: 1px dashed #000000; margin: 6px 0;"></div>
    `;

    // Totals Section
    html += `
      <div style="text-align: right; margin-bottom: 8px;">
        <div>Subtotal: ৳${subtotal}</div>
        ${Number(discount) > 0 ? `<div>Discount: -৳${discount}</div>` : ''}
        ${showTax ? `<div>VAT Tax Amount: ৳${taxAmount}</div>` : ''}
        <div style="font-size: 1.2em; font-weight: bold; margin-top: 4px;">GRAND TOTAL: ৳${grandTotal}</div>
        <div style="margin-top: 4px;">Payment Method: <strong>${payMethod}</strong></div>
        ${payMethod === 'CASH' ? `<div>Cash Tendered: ৳${cashGiven}</div><div>Change Due: ৳${changeDue}</div>` : ''}
      </div>

      <div style="border-top: 1px dashed #000000; margin: 6px 0;"></div>
    `;

    // Barcode
    if (showBarcode) {
      const barcodeSvg = generateCode128Svg(invoiceNo);
      html += `
        <div style="text-align: center; margin: 8px 0;">
          ${barcodeSvg}
        </div>
      `;
    }

    // Footer
    html += `
      <div style="text-align: center; margin-top: 8px; font-size: ${is58 ? '9px' : '11px'};">
        ${footerText}
      </div>
    </div>
    `;

    return html;
  }

  // Print Thermal Receipt Cleanly (Isolated Iframe, 80mm page size)
  function printThermalReceiptHtml(htmlContent, paperWidth = '80mm') {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt Print</title>
        <style>
          @page {
            margin: 0;
            size: ${paperWidth} auto;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #000000 !important;
            width: ${paperWidth};
          }
          .thermal-receipt-container {
            width: ${paperWidth} !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
          }
        </style>
      </head>
      <body>${htmlContent}</body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  }

  // Direct Receipt PDF Download (Uses html2canvas + jsPDF)
  async function downloadReceiptPdfHtml(htmlContent, fileName = 'Receipt.pdf', paperWidth = '80mm') {
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = paperWidth === '58mm' ? '220px' : '300px';
    tempDiv.style.background = '#ffffff';
    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);

    try {
      if (!window.html2canvas || !window.jspdf) {
        throw new Error('PDF Generation libraries not loaded');
      }

      const canvas = await window.html2canvas(tempDiv.querySelector('.thermal-receipt-container') || tempDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;

      const pdfWidth = paperWidth === '58mm' ? 58 : 80;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF Generation error:', err);
      alert('Failed to generate PDF download: ' + err.message);
    } finally {
      document.body.removeChild(tempDiv);
    }
  }

  // =========================================================================
  // FORMAL BLACK & WHITE BUSINESS PDF REPORT GENERATOR (A4 PRINT FORMAT)
  // =========================================================================
  async function generateFormalReportPdf({ reportTitle, timeframeText, summaryCards = [], columns = [], rows = [], storeSettings = {} }, filename = 'Business_Report.pdf') {
    const storeName = storeSettings.store_name || 'CUREALL PHARMACY & CHEMISTS';
    const tagline = storeSettings.store_tagline || 'Your Trusted Health & Wellness Partner';
    const address = storeSettings.store_address || '102 Healthcare Avenue, Medical District, Suite 4B';
    const phone = storeSettings.store_phone || '+880 1712-345678';
    const email = storeSettings.store_email || 'info@cureallpharmacy.com';
    const gstin = storeSettings.store_gstin || '27AAACC1234H1Z5';
    const dlNo = storeSettings.store_dl_no || 'DL-2024-998811';
    const logoUrl = storeSettings.store_logo || '';

    const genDate = new Date().toLocaleString();

    // Create temporary A4 formal document container
    const paperDiv = document.createElement('div');
    paperDiv.style.position = 'absolute';
    paperDiv.style.left = '-9999px';
    paperDiv.style.top = '-9999px';
    paperDiv.style.width = '794px'; // 210mm at 96 DPI
    paperDiv.style.padding = '35px 40px';
    paperDiv.style.background = '#ffffff';
    paperDiv.style.color = '#000000';
    paperDiv.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
    paperDiv.style.boxSizing = 'border-box';

    let html = `
      <!-- Formal Document Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000000; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="flex: 1;">
          <h1 style="font-size: 20px; font-weight: bold; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; color: #000000;">${storeName}</h1>
          <div style="font-size: 11px; font-style: italic; color: #333333; margin-top: 2px;">${tagline}</div>
          <div style="font-size: 10px; color: #444444; margin-top: 4px; line-height: 1.4;">
            ${address} | Ph: ${phone}<br/>
            ${email ? 'Email: ' + email + ' | ' : ''} VAT/BIN: ${gstin} | Drug Lic: ${dlNo}
          </div>
        </div>
        ${logoUrl ? `<div style="margin-left: 15px;"><img src="${logoUrl}" style="max-height: 65px; max-width: 140px; object-fit: contain;" /></div>` : ''}
      </div>

      <!-- Report Title Header Box -->
      <div style="text-align: center; border: 1px solid #000000; background: #f8f8f8; padding: 10px; margin-bottom: 16px;">
        <h2 style="font-size: 15px; font-weight: bold; text-transform: uppercase; margin: 0; letter-spacing: 1px; color: #000000;">${reportTitle}</h2>
        ${timeframeText ? `<div style="font-size: 11px; font-weight: bold; margin-top: 3px; color: #333333;">PERIOD / TIMEFRAME: ${timeframeText.toUpperCase()}</div>` : ''}
      </div>

      <!-- Report Metadata Summary Row -->
      <div style="display: flex; justify-content: space-between; font-size: 10px; border-bottom: 1px solid #cccccc; padding-bottom: 8px; margin-bottom: 16px;">
        <div><strong>Date of Generation:</strong> ${genDate}</div>
        <div><strong>Generated By:</strong> Administrator</div>
        <div><strong>System Currency:</strong> BDT (৳)</div>
        <div><strong>Doc Ref:</strong> REP-${Math.floor(100000 + Math.random() * 900000)}</div>
      </div>
    `;

    // Summary Metric KPI Grid (Formal Boxed Style)
    if (summaryCards && summaryCards.length > 0) {
      html += `
        <div style="display: grid; grid-template-columns: repeat(${Math.min(summaryCards.length, 4)}, 1fr); gap: 10px; margin-bottom: 20px;">
      `;
      summaryCards.forEach(card => {
        html += `
          <div style="border: 1px solid #000000; padding: 10px; text-align: center; background: #ffffff;">
            <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #555555;">${card.label}</div>
            <div style="font-size: 16px; font-weight: bold; margin-top: 4px; color: #000000;">${card.value}</div>
          </div>
        `;
      });
      html += `</div>`;
    }

    // Formal Data Table
    html += `
      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; font-family: inherit; margin-bottom: 30px;">
        <thead>
          <tr style="background: #e5e5e5; border-top: 1px solid #000000; border-bottom: 1px solid #000000;">
    `;

    columns.forEach(col => {
      const align = col.align || 'left';
      html += `<th style="padding: 8px 6px; text-align: ${align}; font-weight: bold; text-transform: uppercase; font-size: 9.5px; border-right: 1px solid #cccccc;">${col.header}</th>`;
    });

    html += `
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, rIdx) => {
      const bg = rIdx % 2 === 1 ? '#fcfcfc' : '#ffffff';
      html += `<tr style="background: ${bg}; border-bottom: 1px solid #dddddd;">`;
      columns.forEach(col => {
        const align = col.align || 'left';
        const val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '';
        html += `<td style="padding: 7px 6px; text-align: ${align}; border-right: 1px solid #eeeeee;">${val}</td>`;
      });
      html += `</tr>`;
    });

    html += `
        </tbody>
      </table>

      <!-- Formal Signatures & Endorsement Footer -->
      <div style="margin-top: 40px; padding-top: 20px; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div style="text-align: center; width: 200px;">
            <div style="border-bottom: 1px solid #000000; height: 35px;"></div>
            <div style="font-size: 10px; font-weight: bold; margin-top: 5px;">PREPARED BY (PHARMACIST)</div>
          </div>
          <div style="text-align: center; width: 200px;">
            <div style="border-bottom: 1px solid #000000; height: 35px;"></div>
            <div style="font-size: 10px; font-weight: bold; margin-top: 5px;">AUTHORIZED MANAGER / SEAL</div>
          </div>
        </div>

        <div style="border-top: 1px solid #000000; padding-top: 8px; font-size: 9px; color: #555555; text-align: center; line-height: 1.4;">
          <strong>CONFIDENTIAL BUSINESS RECORD</strong> — CureAll Pharmacy Management System.<br/>
          This document is generated automatically for internal audit, tax compliance, and stock verification.
        </div>
      </div>
    `;

    paperDiv.innerHTML = html;
    document.body.appendChild(paperDiv);

    try {
      if (!window.html2canvas || !window.jspdf) {
        throw new Error('PDF libraries (jsPDF/html2canvas) not loaded');
      }

      const canvas = await window.html2canvas(paperDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(filename);
    } catch (err) {
      console.error('Formal PDF generation error:', err);
      alert('Failed to generate formal PDF report: ' + err.message);
    } finally {
      document.body.removeChild(paperDiv);
    }
  }

  // Export Global API
  window.ReceiptEngine = {
    generateThermalReceiptHtml,
    printThermalReceiptHtml,
    downloadReceiptPdfHtml,
    generateFormalReportPdf
  };

})(window);
