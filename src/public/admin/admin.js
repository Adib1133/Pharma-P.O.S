/**
 * Pharmacy Management System - Admin Dashboard SPA Engine (BDT Currency ৳)
 * Supports Formal B&W PDF Business Reports
 */

(function () {
  'use strict';

  // Admin App State
  const state = {
    currentTab: 'dashboard',
    activeReportTab: 'sales',
    medicines: [],
    categories: [],
    suppliers: [],
    customers: [],
    users: [],
    sales: [],
    batches: [],
    storeSettings: {}
  };

  // DOM Cache
  const DOM = {};

  function initDOM() {
    DOM.pageTitle = document.getElementById('page-title');
    DOM.btnGlobalRefresh = document.getElementById('btn-global-refresh');
    DOM.tabPanes = document.querySelectorAll('.tab-pane');
    DOM.navItems = document.querySelectorAll('.nav-item');

    // Modal
    DOM.modalOverlay = document.getElementById('admin-modal-overlay');
    DOM.modalTitle = document.getElementById('admin-modal-title');
    DOM.modalBody = document.getElementById('admin-modal-body');
    DOM.btnCloseModal = document.getElementById('btn-close-admin-modal');
  }

  // ==========================================
  // CUSTOM POPUP & TOAST NOTIFICATION SYSTEM
  // ==========================================
  function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, type = 'info', duration = 3500) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function showAlertModal({ title = 'Notice', message, type = 'info', icon = 'ℹ️', onConfirm }) {
    let overlay = document.getElementById('custom-popup-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'custom-popup-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    const iconClass = type === 'error' ? 'popup-icon-error' : (type === 'warning' ? 'popup-icon-warning' : 'popup-icon-info');

    overlay.innerHTML = `
      <div class="modal-card" style="width: 400px; text-align: center;">
        <div class="modal-body" style="padding: 24px;">
          <div class="popup-icon-circle ${iconClass}">${icon}</div>
          <h3 style="margin-bottom: 8px; font-size: 18px;">${title}</h3>
          <p style="font-size: 14px; color: #94a3b8; margin-bottom: 20px; line-height: 1.4;">${message}</p>
          <button id="btn-popup-ok" class="btn-popup-confirm" style="width: 100%;">OK</button>
        </div>
      </div>
    `;

    overlay.style.display = 'flex';

    document.getElementById('btn-popup-ok').onclick = () => {
      overlay.style.display = 'none';
      if (onConfirm) onConfirm();
    };
  }

  function showConfirmModal({ title = 'Confirmation', message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false, onConfirm, onCancel }) {
    let overlay = document.getElementById('custom-popup-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'custom-popup-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="modal-card" style="width: 420px; text-align: center;">
        <div class="modal-body" style="padding: 24px;">
          <div class="popup-icon-circle ${isDanger ? 'popup-icon-error' : 'popup-icon-warning'}">${isDanger ? '🗑️' : '❓'}</div>
          <h3 style="margin-bottom: 8px; font-size: 18px;">${title}</h3>
          <p style="font-size: 14px; color: #94a3b8; margin-bottom: 20px; line-height: 1.4;">${message}</p>
          <div class="popup-actions-row">
            <button id="btn-popup-cancel" class="btn-popup-cancel">${cancelText}</button>
            <button id="btn-popup-confirm" class="btn-popup-confirm ${isDanger ? 'btn-popup-danger' : ''}">${confirmText}</button>
          </div>
        </div>
      </div>
    `;

    overlay.style.display = 'flex';

    document.getElementById('btn-popup-cancel').onclick = () => {
      overlay.style.display = 'none';
      if (onCancel) onCancel();
    };

    document.getElementById('btn-popup-confirm').onclick = () => {
      overlay.style.display = 'none';
      if (onConfirm) onConfirm();
    };
  }

  // Global Unhandled Error Interceptor
  window.onerror = function (msg, url, line) {
    showAlertModal({
      title: 'Application Exception',
      message: `${msg} (Line ${line})`,
      type: 'error',
      icon: '💥'
    });
    return true;
  };

  window.onunhandledrejection = function (e) {
    showToast(`Unhandled Error: ${e.reason ? e.reason.message || e.reason : 'Network failure'}`, 'error');
  };

  document.addEventListener('DOMContentLoaded', async () => {
    initDOM();
    setupNavigation();
    setupGlobalEvents();
    await loadInitialData();
  });

  // API Call Helper
  async function apiCall(url, options = {}) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }
      return data;
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
      throw err;
    }
  }

  // Navigation Setup
  function setupNavigation() {
    DOM.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        switchTab(tab);
      });
    });

    DOM.btnCloseModal.addEventListener('click', () => {
      DOM.modalOverlay.style.display = 'none';
    });
  }

  function switchTab(tabName) {
    state.currentTab = tabName;
    DOM.navItems.forEach(n => {
      if (n.dataset.tab === tabName) n.classList.add('active');
      else n.classList.remove('active');
    });

    DOM.tabPanes.forEach(pane => {
      if (pane.id === `pane-${tabName}`) pane.classList.add('active');
      else pane.classList.remove('active');
    });

    const titles = {
      dashboard: 'Dashboard Overview',
      medicines: 'Medicine Master Catalog',
      stock: 'Batch-Wise Inventory & FEFO',
      sales: 'Sales History & Receipt Reprint',
      reports: 'Business Reports & Analytics',
      customers: 'Customer Profiles & Loyalty Points',
      suppliers: 'Supplier Management',
      users: 'User Roles & Cashier PINs',
      settings: 'Store & Receipt Customization'
    };

    DOM.pageTitle.textContent = titles[tabName] || 'Admin Dashboard';
    refreshActiveTabContent();
  }

  async function loadInitialData() {
    // FIX #19: Load store settings at startup so state.storeSettings is
    // populated before the reports tab or receipt reprint uses store_name.
    // Previously this was never called in the admin panel, causing reports
    // to always show the default fallback name 'CureAll Pharmacy'.
    await loadSettings();
    await refreshActiveTabContent();
  }

  async function refreshActiveTabContent() {
    if (state.currentTab === 'dashboard') await loadDashboard();
    else if (state.currentTab === 'medicines') await loadMedicines();
    else if (state.currentTab === 'stock') await loadStockBatches();
    else if (state.currentTab === 'sales') await loadSalesHistory();
    else if (state.currentTab === 'reports') await loadReports(state.activeReportTab || 'sales');
    else if (state.currentTab === 'customers') await loadCustomers();
    else if (state.currentTab === 'suppliers') await loadSuppliers();
    else if (state.currentTab === 'users') await loadUsers();
    else if (state.currentTab === 'settings') await loadSettings();
  }

  function setupGlobalEvents() {
    DOM.btnGlobalRefresh.addEventListener('click', () => {
      refreshActiveTabContent();
      showToast('Dashboard data refreshed', 'success');
    });

    const btnGotoStock = document.getElementById('btn-goto-stock');
    if (btnGotoStock) btnGotoStock.onclick = () => switchTab('stock');
    const btnGotoExpiry = document.getElementById('btn-goto-expiry');
    if (btnGotoExpiry) btnGotoExpiry.onclick = () => switchTab('stock');
  }

  // ==========================================
  // TAB 1: DASHBOARD
  // ==========================================
  async function loadDashboard() {
    try {
      const kpis = await apiCall('/api/reports/dashboard-kpis');
      document.getElementById('kpi-today-rev').textContent = `৳${Number(kpis.today_revenue).toFixed(2)}`;
      document.getElementById('kpi-today-count').textContent = `${kpis.today_sales_count} transactions today`;
      document.getElementById('kpi-month-rev').textContent = `৳${Number(kpis.month_revenue).toFixed(2)}`;
      document.getElementById('kpi-month-profit').textContent = `Est. Profit Margin: ${kpis.profit_margin_pct}%`;
      document.getElementById('kpi-low-stock').textContent = kpis.low_stock_count;
      document.getElementById('kpi-expiry-warn').textContent = kpis.expiry_warning_count;

      const lowStock = await apiCall('/api/stock/low-stock');
      let lowHtml = '';
      lowStock.slice(0, 5).forEach(item => {
        lowHtml += `
          <tr>
            <td><strong>${item.brand_name}</strong> (${item.generic_name})</td>
            <td>${item.category_name || 'N/A'}</td>
            <td><span class="badge-tag badge-red">${item.current_stock}</span></td>
            <td>${item.min_stock_level}</td>
            <td><span class="badge-tag badge-amber">Reorder Req</span></td>
          </tr>
        `;
      });
      document.getElementById('dash-low-stock-body').innerHTML = lowHtml || '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">All stock levels are optimal</td></tr>';

      const expiryAlerts = await apiCall('/api/stock/expiry-alerts');
      const nearExpiryList = [...expiryAlerts.expired, ...expiryAlerts.within30, ...expiryAlerts.within60];
      let expHtml = '';
      nearExpiryList.slice(0, 5).forEach(item => {
        const isExp = item.days_to_expiry < 0;
        expHtml += `
          <tr>
            <td><strong>${item.brand_name}</strong></td>
            <td>${item.batch_no}</td>
            <td>${item.expiry_date}</td>
            <td><span class="badge-tag ${isExp ? 'badge-red' : 'badge-amber'}">${isExp ? 'EXPIRED' : item.days_to_expiry + ' days'}</span></td>
            <td>${item.qty_remaining}</td>
          </tr>
        `;
      });
      document.getElementById('dash-expiry-body').innerHTML = expHtml || '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No near-expiry batches detected</td></tr>';
    } catch (err) {
      console.error(err);
    }
  }

  // ==========================================
  // TAB 2: MEDICINE MASTER
  // ==========================================
  async function loadMedicines() {
    try {
      const medicines = await apiCall('/api/medicines');
      const categories = await apiCall('/api/medicines/categories');
      state.medicines = medicines;
      state.categories = categories;

      const catSelect = document.getElementById('med-cat-filter');
      let catOpt = '<option value="all">All Categories</option>';
      categories.forEach(c => catOpt += `<option value="${c.id}">${c.name}</option>`);
      catSelect.innerHTML = catOpt;

      renderMedicineTable(medicines);

      document.getElementById('med-search-input').oninput = () => filterMedicines();
      document.getElementById('med-cat-filter').onchange = () => filterMedicines();

      document.getElementById('btn-add-med').onclick = () => openMedicineModal();

      const fileInput = document.getElementById('input-csv-file');
      document.getElementById('btn-import-csv').onclick = () => fileInput.click();
      fileInput.onchange = async () => {
        if (!fileInput.files || fileInput.files.length === 0) return;
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        const res = await apiCall('/api/medicines/import-csv', {
          method: 'POST',
          body: formData
        });
        showToast(res.message, 'success');
        await loadMedicines();
      };
    } catch (err) {
      console.error(err);
    }
  }

  function filterMedicines() {
    const q = document.getElementById('med-search-input').value.toLowerCase();
    const cat = document.getElementById('med-cat-filter').value;

    const filtered = state.medicines.filter(m => {
      const matchQ = m.brand_name.toLowerCase().includes(q) ||
                     m.generic_name.toLowerCase().includes(q) ||
                     (m.strength && m.strength.toLowerCase().includes(q)) ||
                     (m.sku && m.sku.toLowerCase().includes(q));
      const matchCat = cat === 'all' || m.category_id == cat;
      return matchQ && matchCat;
    });

    renderMedicineTable(filtered);
  }

  function renderMedicineTable(list) {
    const tbody = document.getElementById('med-table-body');
    let html = '';
    list.forEach(m => {
      html += `
        <tr>
          <td><code>${m.sku || 'N/A'}</code></td>
          <td><strong>${m.brand_name}</strong></td>
          <td><span class="badge-tag badge-amber">${m.strength || 'N/A'}</span></td>
          <td>${m.generic_name}</td>
          <td>${m.category_name || 'N/A'}</td>
          <td>${m.packing || 'Strip'}</td>
          <td style="color:#5eead4; font-weight:700;">৳${Number(m.selling_price).toFixed(2)}</td>
          <td>${m.gst_percent}%</td>
          <td><span class="badge-tag badge-amber">${m.schedule || 'OTC'}</span></td>
          <td>${m.prescription_req ? '⚠️ Rx' : 'OTC'}</td>
          <td><span class="badge-tag ${m.total_stock > 10 ? 'badge-green' : 'badge-red'}">${m.total_stock}</span></td>
          <td>
            <button class="btn-sm btn-edit-med" data-id="${m.id}">Edit</button>
            <button class="btn-sm btn-del-med" data-id="${m.id}" style="color:#fca5a5;">Del</button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html || '<tr><td colspan="12" style="text-align:center; color:#94a3b8;">No medicines found</td></tr>';

    tbody.querySelectorAll('.btn-edit-med').forEach(btn => {
      btn.onclick = () => {
        const med = state.medicines.find(m => m.id == btn.dataset.id);
        openMedicineModal(med);
      };
    });

    tbody.querySelectorAll('.btn-del-med').forEach(btn => {
      btn.onclick = () => {
        const med = state.medicines.find(m => m.id == btn.dataset.id);
        showConfirmModal({
          title: 'Delete Medicine Record',
          message: `Are you sure you want to delete ${med ? med.brand_name : 'this medicine'}?`,
          confirmText: 'Delete Record',
          isDanger: true,
          onConfirm: async () => {
            await apiCall(`/api/medicines/${btn.dataset.id}`, { method: 'DELETE' });
            showToast('Medicine deleted successfully', 'info');
            await loadMedicines();
          }
        });
      };
    });
  }

  function openMedicineModal(med = null) {
    DOM.modalTitle.textContent = med ? `Edit Medicine: ${med.brand_name}` : 'Add New Medicine';
    
    let catOpts = '<option value="">Select Category</option>';
    state.categories.forEach(c => {
      catOpts += `<option value="${c.id}" ${med && med.category_id == c.id ? 'selected' : ''}>${c.name}</option>`;
    });

    DOM.modalBody.innerHTML = `
      <form id="form-medicine-edit">
        <div class="form-row-3">
          <div class="form-group">
            <label>Brand Name *</label>
            <input type="text" id="m-brand" required class="form-control" value="${med ? med.brand_name : ''}">
          </div>
          <div class="form-group">
            <label>Generic Name *</label>
            <input type="text" id="m-generic" required class="form-control" value="${med ? med.generic_name : ''}">
          </div>
          <div class="form-group">
            <label>Dosage Strength (mg / ml) *</label>
            <input type="text" id="m-strength" class="form-control" placeholder="e.g. 500 mg, 650 mg, 10 mg" value="${med ? med.strength || '' : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Manufacturer</label>
            <input type="text" id="m-mfr" class="form-control" value="${med ? med.manufacturer || '' : ''}">
          </div>
          <div class="form-group">
            <label>Category</label>
            <select id="m-cat" class="form-control">${catOpts}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Packing (e.g. 10 Strip)</label>
            <input type="text" id="m-packing" class="form-control" value="${med ? med.packing || '10 Strip' : '10 Strip'}">
          </div>
          <div class="form-group">
            <label>SKU / Barcode</label>
            <input type="text" id="m-sku" class="form-control" value="${med ? med.sku || '' : ''}" placeholder="Auto-generated if empty">
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label>MRP (৳)</label>
            <input type="number" step="0.1" id="m-mrp" class="form-control" value="${med ? med.mrp : '10.00'}">
          </div>
          <div class="form-group">
            <label>Selling Price (৳) *</label>
            <input type="number" step="0.1" id="m-selling" required class="form-control" value="${med ? med.selling_price : '8.50'}">
          </div>
          <div class="form-group">
            <label>Purchase Price (৳)</label>
            <input type="number" step="0.1" id="m-purchase" class="form-control" value="${med ? med.purchase_price : '5.00'}">
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label>VAT Tax %</label>
            <input type="number" step="0.1" id="m-gst" class="form-control" value="${med ? med.gst_percent : '12'}">
          </div>
          <div class="form-group">
            <label>HSN Code</label>
            <input type="text" id="m-hsn" class="form-control" value="${med ? med.hsn_code || '3004' : '3004'}">
          </div>
          <div class="form-group">
            <label>Schedule</label>
            <select id="m-schedule" class="form-control">
              <option value="OTC" ${med && med.schedule === 'OTC' ? 'selected' : ''}>OTC</option>
              <option value="H" ${med && med.schedule === 'H' ? 'selected' : ''}>Schedule H</option>
              <option value="H1" ${med && med.schedule === 'H1' ? 'selected' : ''}>Schedule H1</option>
              <option value="X" ${med && med.schedule === 'X' ? 'selected' : ''}>Schedule X</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-top:4px;">
          <label class="toggle-checkbox">
            <input type="checkbox" id="m-rx" ${med && med.prescription_req ? 'checked' : ''}>
            Prescription Required for sale (Schedule Rx)
          </label>
        </div>
        <button type="submit" class="btn-primary" style="width:100%; margin-top:12px;">Save Medicine Record</button>
      </form>
    `;

    DOM.modalOverlay.style.display = 'flex';

    document.getElementById('form-medicine-edit').onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        brand_name: document.getElementById('m-brand').value,
        generic_name: document.getElementById('m-generic').value,
        strength: document.getElementById('m-strength').value,
        manufacturer: document.getElementById('m-mfr').value,
        category_id: document.getElementById('m-cat').value || null,
        packing: document.getElementById('m-packing').value,
        sku: document.getElementById('m-sku').value,
        mrp: document.getElementById('m-mrp').value,
        selling_price: document.getElementById('m-selling').value,
        purchase_price: document.getElementById('m-purchase').value,
        gst_percent: document.getElementById('m-gst').value,
        hsn_code: document.getElementById('m-hsn').value,
        schedule: document.getElementById('m-schedule').value,
        prescription_req: document.getElementById('m-rx').checked
      };

      if (med) {
        await apiCall(`/api/medicines/${med.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast(`Updated ${payload.brand_name}`, 'success');
      } else {
        await apiCall('/api/medicines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast(`Created medicine ${payload.brand_name}`, 'success');
      }

      DOM.modalOverlay.style.display = 'none';
      await loadMedicines();
    };
  }

  // ==========================================
  // TAB 3: STOCK MANAGEMENT & FEFO
  // ==========================================
  async function loadStockBatches() {
    try {
      const batches = await apiCall('/api/stock/batches');
      state.batches = batches;

      renderStockTable(batches);

      document.getElementById('stock-status-filter').onchange = (e) => {
        const val = e.target.value;
        const filtered = val === 'all' ? state.batches : state.batches.filter(b => {
          if (val === 'active') return !b.is_quarantined && b.qty_remaining > 0 && b.days_to_expiry >= 0;
          if (val === 'expired') return b.days_to_expiry < 0;
          if (val === 'quarantined') return b.is_quarantined === 1;
          return true;
        });
        renderStockTable(filtered);
      };

      document.getElementById('btn-add-batch').onclick = () => openAddBatchModal();
      document.getElementById('btn-stock-adjust').onclick = () => openStockAdjustModal();
    } catch (err) {
      console.error(err);
    }
  }

  function renderStockTable(list) {
    const tbody = document.getElementById('stock-table-body');
    let html = '';
    list.forEach(b => {
      const isExp = b.days_to_expiry < 0;
      const isNear = b.days_to_expiry >= 0 && b.days_to_expiry <= 60;
      html += `
        <tr>
          <td><strong>${b.brand_name}</strong></td>
          <td><code>${b.batch_no}</code></td>
          <td>${b.expiry_date}</td>
          <td><span class="badge-tag ${isExp ? 'badge-red' : (isNear ? 'badge-amber' : 'badge-green')}">${isExp ? 'EXPIRED' : Math.round(b.days_to_expiry) + ' days'}</span></td>
          <td>${b.qty_received}</td>
          <td style="font-weight:700; color:#5eead4;">${b.qty_remaining}</td>
          <td>৳${Number(b.cost_price).toFixed(2)}</td>
          <td>${b.supplier_name || 'N/A'}</td>
          <td>${b.is_quarantined ? '<span class="badge-tag badge-red">Quarantined</span>' : '<span class="badge-tag badge-green">Active</span>'}</td>
          <td>
            <button class="btn-sm btn-toggle-quarantine" data-id="${b.id}" data-status="${b.is_quarantined}">
              ${b.is_quarantined ? 'Enable' : 'Quarantine'}
            </button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html || '<tr><td colspan="10" style="text-align:center; color:#94a3b8;">No stock batches found</td></tr>';

    tbody.querySelectorAll('.btn-toggle-quarantine').forEach(btn => {
      btn.onclick = async () => {
        const bId = btn.dataset.id;
        const cur = parseInt(btn.dataset.status);
        await apiCall(`/api/stock/batches/${bId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_quarantined: cur ? 0 : 1 })
        });
        showToast(cur ? 'Batch enabled' : 'Batch quarantined', 'info');
        await loadStockBatches();
      };
    });
  }

  async function openAddBatchModal() {
    DOM.modalTitle.textContent = 'Receive New Stock Batch';
    const medicines = await apiCall('/api/medicines');
    const suppliers = await apiCall('/api/suppliers');

    let medOpts = '<option value="">Select Medicine</option>';
    medicines.forEach(m => medOpts += `<option value="${m.id}">${m.brand_name} (${m.generic_name})</option>`);

    let supOpts = '<option value="">Select Supplier</option>';
    suppliers.forEach(s => supOpts += `<option value="${s.id}">${s.name}</option>`);

    DOM.modalBody.innerHTML = `
      <form id="form-add-batch">
        <div class="form-group">
          <label>Medicine *</label>
          <select id="b-med" required class="form-control">${medOpts}</select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Batch Number *</label>
            <input type="text" id="b-no" required class="form-control" placeholder="e.g. BATCH-2026-99">
          </div>
          <div class="form-group">
            <label>Expiry Date *</label>
            <input type="date" id="b-exp" required class="form-control">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Quantity Received *</label>
            <input type="number" id="b-qty" required class="form-control" min="1" value="100">
          </div>
          <div class="form-group">
            <label>Cost / Purchase Price (৳)</label>
            <input type="number" step="0.1" id="b-cost" class="form-control" value="5.00">
          </div>
        </div>
        <div class="form-group">
          <label>Supplier</label>
          <select id="b-sup" class="form-control">${supOpts}</select>
        </div>
        <button type="submit" class="btn-primary" style="width:100%; margin-top:10px;">Save Stock Batch</button>
      </form>
    `;

    DOM.modalOverlay.style.display = 'flex';

    document.getElementById('form-add-batch').onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        medicine_id: document.getElementById('b-med').value,
        batch_no: document.getElementById('b-no').value,
        expiry_date: document.getElementById('b-exp').value,
        qty_received: parseInt(document.getElementById('b-qty').value),
        cost_price: parseFloat(document.getElementById('b-cost').value) || 0,
        supplier_id: document.getElementById('b-sup').value || null
      };

      await apiCall('/api/stock/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      showToast(`Batch ${payload.batch_no} received successfully`, 'success');
      DOM.modalOverlay.style.display = 'none';
      await loadStockBatches();
    };
  }

  async function openStockAdjustModal() {
    DOM.modalTitle.textContent = 'Stock Adjustment & Audit Log';
    const batches = await apiCall('/api/stock/batches?status=active');

    let batchOpts = '<option value="">Select Batch to Adjust</option>';
    batches.forEach(b => batchOpts += `<option value="${b.id}">${b.brand_name} - Batch ${b.batch_no} (Cur: ${b.qty_remaining})</option>`);

    DOM.modalBody.innerHTML = `
      <form id="form-stock-adjust">
        <div class="form-group">
          <label>Target Batch *</label>
          <select id="adj-batch" required class="form-control">${batchOpts}</select>
        </div>
        <div class="form-group">
          <label>Quantity Change (+ for addition, - for deduction) *</label>
          <input type="number" id="adj-qty" required class="form-control" placeholder="e.g. -5 for damaged stock">
        </div>
        <div class="form-group">
          <label>Audit Reason *</label>
          <input type="text" id="adj-reason" required class="form-control" placeholder="e.g. Broken vial during storage">
        </div>
        <button type="submit" class="btn-primary" style="width:100%; margin-top:10px;">Submit Adjustment</button>
      </form>
    `;

    DOM.modalOverlay.style.display = 'flex';

    document.getElementById('form-stock-adjust').onsubmit = async (e) => {
      e.preventDefault();
      await apiCall('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: document.getElementById('adj-batch').value,
          change_qty: parseInt(document.getElementById('adj-qty').value),
          reason: document.getElementById('adj-reason').value,
          user_id: 1
        })
      });

      showToast('Stock adjusted and audit log recorded', 'success');
      DOM.modalOverlay.style.display = 'none';
      await loadStockBatches();
    };
  }

  // ==========================================
  // TAB 4: SALES HISTORY & RECEIPTS
  // ==========================================
  async function loadSalesHistory() {
    try {
      const sales = await apiCall('/api/sales');
      state.sales = sales;

      renderSalesTable(sales);

      document.getElementById('btn-filter-sales').onclick = async () => {
        const start = document.getElementById('sale-start-date').value;
        const end = document.getElementById('sale-end-date').value;
        const q = document.getElementById('sale-search-query').value;

        let url = '/api/sales?';
        if (start) url += `start_date=${start}&`;
        if (end) url += `end_date=${end}&`;
        if (q) url += `q=${encodeURIComponent(q)}`;

        const filtered = await apiCall(url);
        renderSalesTable(filtered);
      };
    } catch (err) {
      console.error(err);
    }
  }

  function renderSalesTable(list) {
    const tbody = document.getElementById('sales-table-body');
    let html = '';
    list.forEach(s => {
      html += `
        <tr>
          <td><code>${s.invoice_no}</code></td>
          <td>${new Date(s.sale_timestamp).toLocaleString()}</td>
          <td>${s.cashier_name || 'Cashier'}</td>
          <td>${s.customer_name || 'Walk-in'}</td>
          <td><span class="badge-tag badge-green">${String(s.payment_method).toUpperCase()}</span></td>
          <td>${s.total_items} items</td>
          <td style="font-weight:700; color:#5eead4;">৳${Number(s.grand_total).toFixed(2)}</td>
          <td>
            <button class="btn-sm btn-reprint-receipt" data-id="${s.id}">Reprint Receipt</button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html || '<tr><td colspan="8" style="text-align:center; color:#94a3b8;">No sales history found</td></tr>';

    tbody.querySelectorAll('.btn-reprint-receipt').forEach(btn => {
      btn.onclick = async () => {
        const sId = btn.dataset.id;
        const sale = await apiCall(`/api/sales/${sId}`);
        const settings = await apiCall('/api/settings');
        const receiptHtml = window.ReceiptEngine.generateThermalReceiptHtml(sale, settings);
        
        DOM.modalTitle.textContent = `Reprint Receipt: ${sale.invoice_no}`;
        DOM.modalBody.innerHTML = `
          <div style="background:#334155; padding:16px; border-radius:8px; display:flex; justify-content:center; max-height:350px; overflow-y:auto;">${receiptHtml}</div>
          <div style="display:flex; gap:10px; margin-top:14px;">
            <button id="btn-reprint-do" class="btn-primary" style="flex:1;">🖨️ Print Thermal</button>
            <button id="btn-reprint-pdf" class="btn-secondary" style="flex:1;">📥 Download PDF</button>
            <a href="/api/sales/${sId}/receipt?format=escpos" target="_blank" class="btn-secondary" style="flex:1; text-align:center; text-decoration:none;">💾 ESC/POS Bin</a>
          </div>
        `;

        document.getElementById('btn-reprint-do').onclick = () => {
          window.ReceiptEngine.printThermalReceiptHtml(receiptHtml, settings.receipt_paper_width || '80mm');
        };

        document.getElementById('btn-reprint-pdf').onclick = () => {
          window.ReceiptEngine.downloadReceiptPdfHtml(receiptHtml, `Receipt_${sale.invoice_no}.pdf`, settings.receipt_paper_width || '80mm');
          showToast(`Generating ${sale.invoice_no}.pdf download...`, 'info');
        };

        DOM.modalOverlay.style.display = 'flex';
      };
    });
  }

  // ==========================================
  // TAB 5: COMPREHENSIVE BUSINESS REPORTS & FORMAL PDF EXPORT
  // ==========================================
  async function loadReports(reportType = 'sales') {
    state.activeReportTab = reportType;
    const container = document.getElementById('report-view-container');
    const timeframeSelect = document.getElementById('rep-timeframe-select');
    const monthPicker = document.getElementById('rep-month-picker');
    const yearSelect = document.getElementById('rep-year-select');

    document.querySelectorAll('.rep-tab').forEach(tab => {
      if (tab.dataset.report === reportType) tab.classList.add('active');
      else tab.classList.remove('active');
      tab.onclick = () => loadReports(tab.dataset.report);
    });

    // Timeframe filters change trigger
    timeframeSelect.onchange = () => loadReports(reportType);
    monthPicker.onchange = () => loadReports(reportType);
    yearSelect.onchange = () => loadReports(reportType);

    if (reportType === 'sales') {
      const tf = timeframeSelect.value;
      const yr = yearSelect.value;
      const mo = monthPicker.value;

      const res = await apiCall(`/api/reports/sales-report?timeframe=${tf}&year=${yr}&month=${mo}`);
      const summary = res.summary;
      const rows = res.data;

      // On-Screen Display
      let tableRowsHtml = '';
      rows.forEach(r => {
        tableRowsHtml += `
          <tr>
            <td><strong>${r.period}</strong></td>
            <td>${r.invoice_count}</td>
            <td>৳${Number(r.subtotal).toFixed(2)}</td>
            <td>৳${Number(r.discount).toFixed(2)}</td>
            <td>৳${Number(r.tax).toFixed(2)}</td>
            <td style="color:#5eead4; font-weight:700;">৳${Number(r.grand_total).toFixed(2)}</td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="report-printable-area">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #334155; padding-bottom:12px; margin-bottom:16px;">
            <div>
              <h2 style="color:#5eead4; margin-bottom:4px;">📈 Sales Revenue Report (${tf.toUpperCase()})</h2>
              <span style="font-size:12px; color:#94a3b8;">Generated on: ${new Date().toLocaleString()} | Period: ${tf.toUpperCase()}</span>
            </div>
            <div style="text-align:right; font-size:12px; color:#94a3b8;">
              <div>Store: ${state.storeSettings.store_name || 'CureAll Pharmacy'}</div>
              <div>Currency: BDT (৳)</div>
            </div>
          </div>

          <div class="kpi-grid" style="margin-bottom:20px;">
            <div class="kpi-card"><div class="kpi-data"><span class="kpi-label">Total Invoices</span><h3>${summary.invoices}</h3></div></div>
            <div class="kpi-card"><div class="kpi-data"><span class="kpi-label">Subtotal</span><h3>৳${summary.subtotal.toFixed(2)}</h3></div></div>
            <div class="kpi-card"><div class="kpi-data"><span class="kpi-label">VAT Tax Collected</span><h3>৳${summary.tax.toFixed(2)}</h3></div></div>
            <div class="kpi-card"><div class="kpi-data"><span class="kpi-label">Total Revenue</span><h3 style="color:#5eead4;">৳${summary.grand_total.toFixed(2)}</h3></div></div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Invoices</th>
                  <th>Subtotal</th>
                  <th>Discount</th>
                  <th>VAT Tax</th>
                  <th>Grand Total (৳)</th>
                </tr>
              </thead>
              <tbody>${tableRowsHtml || '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No sales records found for period</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      `;

      // Formal B&W PDF Download Trigger
      document.getElementById('btn-download-rep-pdf').onclick = () => {
        const formalRows = rows.map(r => ({
          period: r.period,
          invoice_count: r.invoice_count,
          subtotal_str: `৳${Number(r.subtotal).toFixed(2)}`,
          discount_str: `৳${Number(r.discount).toFixed(2)}`,
          tax_str: `৳${Number(r.tax).toFixed(2)}`,
          grand_total_str: `৳${Number(r.grand_total).toFixed(2)}`
        }));

        window.ReceiptEngine.generateFormalReportPdf({
          reportTitle: `OFFICIAL SALES REVENUE REPORT (${tf.toUpperCase()})`,
          timeframeText: `${tf.toUpperCase()} (${yr}${mo ? '-' + mo : ''})`,
          summaryCards: [
            { label: 'Total Invoices', value: summary.invoices },
            { label: 'Subtotal', value: `৳${summary.subtotal.toFixed(2)}` },
            { label: 'VAT Tax', value: `৳${summary.tax.toFixed(2)}` },
            { label: 'Total Sales Revenue', value: `৳${summary.grand_total.toFixed(2)}` }
          ],
          columns: [
            { header: 'Period', key: 'period', align: 'left' },
            { header: 'Invoices', key: 'invoice_count', align: 'center' },
            { header: 'Subtotal (৳)', key: 'subtotal_str', align: 'right' },
            { header: 'Discount (৳)', key: 'discount_str', align: 'right' },
            { header: 'VAT Tax (৳)', key: 'tax_str', align: 'right' },
            { header: 'Grand Total (৳)', key: 'grand_total_str', align: 'right' }
          ],
          rows: formalRows,
          storeSettings: state.storeSettings
        }, `Sales_Report_${tf.toUpperCase()}_${new Date().toISOString().slice(0,10)}.pdf`);
        showToast('Generating official B&W formal PDF report...', 'info');
      };

    } else if (reportType === 'stock') {
      const res = await apiCall('/api/reports/stock-report');
      const sum = res.summary;
      const rows = res.data;

      let tableRowsHtml = '';
      rows.forEach(r => {
        const isExp = r.days_to_expiry < 0;
        const isNear = r.days_to_expiry >= 0 && r.days_to_expiry <= 90;
        tableRowsHtml += `
          <tr>
            <td><strong>${r.brand_name}</strong> ${r.strength ? '(' + r.strength + ')' : ''}</td>
            <td><code>${r.batch_no}</code></td>
            <td>${r.expiry_date}</td>
            <td><span class="badge-tag ${isExp ? 'badge-red' : (isNear ? 'badge-amber' : 'badge-green')}">${isExp ? 'EXPIRED' : Math.round(r.days_to_expiry) + ' days'}</span></td>
            <td>${r.qty_remaining}</td>
            <td>৳${Number(r.cost_price).toFixed(2)}</td>
            <td>৳${Number(r.selling_price).toFixed(2)}</td>
            <td style="color:#5eead4; font-weight:700;">৳${Number(r.total_retail_value).toFixed(2)}</td>
            <td>${r.supplier_name || 'N/A'}</td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="report-printable-area">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #334155; padding-bottom:12px; margin-bottom:16px;">
            <div>
              <h2 style="color:#5eead4; margin-bottom:4px;">📦 Batch Stock & FEFO Expiry Report</h2>
              <span style="font-size:12px; color:#94a3b8;">Generated on: ${new Date().toLocaleString()}</span>
            </div>
            <div style="text-align:right; font-size:12px; color:#94a3b8;">Store: ${state.storeSettings.store_name || 'CureAll Pharmacy'}</div>
          </div>

          <div class="kpi-grid" style="margin-bottom:20px;">
            <div class="kpi-card"><div class="kpi-data"><span class="kpi-label">Active Batches</span><h3>${sum.total_batches}</h3></div></div>
            <div class="kpi-card"><div class="kpi-data"><span class="kpi-label">Total Stock Units</span><h3>${sum.total_units}</h3></div></div>
            <div class="kpi-card warning-kpi"><div class="kpi-data"><span class="kpi-label">Near Expiry (90d)</span><h3>${sum.near_expiry_batches}</h3></div></div>
            <div class="kpi-card danger-kpi"><div class="kpi-data"><span class="kpi-label">Expired Batches</span><h3>${sum.expired_batches}</h3></div></div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch No</th>
                  <th>Expiry Date</th>
                  <th>FEFO Status</th>
                  <th>Qty Left</th>
                  <th>Cost Price</th>
                  <th>Sell Price</th>
                  <th>Retail Value (৳)</th>
                  <th>Supplier</th>
                </tr>
              </thead>
              <tbody>${tableRowsHtml || '<tr><td colspan="9" style="text-align:center; color:#94a3b8;">No stock records found</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      `;

      // Formal B&W PDF Download Trigger
      document.getElementById('btn-download-rep-pdf').onclick = () => {
        const formalRows = rows.map(r => ({
          med_name: `${r.brand_name} ${r.strength ? '(' + r.strength + ')' : ''}`,
          batch_no: r.batch_no,
          expiry_date: r.expiry_date,
          fefo_status: r.days_to_expiry < 0 ? 'EXPIRED' : `${Math.round(r.days_to_expiry)}d`,
          qty_remaining: r.qty_remaining,
          cost_str: `৳${Number(r.cost_price).toFixed(2)}`,
          sell_str: `৳${Number(r.selling_price).toFixed(2)}`,
          retail_str: `৳${Number(r.total_retail_value).toFixed(2)}`,
          supplier_name: r.supplier_name || 'N/A'
        }));

        window.ReceiptEngine.generateFormalReportPdf({
          reportTitle: 'OFFICIAL BATCH STOCK & FEFO EXPIRY REPORT',
          summaryCards: [
            { label: 'Active Batches', value: sum.total_batches },
            { label: 'Total Units', value: sum.total_units },
            { label: 'Near Expiry (90d)', value: sum.near_expiry_batches },
            { label: 'Expired Batches', value: sum.expired_batches }
          ],
          columns: [
            { header: 'Medicine', key: 'med_name', align: 'left' },
            { header: 'Batch No', key: 'batch_no', align: 'left' },
            { header: 'Expiry Date', key: 'expiry_date', align: 'center' },
            { header: 'FEFO Days', key: 'fefo_status', align: 'center' },
            { header: 'Qty Left', key: 'qty_remaining', align: 'center' },
            { header: 'Cost (৳)', key: 'cost_str', align: 'right' },
            { header: 'Sell Price (৳)', key: 'sell_str', align: 'right' },
            { header: 'Retail Value (৳)', key: 'retail_str', align: 'right' },
            { header: 'Supplier', key: 'supplier_name', align: 'left' }
          ],
          rows: formalRows,
          storeSettings: state.storeSettings
        }, `Stock_Inventory_Report_${new Date().toISOString().slice(0,10)}.pdf`);
        showToast('Generating official B&W formal PDF report...', 'info');
      };

    } else if (reportType === 'medstatus') {
      const res = await apiCall('/api/reports/medicine-status');
      const sum = res.summary;
      const rows = res.data;

      let tableRowsHtml = '';
      rows.forEach(m => {
        const badgeClass = m.status === 'In Stock' ? 'badge-green' : (m.status === 'Low Stock' ? 'badge-amber' : 'badge-red');
        tableRowsHtml += `
          <tr>
            <td><code>${m.sku || 'N/A'}</code></td>
            <td><strong>${m.brand_name}</strong></td>
            <td><span class="badge-tag badge-amber">${m.strength || 'N/A'}</span></td>
            <td>${m.generic_name}</td>
            <td>${m.category_name || 'N/A'}</td>
            <td>৳${Number(m.selling_price).toFixed(2)}</td>
            <td>${m.total_stock}</td>
            <td>${m.min_stock_level}</td>
            <td><span class="badge-tag ${badgeClass}">${m.status}</span></td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="report-printable-area">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #334155; padding-bottom:12px; margin-bottom:16px;">
            <div>
              <h2 style="color:#5eead4; margin-bottom:4px;">💊 Medicine Catalog & Availability Status Report</h2>
              <span style="font-size:12px; color:#94a3b8;">Generated on: ${new Date().toLocaleString()}</span>
            </div>
            <div style="text-align:right; font-size:12px; color:#94a3b8;">Store: ${state.storeSettings.store_name || 'CureAll Pharmacy'}</div>
          </div>

          <div class="kpi-grid" style="margin-bottom:20px;">
            <div class="kpi-card"><div class="kpi-data"><span class="kpi-label">Total Medicines</span><h3>${sum.total_medicines}</h3></div></div>
            <div class="kpi-card"><div class="kpi-data"><span class="kpi-label">Optimal Stock</span><h3 style="color:#6ee7b7;">${sum.in_stock}</h3></div></div>
            <div class="kpi-card warning-kpi"><div class="kpi-data"><span class="kpi-label">Low Stock</span><h3>${sum.low_stock}</h3></div></div>
            <div class="kpi-card danger-kpi"><div class="kpi-data"><span class="kpi-label">Out of Stock</span><h3>${sum.out_of_stock}</h3></div></div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Brand Name</th>
                  <th>Dosage (mg)</th>
                  <th>Generic Name</th>
                  <th>Category</th>
                  <th>Selling Price</th>
                  <th>Total Stock</th>
                  <th>Min Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${tableRowsHtml}</tbody>
            </table>
          </div>
        </div>
      `;

      // Formal B&W PDF Download Trigger
      document.getElementById('btn-download-rep-pdf').onclick = () => {
        const formalRows = rows.map(m => ({
          sku: m.sku || 'N/A',
          brand_name: m.brand_name,
          strength: m.strength || 'N/A',
          generic_name: m.generic_name,
          category_name: m.category_name || 'N/A',
          price_str: `৳${Number(m.selling_price).toFixed(2)}`,
          total_stock: m.total_stock,
          min_stock_level: m.min_stock_level,
          status: m.status
        }));

        window.ReceiptEngine.generateFormalReportPdf({
          reportTitle: 'MEDICINE CATALOG & AVAILABILITY STATUS REPORT',
          summaryCards: [
            { label: 'Total Catalog', value: sum.total_medicines },
            { label: 'Optimal Stock', value: sum.in_stock },
            { label: 'Low Stock', value: sum.low_stock },
            { label: 'Out of Stock', value: sum.out_of_stock }
          ],
          columns: [
            { header: 'SKU', key: 'sku', align: 'left' },
            { header: 'Brand Name', key: 'brand_name', align: 'left' },
            { header: 'Dosage (mg)', key: 'strength', align: 'left' },
            { header: 'Generic Name', key: 'generic_name', align: 'left' },
            { header: 'Category', key: 'category_name', align: 'left' },
            { header: 'Price (৳)', key: 'price_str', align: 'right' },
            { header: 'Stock', key: 'total_stock', align: 'center' },
            { header: 'Min Level', key: 'min_stock_level', align: 'center' },
            { header: 'Status', key: 'status', align: 'center' }
          ],
          rows: formalRows,
          storeSettings: state.storeSettings
        }, `Medicine_Catalog_Report_${new Date().toISOString().slice(0,10)}.pdf`);
        showToast('Generating official B&W formal PDF report...', 'info');
      };

    } else if (reportType === 'stocked') {
      const res = await apiCall('/api/reports/currently-stocked');
      const sum = res.summary;
      const rows = res.data;

      let tableRowsHtml = '';
      rows.forEach(r => {
        tableRowsHtml += `
          <tr>
            <td><strong>${r.brand_name}</strong> ${r.strength ? '(' + r.strength + ')' : ''}</td>
            <td>${r.category_name || 'N/A'}</td>
            <td style="font-weight:700; color:#5eead4;">${r.stock_qty}</td>
            <td>৳${Number(r.avg_cost_price || 0).toFixed(2)}</td>
            <td>৳${Number(r.selling_price).toFixed(2)}</td>
            <td>৳${Number(r.total_cost_valuation).toFixed(2)}</td>
            <td>৳${Number(r.total_retail_valuation).toFixed(2)}</td>
            <td style="color:#6ee7b7; font-weight:700;">৳${Number(r.potential_profit).toFixed(2)}</td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="report-printable-area">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #334155; padding-bottom:12px; margin-bottom:16px;">
            <div>
              <h2 style="color:#5eead4; margin-bottom:4px;">📊 Currently Stocked Inventory Valuation Report</h2>
              <span style="font-size:12px; color:#94a3b8;">Generated on: ${new Date().toLocaleString()}</span>
            </div>
            <div style="text-align:right; font-size:12px; color:#94a3b8;">Store: ${state.storeSettings.store_name || 'CureAll Pharmacy'}</div>
          </div>

          <div class="kpi-grid" style="margin-bottom:20px;">
            <div class="kpi-card"><div class="kpi-data"><span class="kpi-label">Stocked Products</span><h3>${sum.stocked_items}</h3></div></div>
            <div class="kpi-card"><div class="kpi-data"><span class="kpi-label">Total Inventory Units</span><h3>${sum.total_units}</h3></div></div>
            <div class="kpi-card"><div class="kpi-data"><span class="kpi-label">Inventory Cost Value</span><h3>৳${sum.total_cost_valuation.toFixed(2)}</h3></div></div>
            <div class="kpi-card"><div class="kpi-data"><span class="kpi-label">Retail Value (Potential)</span><h3 style="color:#5eead4;">৳${sum.total_retail_valuation.toFixed(2)}</h3></div></div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Stock Qty</th>
                  <th>Avg Cost</th>
                  <th>Sell Price</th>
                  <th>Cost Value</th>
                  <th>Retail Value</th>
                  <th>Est. Profit (৳)</th>
                </tr>
              </thead>
              <tbody>${tableRowsHtml || '<tr><td colspan="8" style="text-align:center; color:#94a3b8;">No stocked inventory found</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      `;

      // Formal B&W PDF Download Trigger
      document.getElementById('btn-download-rep-pdf').onclick = () => {
        const formalRows = rows.map(r => ({
          med_name: `${r.brand_name} ${r.strength ? '(' + r.strength + ')' : ''}`,
          category_name: r.category_name || 'N/A',
          stock_qty: r.stock_qty,
          cost_str: `৳${Number(r.avg_cost_price || 0).toFixed(2)}`,
          sell_str: `৳${Number(r.selling_price).toFixed(2)}`,
          cost_val_str: `৳${Number(r.total_cost_valuation).toFixed(2)}`,
          retail_val_str: `৳${Number(r.total_retail_valuation).toFixed(2)}`,
          profit_str: `৳${Number(r.potential_profit).toFixed(2)}`
        }));

        window.ReceiptEngine.generateFormalReportPdf({
          reportTitle: 'CURRENTLY STOCKED INVENTORY VALUATION REPORT',
          summaryCards: [
            { label: 'Stocked Items', value: sum.stocked_items },
            { label: 'Total Units', value: sum.total_units },
            { label: 'Inventory Cost Value', value: `৳${sum.total_cost_valuation.toFixed(2)}` },
            { label: 'Retail Value Potential', value: `৳${sum.total_retail_valuation.toFixed(2)}` }
          ],
          columns: [
            { header: 'Medicine', key: 'med_name', align: 'left' },
            { header: 'Category', key: 'category_name', align: 'left' },
            { header: 'Stock Qty', key: 'stock_qty', align: 'center' },
            { header: 'Avg Cost (৳)', key: 'cost_str', align: 'right' },
            { header: 'Sell Price (৳)', key: 'sell_str', align: 'right' },
            { header: 'Cost Value (৳)', key: 'cost_val_str', align: 'right' },
            { header: 'Retail Value (৳)', key: 'retail_val_str', align: 'right' },
            { header: 'Est. Profit (৳)', key: 'profit_str', align: 'right' }
          ],
          rows: formalRows,
          storeSettings: state.storeSettings
        }, `Inventory_Valuation_Report_${new Date().toISOString().slice(0,10)}.pdf`);
        showToast('Generating official B&W formal PDF report...', 'info');
      };

    } else if (reportType === 'profit') {
      const data = await apiCall('/api/reports/profit-margin');
      let rowsHtml = '';
      data.forEach(r => {
        rowsHtml += `
          <tr>
            <td><strong>${r.brand_name}</strong> ${r.strength ? '(' + r.strength + ')' : ''}</td>
            <td>${r.total_qty_sold}</td>
            <td>৳${Number(r.total_revenue).toFixed(2)}</td>
            <td>৳${Number(r.total_cost).toFixed(2)}</td>
            <td style="color:#6ee7b7; font-weight:700;">৳${Number(r.gross_profit).toFixed(2)}</td>
            <td><span class="badge-tag badge-green">${r.profit_margin_pct}%</span></td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="report-printable-area">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #334155; padding-bottom:12px; margin-bottom:16px;">
            <div>
              <h2 style="color:#5eead4; margin-bottom:4px;">📊 Product Gross Profit Margin Report</h2>
              <span style="font-size:12px; color:#94a3b8;">Generated on: ${new Date().toLocaleString()}</span>
            </div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr><th>Medicine</th><th>Qty Sold</th><th>Revenue</th><th>Cost</th><th>Gross Profit</th><th>Margin %</th></tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('btn-download-rep-pdf').onclick = () => {
        const formalRows = data.map(r => ({
          med_name: `${r.brand_name} ${r.strength ? '(' + r.strength + ')' : ''}`,
          total_qty_sold: r.total_qty_sold,
          rev_str: `৳${Number(r.total_revenue).toFixed(2)}`,
          cost_str: `৳${Number(r.total_cost).toFixed(2)}`,
          profit_str: `৳${Number(r.gross_profit).toFixed(2)}`,
          margin_str: `${r.profit_margin_pct}%`
        }));

        window.ReceiptEngine.generateFormalReportPdf({
          reportTitle: 'PRODUCT GROSS PROFIT MARGIN REPORT',
          columns: [
            { header: 'Medicine', key: 'med_name', align: 'left' },
            { header: 'Qty Sold', key: 'total_qty_sold', align: 'center' },
            { header: 'Revenue (৳)', key: 'rev_str', align: 'right' },
            { header: 'Cost (৳)', key: 'cost_str', align: 'right' },
            { header: 'Gross Profit (৳)', key: 'profit_str', align: 'right' },
            { header: 'Margin %', key: 'margin_str', align: 'center' }
          ],
          rows: formalRows,
          storeSettings: state.storeSettings
        }, `Profit_Margin_Report_${new Date().toISOString().slice(0,10)}.pdf`);
        showToast('Generating official B&W formal PDF report...', 'info');
      };

    } else if (reportType === 'tax') {
      const data = await apiCall('/api/reports/tax-summary');
      let rowsHtml = '';
      data.forEach(r => {
        rowsHtml += `
          <tr>
            <td><strong>VAT ${r.gst_percent}%</strong></td>
            <td>৳${Number(r.taxable_amount).toFixed(2)}</td>
            <td style="color:#5eead4; font-weight:700;">৳${Number(r.total_tax_collected).toFixed(2)}</td>
            <td>${r.sales_count} sales</td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="report-printable-area">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #334155; padding-bottom:12px; margin-bottom:16px;">
            <div>
              <h2 style="color:#5eead4; margin-bottom:4px;">🏛️ VAT Tax Collection Summary</h2>
              <span style="font-size:12px; color:#94a3b8;">Generated on: ${new Date().toLocaleString()}</span>
            </div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr><th>Tax Bracket</th><th>Taxable Amount</th><th>Tax Collected</th><th>Orders Count</th></tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('btn-download-rep-pdf').onclick = () => {
        const formalRows = data.map(r => ({
          tax_bracket: `VAT ${r.gst_percent}%`,
          taxable_str: `৳${Number(r.taxable_amount).toFixed(2)}`,
          tax_str: `৳${Number(r.total_tax_collected).toFixed(2)}`,
          sales_count: r.sales_count
        }));

        window.ReceiptEngine.generateFormalReportPdf({
          reportTitle: 'VAT TAX COLLECTION SUMMARY REPORT',
          columns: [
            { header: 'Tax Bracket', key: 'tax_bracket', align: 'left' },
            { header: 'Taxable Amount (৳)', key: 'taxable_str', align: 'right' },
            { header: 'Tax Collected (৳)', key: 'tax_str', align: 'right' },
            { header: 'Sales Count', key: 'sales_count', align: 'center' }
          ],
          rows: formalRows,
          storeSettings: state.storeSettings
        }, `VAT_Tax_Report_${new Date().toISOString().slice(0,10)}.pdf`);
        showToast('Generating official B&W formal PDF report...', 'info');
      };
    }
  }

  // ==========================================
  // TAB 6: CUSTOMERS
  // ==========================================
  async function loadCustomers() {
    try {
      const customers = await apiCall('/api/customers');
      state.customers = customers;

      renderCustomerTable(customers);

      document.getElementById('btn-add-customer').onclick = () => openCustomerModal();
    } catch (err) {
      console.error(err);
    }
  }

  function renderCustomerTable(list) {
    const tbody = document.getElementById('cust-table-body');
    let html = '';
    list.forEach(c => {
      html += `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.phone || 'N/A'}</td>
          <td>${c.email || 'N/A'}</td>
          <td>${c.address || 'N/A'}</td>
          <td><span class="badge-tag badge-amber">⭐ ${c.loyalty_points || 0}</span></td>
          <td style="color:#5eead4; font-weight:700;">৳${Number(c.total_spent || 0).toFixed(2)}</td>
          <td>
            <button class="btn-sm btn-edit-cust" data-id="${c.id}">Edit</button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;

    tbody.querySelectorAll('.btn-edit-cust').forEach(btn => {
      btn.onclick = () => {
        const cust = state.customers.find(c => c.id == btn.dataset.id);
        openCustomerModal(cust);
      };
    });
  }

  function openCustomerModal(cust = null) {
    DOM.modalTitle.textContent = cust ? `Edit Customer: ${cust.name}` : 'Add New Customer';
    DOM.modalBody.innerHTML = `
      <form id="form-cust-edit">
        <div class="form-group">
          <label>Full Name *</label>
          <input type="text" id="c-name" required class="form-control" value="${cust ? cust.name : ''}">
        </div>
        <div class="form-group">
          <label>Phone Number *</label>
          <input type="tel" id="c-phone" required class="form-control" value="${cust ? cust.phone : ''}">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="c-email" class="form-control" value="${cust ? cust.email || '' : ''}">
        </div>
        <div class="form-group">
          <label>Address</label>
          <input type="text" id="c-address" class="form-control" value="${cust ? cust.address || '' : ''}">
        </div>
        <button type="submit" class="btn-primary" style="width:100%; margin-top:10px;">Save Customer</button>
      </form>
    `;
    DOM.modalOverlay.style.display = 'flex';

    document.getElementById('form-cust-edit').onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('c-name').value,
        phone: document.getElementById('c-phone').value,
        email: document.getElementById('c-email').value,
        address: document.getElementById('c-address').value
      };

      if (cust) {
        await apiCall(`/api/customers/${cust.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast(`Updated customer ${payload.name}`, 'success');
      } else {
        await apiCall('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast(`Created customer ${payload.name}`, 'success');
      }

      DOM.modalOverlay.style.display = 'none';
      await loadCustomers();
    };
  }

  // ==========================================
  // TAB 7: SUPPLIERS
  // ==========================================
  async function loadSuppliers() {
    try {
      const suppliers = await apiCall('/api/suppliers');
      state.suppliers = suppliers;

      const tbody = document.getElementById('supplier-table-body');
      let html = '';
      suppliers.forEach(s => {
        html += `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td>${s.contact_person || 'N/A'}</td>
            <td>${s.phone || 'N/A'}</td>
            <td>${s.email || 'N/A'}</td>
            <td><code>${s.gstin || 'N/A'}</code></td>
            <td>${s.address || 'N/A'}</td>
            <td><button class="btn-sm btn-edit-sup" data-id="${s.id}">Edit</button></td>
          </tr>
        `;
      });
      tbody.innerHTML = html;

      tbody.querySelectorAll('.btn-edit-sup').forEach(btn => {
        btn.onclick = () => {
          const sup = state.suppliers.find(s => s.id == btn.dataset.id);
          openSupplierModal(sup);
        };
      });

      document.getElementById('btn-add-supplier').onclick = () => openSupplierModal();
    } catch (err) {
      console.error(err);
    }
  }

  function openSupplierModal(sup = null) {
    DOM.modalTitle.textContent = sup ? `Edit Supplier: ${sup.name}` : 'Add New Supplier';
    DOM.modalBody.innerHTML = `
      <form id="form-sup-edit">
        <div class="form-group">
          <label>Company / Supplier Name *</label>
          <input type="text" id="s-name" required class="form-control" value="${sup ? sup.name : ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Contact Person</label>
            <input type="text" id="s-contact" class="form-control" value="${sup ? sup.contact_person || '' : ''}">
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" id="s-phone" class="form-control" value="${sup ? sup.phone || '' : ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="s-email" class="form-control" value="${sup ? sup.email || '' : ''}">
          </div>
          <div class="form-group">
            <label>VAT / BIN Tax ID</label>
            <input type="text" id="s-gstin" class="form-control" value="${sup ? sup.gstin || '' : ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Address</label>
          <input type="text" id="s-address" class="form-control" value="${sup ? sup.address || '' : ''}">
        </div>
        <button type="submit" class="btn-primary" style="width:100%; margin-top:10px;">Save Supplier</button>
      </form>
    `;
    DOM.modalOverlay.style.display = 'flex';

    document.getElementById('form-sup-edit').onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('s-name').value,
        contact_person: document.getElementById('s-contact').value,
        phone: document.getElementById('s-phone').value,
        email: document.getElementById('s-email').value,
        gstin: document.getElementById('s-gstin').value,
        address: document.getElementById('s-address').value
      };

      if (sup) {
        await apiCall(`/api/suppliers/${sup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast(`Updated supplier ${payload.name}`, 'success');
      } else {
        await apiCall('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast(`Created supplier ${payload.name}`, 'success');
      }

      DOM.modalOverlay.style.display = 'none';
      await loadSuppliers();
    };
  }

  // ==========================================
  // TAB 8: USER MANAGEMENT
  // ==========================================
  async function loadUsers() {
    try {
      const users = await apiCall('/api/users');
      state.users = users;

      const tbody = document.getElementById('user-table-body');
      let html = '';
      users.forEach(u => {
        html += `
          <tr>
            <td>#${u.id}</td>
            <td><strong>${u.name}</strong></td>
            <td><span class="badge-tag ${u.role === 'admin' ? 'badge-amber' : 'badge-green'}">${String(u.role).toUpperCase()}</span></td>
            <td><code>••••</code></td>
            <td>${u.active ? '<span class="badge-tag badge-green">Active</span>' : '<span class="badge-tag badge-red">Inactive</span>'}</td>
            <td><button class="btn-sm btn-edit-user" data-id="${u.id}">Change PIN / Role</button></td>
          </tr>
        `;
      });
      tbody.innerHTML = html;

      tbody.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.onclick = () => {
          const user = state.users.find(u => u.id == btn.dataset.id);
          openUserModal(user);
        };
      });

      document.getElementById('btn-add-user').onclick = () => openUserModal();
    } catch (err) {
      console.error(err);
    }
  }

  function openUserModal(user = null) {
    DOM.modalTitle.textContent = user ? `Edit User: ${user.name}` : 'Add New Cashier / Admin';
    DOM.modalBody.innerHTML = `
      <form id="form-user-edit">
        <div class="form-group">
          <label>User Full Name *</label>
          <input type="text" id="u-name" required class="form-control" value="${user ? user.name : ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Role *</label>
            <select id="u-role" class="form-control">
              <option value="cashier" ${user && user.role === 'cashier' ? 'selected' : ''}>Cashier (POS Access)</option>
              <option value="admin" ${user && user.role === 'admin' ? 'selected' : ''}>Admin (Full Access)</option>
            </select>
          </div>
          <div class="form-group">
            <label>PIN Code (4-6 digits) *</label>
            <input type="password" id="u-pin" required class="form-control" placeholder="${user ? 'Leave blank to keep current' : 'e.g. 1234'}">
          </div>
        </div>
        <button type="submit" class="btn-primary" style="width:100%; margin-top:10px;">Save User</button>
      </form>
    `;
    DOM.modalOverlay.style.display = 'flex';

    document.getElementById('form-user-edit').onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('u-name').value,
        role: document.getElementById('u-role').value,
        pin: document.getElementById('u-pin').value || undefined
      };

      if (user) {
        await apiCall(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast(`Updated user credentials for ${payload.name}`, 'success');
      } else {
        await apiCall('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast(`Created user ${payload.name}`, 'success');
      }

      DOM.modalOverlay.style.display = 'none';
      await loadUsers();
    };
  }

  // ==========================================
  // TAB 9: STORE SETTINGS & RECEIPT CUSTOMIZER
  // ==========================================
  async function loadSettings() {
    try {
      const settings = await apiCall('/api/settings');
      state.storeSettings = settings;

      document.getElementById('set-store-name').value = settings.store_name || '';
      document.getElementById('set-store-tagline').value = settings.store_tagline || '';
      document.getElementById('set-store-address').value = settings.store_address || '';
      document.getElementById('set-store-phone').value = settings.store_phone || '';
      document.getElementById('set-store-email').value = settings.store_email || '';
      document.getElementById('set-store-gstin').value = settings.store_gstin || '';
      document.getElementById('set-store-dl').value = settings.store_dl_no || '';
      document.getElementById('set-receipt-footer').value = settings.receipt_footer || '';
      document.getElementById('set-header-notice').value = settings.receipt_header_text || '';
      document.getElementById('set-paper-width').value = settings.receipt_paper_width || '80mm';
      document.getElementById('set-logo-width').value = settings.logo_width ? parseInt(settings.logo_width) : 120;

      document.getElementById('set-toggle-logo').checked = settings.show_logo !== '0' && settings.show_logo !== false;
      document.getElementById('set-toggle-cashier').checked = settings.show_cashier !== '0' && settings.show_cashier !== false;
      document.getElementById('set-toggle-customer').checked = settings.show_customer !== '0' && settings.show_customer !== false;
      document.getElementById('set-toggle-batch').checked = settings.show_batch_expiry !== '0' && settings.show_batch_expiry !== false;
      document.getElementById('set-toggle-tax').checked = settings.show_tax_breakdown !== '0' && settings.show_tax_breakdown !== false;
      document.getElementById('set-toggle-barcode').checked = settings.show_barcode !== '0' && settings.show_barcode !== false;

      renderLiveReceiptPreview();

      const formInputs = document.querySelectorAll('#pane-settings input, #pane-settings select, #pane-settings textarea');
      formInputs.forEach(input => {
        input.oninput = () => renderLiveReceiptPreview();
        input.onchange = () => renderLiveReceiptPreview();
      });

      document.getElementById('input-logo-file').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('logo', file);

        const res = await apiCall('/api/settings/logo', {
          method: 'POST',
          body: formData
        });

        state.storeSettings.store_logo = res.logo_url;
        showToast('Logo image uploaded successfully!', 'success');
        renderLiveReceiptPreview();
      };

      document.getElementById('form-store-settings').onsubmit = async (e) => {
        e.preventDefault();
        const payload = collectSettingsFromForm();

        await apiCall('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        showToast('Store & Receipt settings saved successfully!', 'success');
      };

      document.getElementById('btn-test-print-receipt').onclick = () => {
        const currentSettings = collectSettingsFromForm();
        const htmlContent = window.ReceiptEngine.generateThermalReceiptHtml({}, currentSettings);
        window.ReceiptEngine.printThermalReceiptHtml(htmlContent, currentSettings.receipt_paper_width || '80mm');
      };

      document.getElementById('btn-test-download-pdf').onclick = () => {
        const currentSettings = collectSettingsFromForm();
        const htmlContent = window.ReceiptEngine.generateThermalReceiptHtml({}, currentSettings);
        window.ReceiptEngine.downloadReceiptPdfHtml(htmlContent, 'Test_Receipt_Sample.pdf', currentSettings.receipt_paper_width || '80mm');
        showToast('Generating sample PDF receipt download...', 'info');
      };

      document.getElementById('btn-create-backup').onclick = async () => {
        const res = await apiCall('/api/settings/backup/create', { method: 'POST' });
        showToast(`Instant DB backup created: ${res.backup.fileName}`, 'success');
      };

      document.getElementById('btn-download-backup').onclick = () => {
        window.open('/api/settings/backup/download', '_blank');
      };

      document.getElementById('btn-do-restore').onclick = () => {
        const fileInput = document.getElementById('restore-file-input');
        if (!fileInput.files || fileInput.files.length === 0) {
          showToast('Please select a .db backup file to restore.', 'warning');
          return;
        }

        showConfirmModal({
          title: 'Overwrite Database Snapshot',
          message: 'WARNING: Restoring will completely replace the active database with the uploaded backup file. Proceed?',
          confirmText: 'Restore & Reload',
          isDanger: true,
          onConfirm: async () => {
            const formData = new FormData();
            formData.append('backup_file', fileInput.files[0]);
            const res = await apiCall('/api/settings/backup/restore', {
              method: 'POST',
              body: formData
            });
            showToast(res.message, 'success');
            setTimeout(() => window.location.reload(), 1000);
          }
        });
      };
    } catch (err) {
      console.error(err);
    }
  }

  function collectSettingsFromForm() {
    return {
      store_name: document.getElementById('set-store-name').value,
      store_tagline: document.getElementById('set-store-tagline').value,
      store_address: document.getElementById('set-store-address').value,
      store_phone: document.getElementById('set-store-phone').value,
      store_email: document.getElementById('set-store-email').value,
      store_gstin: document.getElementById('set-store-gstin').value,
      store_dl_no: document.getElementById('set-store-dl').value,
      receipt_footer: document.getElementById('set-receipt-footer').value,
      receipt_header_text: document.getElementById('set-header-notice').value,
      receipt_paper_width: document.getElementById('set-paper-width').value,
      logo_width: document.getElementById('set-logo-width').value + 'px',
      store_logo: state.storeSettings.store_logo || '',
      show_logo: document.getElementById('set-toggle-logo').checked ? '1' : '0',
      show_cashier: document.getElementById('set-toggle-cashier').checked ? '1' : '0',
      show_customer: document.getElementById('set-toggle-customer').checked ? '1' : '0',
      show_batch_expiry: document.getElementById('set-toggle-batch').checked ? '1' : '0',
      show_tax_breakdown: document.getElementById('set-toggle-tax').checked ? '1' : '0',
      show_barcode: document.getElementById('set-toggle-barcode').checked ? '1' : '0'
    };
  }

  function renderLiveReceiptPreview() {
    const container = document.getElementById('live-receipt-preview-box');
    if (!container) return;

    const currentSettings = collectSettingsFromForm();
    const sampleSale = {
      invoice_no: 'INV-SAMPLE-2026',
      sale_timestamp: new Date().toISOString(),
      cashier_name: 'Dr. Sarah Jenkins',
      customer_name: 'John Doe',
      customer_phone: '+880 1712-345678',
      items: [
        { brand_name: 'Amoxil 500mg Capsule', strength: '500 mg', generic_name: 'Amoxicillin', batch_no: 'AMX-2024-01', expiry_date: '2026-09-20', qty: 2, unit_price: 10.00, gst_percent: 12, total_amount: 20.00 },
        { brand_name: 'Napa Extend 665mg', strength: '665 mg', generic_name: 'Paracetamol', batch_no: 'NPA-A11', expiry_date: '2026-08-30', qty: 1, unit_price: 3.80, gst_percent: 12, total_amount: 3.80 }
      ],
      subtotal: 23.80,
      discount_amount: 0.00,
      tax_amount: 2.55,
      grand_total: 23.80,
      payment_method: 'CASH',
      cash_given: 30.00,
      change_due: 6.20
    };

    container.innerHTML = window.ReceiptEngine.generateThermalReceiptHtml(sampleSale, currentSettings);
  }

})();
