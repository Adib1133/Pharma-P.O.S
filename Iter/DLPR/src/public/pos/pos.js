/**
 * Offline Pharmacy POS Frontend Application Engine (BDT Currency ৳)
 */

(function () {
  'use strict';

  // Application State
  // FIX #6: activeUser is now null by default. The POS must not allow any
  // transaction until a user authenticates via PIN. Hardcoding a user caused
  // all pre-login sales to be attributed to a specific user without consent.
  const state = {
    activeUser: null,
    registerSession: null,
    cart: [],
    customers: [],
    selectedCustomer: { id: 1, name: 'Walk-in Customer', loyalty_points: 0 },
    discount: 0,
    paymentMethod: 'cash',
    cashGiven: 0,
    heldSales: [],
    pinBuffer: '',
    barcodeBuffer: '',
    barcodeTimer: null,
    activeCategory: 'all',
    storeSettings: {}
  };

  // DOM Elements
  const DOM = {};

  function initDOM() {
    DOM.searchInput = document.getElementById('pos-search-input');
    DOM.searchDropdown = document.getElementById('search-dropdown');
    DOM.btnClearSearch = document.getElementById('btn-clear-search');
    DOM.categoryGrid = document.getElementById('category-grid');
    DOM.quickGrid = document.getElementById('quick-items-grid');
    DOM.cartTableBody = document.getElementById('cart-table-body');
    DOM.cartItemCount = document.getElementById('cart-item-count');
    DOM.btnClearCart = document.getElementById('btn-clear-cart');
    DOM.custSelect = document.getElementById('cust-select');
    DOM.btnQuickCust = document.getElementById('btn-quick-cust');
    DOM.custLoyaltyInfo = document.getElementById('cust-loyalty-info');
    DOM.custPointsVal = document.getElementById('cust-points-val');
    DOM.sumSubtotal = document.getElementById('sum-subtotal');
    DOM.sumTax = document.getElementById('sum-tax');
    DOM.inputDiscount = document.getElementById('input-discount');
    DOM.sumGrandTotal = document.getElementById('sum-grand-total');
    DOM.inputCashGiven = document.getElementById('input-cash-given');
    DOM.valChangeDue = document.getElementById('val-change-due');
    DOM.inputCardRef = document.getElementById('input-card-ref');
    DOM.inputWalletRef = document.getElementById('input-wallet-ref');
    DOM.btnHoldCart = document.getElementById('btn-hold-cart');
    DOM.btnCompletePay = document.getElementById('btn-complete-pay');
    DOM.btnPayAmount = document.getElementById('btn-pay-amount');
    DOM.activeCashierName = document.getElementById('active-cashier-name');
    DOM.btnLockPos = document.getElementById('btn-lock-pos');
    DOM.btnHeldSales = document.getElementById('btn-held-sales');
    DOM.heldCountBadge = document.getElementById('held-count-badge');
    DOM.btnRegisterMgr = document.getElementById('btn-register-mgr');
    DOM.regStatusIcon = document.getElementById('reg-status-icon');
    DOM.regStatusText = document.getElementById('reg-status-text');
    DOM.clockDisplay = document.getElementById('clock-display');

    // Modals
    DOM.modalPinLogin = document.getElementById('modal-pin-login');
    DOM.pinDisplay = document.getElementById('pin-display');
    DOM.pinErrorMsg = document.getElementById('pin-error-msg');
    DOM.modalBatchSelector = document.getElementById('modal-batch-selector');
    DOM.batchModalTitle = document.getElementById('batch-modal-med-title');
    DOM.batchModalList = document.getElementById('batch-modal-list');
    DOM.btnCloseBatchModal = document.getElementById('btn-close-batch-modal');
    DOM.modalHeldSales = document.getElementById('modal-held-sales');
    DOM.heldSalesContainer = document.getElementById('held-sales-list-container');
    DOM.btnCloseHeldModal = document.getElementById('btn-close-held-modal');
    DOM.modalRegisterMgr = document.getElementById('modal-register-mgr');
    DOM.regModalTitle = document.getElementById('reg-modal-title');
    DOM.regModalBody = document.getElementById('reg-modal-body');
    DOM.btnCloseRegModal = document.getElementById('btn-close-reg-modal');
    DOM.modalQuickCust = document.getElementById('modal-quick-cust');
    DOM.formQuickCust = document.getElementById('form-quick-cust');
    DOM.btnCloseCustModal = document.getElementById('btn-close-cust-modal');
    DOM.modalReceiptPreview = document.getElementById('modal-receipt-preview');
    DOM.receiptPaperContent = document.getElementById('receipt-paper-content');
    DOM.btnCloseReceiptModal = document.getElementById('btn-close-receipt-modal');
    DOM.btnDoPrint = document.getElementById('btn-do-print');
    DOM.btnDownloadPdf = document.getElementById('btn-download-pdf');
    DOM.btnDownloadEscpos = document.getElementById('btn-download-escpos');
    DOM.btnStartNewSale = document.getElementById('btn-start-new-sale');
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

  // Global Unhandled Error Interceptors
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

  // Application Entry
  document.addEventListener('DOMContentLoaded', async () => {
    initDOM();
    startClock();
    setupEventListeners();
    setupBarcodeWedgeListener();
    setupPhysicalKeyboardPinListener();

    await loadSettings();
    await loadCategories();
    await loadQuickMedicines();
    await loadCustomers();
    await checkRegisterSession();
    await updateHeldCount();

    // FIX #6: Show PIN login immediately on startup — no transactions
    // are allowed until a real user authenticates.
    state.pinBuffer = '';
    DOM.pinDisplay.textContent = '——';
    DOM.pinErrorMsg.textContent = '';
    DOM.activeCashierName.textContent = 'Not Logged In';
    DOM.modalPinLogin.style.display = 'flex';
  });

  function startClock() {
    setInterval(() => {
      const now = new Date();
      DOM.clockDisplay.textContent = now.toLocaleTimeString();
    }, 1000);
  }

  async function loadSettings() {
    try {
      state.storeSettings = await fetchApi('/api/settings');
      if (state.storeSettings.store_name) {
        document.getElementById('hdr-store-name').textContent = state.storeSettings.store_name;
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Physical Keyboard Input Listener for PIN Modal
  // FIX #20: PIN display now starts empty ('——') instead of pre-filling
  // '••••', which falsely implied 4 digits were already entered.
  function setupPhysicalKeyboardPinListener() {
    window.addEventListener('keydown', (e) => {
      if (DOM.modalPinLogin.style.display !== 'none' && DOM.modalPinLogin.style.display !== '') {
        if (e.key >= '0' && e.key <= '9') {
          if (state.pinBuffer.length < 6) {
            state.pinBuffer += e.key;
            DOM.pinDisplay.textContent = '•'.repeat(state.pinBuffer.length);
          }
        } else if (e.key === 'Backspace') {
          state.pinBuffer = state.pinBuffer.slice(0, -1);
          DOM.pinDisplay.textContent = state.pinBuffer ? '•'.repeat(state.pinBuffer.length) : '——';
        } else if (e.key === 'Enter') {
          document.getElementById('btn-pin-submit').click();
        } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
          state.pinBuffer = '';
          DOM.pinDisplay.textContent = '——';
        }
      }
    });
  }

  function setupBarcodeWedgeListener() {
    window.addEventListener('keydown', (e) => {
      if (DOM.modalPinLogin.style.display !== 'none' && DOM.modalPinLogin.style.display !== '') return;

      // FIX #18: Skip barcode capture when user is typing in ANY focusable
      // form element (INPUT, TEXTAREA, SELECT), not just non-search inputs.
      // Previously, typing in a textarea or select would be swallowed as barcode chars.
      const activeEl = document.activeElement;
      if (activeEl) {
        const tag = activeEl.tagName;
        if ((tag === 'INPUT' && activeEl.id !== 'pos-search-input') ||
             tag === 'TEXTAREA' ||
             tag === 'SELECT') {
          return;
        }
      }

      if (e.key === 'Enter') {
        if (state.barcodeBuffer.length >= 3) {
          const barcode = state.barcodeBuffer.trim();
          state.barcodeBuffer = '';
          handleBarcodeScan(barcode);
        }
      } else if (e.key.length === 1) {
        state.barcodeBuffer += e.key;
        clearTimeout(state.barcodeTimer);
        state.barcodeTimer = setTimeout(() => {
          state.barcodeBuffer = '';
        }, 100);
      }
    });
  }

  async function handleBarcodeScan(code) {
    try {
      const res = await fetch(`/api/medicines/search?q=${encodeURIComponent(code)}`);
      const meds = await res.json();
      if (meds && meds.length > 0) {
        await addMedicineToCart(meds[0]);
        showToast(`Scanned & added: ${meds[0].brand_name}`, 'success');
      } else {
        showToast(`No medicine found matching barcode: ${code}`, 'warning');
      }
    } catch (err) {
      console.error('Barcode lookup error:', err);
    }
  }

  async function fetchApi(url, options = {}) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred');
      }
      return data;
    } catch (err) {
      showToast(`API Error: ${err.message}`, 'error');
      throw err;
    }
  }

  async function loadCategories() {
    try {
      const categories = await fetchApi('/api/medicines/categories');
      let html = `<button class="cat-chip active" data-cat-id="all">All Items</button>`;
      categories.forEach(c => {
        html += `<button class="cat-chip" data-cat-id="${c.id}">${c.name}</button>`;
      });
      DOM.categoryGrid.innerHTML = html;

      DOM.categoryGrid.querySelectorAll('.cat-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          DOM.categoryGrid.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          state.activeCategory = chip.dataset.catId;
          loadQuickMedicines(state.activeCategory);
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function loadQuickMedicines(catId = 'all') {
    try {
      let url = '/api/medicines/search?q=';
      const meds = await fetchApi(url);
      
      const filtered = catId === 'all' ? meds : meds.filter(m => m.category_id == catId);
      
      let html = '';
      filtered.slice(0, 12).forEach(m => {
        const str = m.strength ? ` (${m.strength})` : '';
        html += `
          <div class="item-card" data-med-id="${m.id}">
            <div>
              <div class="item-card-name">${m.brand_name}${str}</div>
              <div class="item-card-generic">${m.generic_name}</div>
            </div>
            <div class="item-card-footer">
              <span class="item-card-price">৳${Number(m.selling_price).toFixed(2)}</span>
              <span class="item-card-stock">${m.total_stock} in stock</span>
            </div>
          </div>
        `;
      });
      DOM.quickGrid.innerHTML = html || '<div style="grid-column: span 2; padding: 20px; color: #94a3b8; text-align: center;">No items found</div>';

      DOM.quickGrid.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', async () => {
          const medId = card.dataset.medId;
          const med = meds.find(m => m.id == medId);
          if (med) await addMedicineToCart(med);
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function loadCustomers() {
    try {
      const customers = await fetchApi('/api/customers');
      state.customers = customers;
      let html = '';
      customers.forEach(c => {
        html += `<option value="${c.id}">${c.name} ${c.phone ? '(' + c.phone + ')' : ''}</option>`;
      });
      DOM.custSelect.innerHTML = html;
      DOM.custSelect.value = state.selectedCustomer.id;
    } catch (err) {
      console.error(err);
    }
  }

  async function checkRegisterSession() {
    try {
      const res = await fetch(`/api/register/current?cashier_id=${state.activeUser.id}`);
      const data = await res.json();
      if (data.isOpen) {
        state.registerSession = data.session;
        DOM.regStatusIcon.textContent = '🟢';
        DOM.regStatusText.textContent = 'Register Open';
      } else {
        state.registerSession = null;
        DOM.regStatusIcon.textContent = '🔴';
        DOM.regStatusText.textContent = 'Register Closed';
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function addMedicineToCart(med) {
    try {
      const fefoRes = await fetchApi(`/api/stock/fefo/${med.id}`);
      const recommendedBatch = fefoRes.recommendedBatch;

      if (!recommendedBatch) {
        showAlertModal({
          title: 'Stock Unavailable',
          message: `Cannot add ${med.brand_name}: No active stock batch available in inventory!`,
          type: 'warning',
          icon: '📦'
        });
        return;
      }

      const existingIdx = state.cart.findIndex(i => i.medicine_id === med.id && i.batch_id === recommendedBatch.id);

      if (existingIdx > -1) {
        if (state.cart[existingIdx].qty + 1 > recommendedBatch.qty_remaining) {
          showToast(`Stock limit reached! Max available for batch ${recommendedBatch.batch_no} is ${recommendedBatch.qty_remaining}`, 'warning');
          return;
        }
        state.cart[existingIdx].qty += 1;
        state.cart[existingIdx].total_amount = state.cart[existingIdx].qty * state.cart[existingIdx].unit_price;
      } else {
        state.cart.push({
          medicine_id: med.id,
          brand_name: med.brand_name,
          generic_name: med.generic_name,
          strength: med.strength || '',
          unit_price: Number(med.selling_price),
          qty: 1,
          batch_id: recommendedBatch.id,
          batch_no: recommendedBatch.batch_no,
          expiry_date: recommendedBatch.expiry_date,
          available_stock: recommendedBatch.qty_remaining,
          all_batches: fefoRes.allBatches,
          gst_percent: Number(med.gst_percent || 12),
          gst_amount: (Number(med.selling_price) * (Number(med.gst_percent || 12) / 100)),
          total_amount: Number(med.selling_price)
        });
      }

      renderCart();
    } catch (err) {
      console.error('Add to cart error:', err);
    }
  }

  function renderCart() {
    if (state.cart.length === 0) {
      DOM.cartTableBody.innerHTML = `
        <tr class="empty-cart-row">
          <td colspan="5">
            <div class="empty-cart-state">
              <span class="empty-icon">💊</span>
              <p>Cart is currently empty</p>
              <small>Scan a barcode or search items on the left panel.</small>
            </div>
          </td>
        </tr>
      `;
      DOM.cartItemCount.textContent = '0 items';
      updateBillTotals();
      return;
    }

    let html = '';
    let totalItemsCount = 0;

    state.cart.forEach((item, index) => {
      totalItemsCount += item.qty;
      const str = item.strength ? ` (${item.strength})` : '';
      html += `
        <tr>
          <td>
            <div class="cart-med-name">${item.brand_name}${str}</div>
            <div class="cart-med-sub">${item.generic_name}</div>
          </td>
          <td>
            <button class="batch-badge-btn" data-cart-index="${index}" title="Click to manually choose batch">
              <span>Batch: ${item.batch_no}</span>
              <small style="opacity: 0.8;">Exp: ${item.expiry_date}</small>
            </button>
          </td>
          <td>
            <div class="qty-control">
              <button class="btn-qty btn-minus" data-index="${index}">-</button>
              <input type="number" value="${item.qty}" min="1" max="${item.available_stock}" class="qty-input" data-index="${index}">
              <button class="btn-qty btn-plus" data-index="${index}">+</button>
            </div>
          </td>
          <td style="font-weight: 700; color: #5eead4;">
            ৳${Number(item.total_amount).toFixed(2)}
          </td>
          <td>
            <button class="btn-remove-row" data-index="${index}">×</button>
          </td>
        </tr>
      `;
    });

    DOM.cartTableBody.innerHTML = html;
    DOM.cartItemCount.textContent = `${totalItemsCount} items`;

    DOM.cartTableBody.querySelectorAll('.btn-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.index;
        if (state.cart[idx].qty > 1) {
          state.cart[idx].qty -= 1;
          // FIX #9: Recalculate gst_amount whenever qty changes.
          // Previously only total_amount was updated, leaving gst_amount
          // stale at its original qty=1 value, corrupting tax data on checkout.
          state.cart[idx].total_amount = state.cart[idx].qty * state.cart[idx].unit_price;
          state.cart[idx].gst_amount = state.cart[idx].total_amount * (state.cart[idx].gst_percent / (100 + state.cart[idx].gst_percent));
          renderCart();
        }
      });
    });

    DOM.cartTableBody.querySelectorAll('.btn-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.index;
        if (state.cart[idx].qty < state.cart[idx].available_stock) {
          state.cart[idx].qty += 1;
          // FIX #9: Recalculate gst_amount on qty increase
          state.cart[idx].total_amount = state.cart[idx].qty * state.cart[idx].unit_price;
          state.cart[idx].gst_amount = state.cart[idx].total_amount * (state.cart[idx].gst_percent / (100 + state.cart[idx].gst_percent));
          renderCart();
        } else {
          showToast(`Max stock for batch ${state.cart[idx].batch_no} is ${state.cart[idx].available_stock}`, 'warning');
        }
      });
    });

    DOM.cartTableBody.querySelectorAll('.qty-input').forEach(input => {
      input.addEventListener('change', () => {
        const idx = input.dataset.index;
        let val = parseInt(input.value) || 1;
        if (val > state.cart[idx].available_stock) {
          val = state.cart[idx].available_stock;
          showToast(`Stock limit is ${state.cart[idx].available_stock}`, 'warning');
        }
        state.cart[idx].qty = Math.max(1, val);
        // FIX #9: Recalculate gst_amount on direct qty input change
        state.cart[idx].total_amount = state.cart[idx].qty * state.cart[idx].unit_price;
        state.cart[idx].gst_amount = state.cart[idx].total_amount * (state.cart[idx].gst_percent / (100 + state.cart[idx].gst_percent));
        renderCart();
      });
    });

    DOM.cartTableBody.querySelectorAll('.btn-remove-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.index;
        state.cart.splice(idx, 1);
        renderCart();
      });
    });

    DOM.cartTableBody.querySelectorAll('.batch-badge-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.cartIndex;
        openBatchSelectorModal(idx);
      });
    });

    updateBillTotals();
  }

  function updateBillTotals() {
    let subtotal = 0;
    let taxTotal = 0;

    state.cart.forEach(item => {
      subtotal += item.total_amount;
      const itemGst = item.total_amount * (item.gst_percent / (100 + item.gst_percent));
      taxTotal += itemGst;
    });

    const discountVal = parseFloat(DOM.inputDiscount.value) || 0;
    const grandTotal = Math.max(0, subtotal - discountVal);

    DOM.sumSubtotal.textContent = `৳${subtotal.toFixed(2)}`;
    DOM.sumTax.textContent = `৳${taxTotal.toFixed(2)}`;
    DOM.sumGrandTotal.textContent = `৳${grandTotal.toFixed(2)}`;
    DOM.btnPayAmount.textContent = `৳${grandTotal.toFixed(2)}`;

    if (state.paymentMethod === 'cash') {
      const rawCashVal = DOM.inputCashGiven.value.trim();
      if (rawCashVal === '') {
        DOM.valChangeDue.textContent = '৳0.00';
      } else {
        const cashGiven = parseFloat(rawCashVal) || 0;
        const changeDue = Math.max(0, cashGiven - grandTotal);
        DOM.valChangeDue.textContent = `৳${changeDue.toFixed(2)}`;
      }
    }
  }

  function openBatchSelectorModal(cartIndex) {
    const item = state.cart[cartIndex];
    if (!item || !item.all_batches || item.all_batches.length === 0) return;

    DOM.batchModalTitle.textContent = `Select Batch for ${item.brand_name}`;
    let html = '';

    item.all_batches.forEach(b => {
      const isCurrent = b.id === item.batch_id;
      html += `
        <div class="batch-card-option ${isCurrent ? 'recommended' : ''}" data-batch-id="${b.id}">
          <div>
            <strong>Batch No: ${b.batch_no}</strong> ${isCurrent ? '<span style="color:#5eead4; font-size:11px;">(Selected FEFO)</span>' : ''}
            <div style="font-size:12px; color:#94a3b8; margin-top:2px;">
              Expiry: <strong>${b.expiry_date}</strong> | Supplier: ${b.supplier_name || 'N/A'}
            </div>
          </div>
          <div style="text-align:right;">
            <strong style="color:#5eead4;">Qty: ${b.qty_remaining}</strong>
          </div>
        </div>
      `;
    });

    DOM.batchModalList.innerHTML = html;
    DOM.modalBatchSelector.style.display = 'flex';

    DOM.batchModalList.querySelectorAll('.batch-card-option').forEach(card => {
      card.addEventListener('click', () => {
        const batchId = parseInt(card.dataset.batchId);
        const selectedBatch = item.all_batches.find(b => b.id === batchId);
        if (selectedBatch) {
          state.cart[cartIndex].batch_id = selectedBatch.id;
          state.cart[cartIndex].batch_no = selectedBatch.batch_no;
          state.cart[cartIndex].expiry_date = selectedBatch.expiry_date;
          state.cart[cartIndex].available_stock = selectedBatch.qty_remaining;
          if (state.cart[cartIndex].qty > selectedBatch.qty_remaining) {
            state.cart[cartIndex].qty = selectedBatch.qty_remaining;
            state.cart[cartIndex].total_amount = state.cart[cartIndex].qty * state.cart[cartIndex].unit_price;
          }
          renderCart();
          showToast(`Switched to Batch ${selectedBatch.batch_no}`, 'info');
        }
        DOM.modalBatchSelector.style.display = 'none';
      });
    });
  }

  function setupEventListeners() {
    let searchTimeout = null;
    DOM.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      if (query.length < 2) {
        DOM.searchDropdown.style.display = 'none';
        return;
      }

      searchTimeout = setTimeout(async () => {
        try {
          const res = await fetch(`/api/medicines/search?q=${encodeURIComponent(query)}`);
          const meds = await res.json();
          if (meds && meds.length > 0) {
            let html = '';
            meds.forEach(m => {
              const str = m.strength ? ` (${m.strength})` : '';
              html += `
                <div class="search-item-row" data-med-id="${m.id}">
                  <div>
                    <div class="search-item-title">${m.brand_name}${str}</div>
                    <div class="search-item-sub">${m.generic_name} | SKU: ${m.sku || 'N/A'}</div>
                  </div>
                  <div class="search-item-price">৳${Number(m.selling_price).toFixed(2)}</div>
                </div>
              `;
            });
            DOM.searchDropdown.innerHTML = html;
            DOM.searchDropdown.style.display = 'block';

            DOM.searchDropdown.querySelectorAll('.search-item-row').forEach(row => {
              row.addEventListener('click', async () => {
                const medId = row.dataset.medId;
                const med = meds.find(m => m.id == medId);
                if (med) await addMedicineToCart(med);
                DOM.searchDropdown.style.display = 'none';
                DOM.searchInput.value = '';
              });
            });
          } else {
            DOM.searchDropdown.style.display = 'none';
          }
        } catch (err) {
          console.error(err);
        }
      }, 200);
    });

    DOM.btnClearSearch.addEventListener('click', () => {
      DOM.searchInput.value = '';
      DOM.searchDropdown.style.display = 'none';
    });

    DOM.btnClearCart.addEventListener('click', () => {
      if (state.cart.length === 0) return;
      showConfirmModal({
        title: 'Clear Cart',
        message: 'Are you sure you want to remove all items from the current cart?',
        confirmText: 'Clear Cart',
        isDanger: true,
        onConfirm: () => {
          state.cart = [];
          renderCart();
          showToast('Cart cleared', 'info');
        }
      });
    });

    DOM.inputDiscount.addEventListener('input', updateBillTotals);
    DOM.inputCashGiven.addEventListener('input', updateBillTotals);

    document.querySelectorAll('.btn-qcash').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        const subtotal = parseFloat(DOM.sumSubtotal.textContent.replace('৳', '')) || 0;
        const discount = parseFloat(DOM.inputDiscount.value) || 0;
        const grandTotal = Math.max(0, subtotal - discount);

        if (val === 'exact') {
          DOM.inputCashGiven.value = grandTotal.toFixed(2);
        } else {
          DOM.inputCashGiven.value = parseFloat(val).toFixed(2);
        }
        updateBillTotals();
      });
    });

    document.querySelectorAll('.pay-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.paymentMethod = tab.dataset.mode;

        document.querySelectorAll('.pay-pane').forEach(p => p.style.display = 'none');
        document.getElementById(`pane-${state.paymentMethod}`).style.display = 'block';
        updateBillTotals();
      });
    });

    DOM.custSelect.addEventListener('change', (e) => {
      const custId = parseInt(e.target.value);
      const cust = state.customers.find(c => c.id === custId);
      if (cust) {
        state.selectedCustomer = cust;
        if (cust.id > 1) {
          DOM.custLoyaltyInfo.style.display = 'block';
          DOM.custPointsVal.textContent = cust.loyalty_points || 0;
        } else {
          DOM.custLoyaltyInfo.style.display = 'none';
        }
      }
    });

    DOM.btnQuickCust.addEventListener('click', () => {
      DOM.modalQuickCust.style.display = 'flex';
    });
    DOM.btnCloseCustModal.addEventListener('click', () => {
      DOM.modalQuickCust.style.display = 'none';
    });

    DOM.formQuickCust.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const name = document.getElementById('cust-new-name').value;
        const phone = document.getElementById('cust-new-phone').value;
        const address = document.getElementById('cust-new-address').value;

        const newCust = await fetchApi('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone: phone || null, address })
        });

        // FIX #26: loadCustomers() rebuilds the <select> DOM. Set .value
        // and dispatch the change event AFTER awaiting the load so the new
        // <option> actually exists in the DOM before we try to select it.
        await loadCustomers();
        // Small tick to allow DOM repaint after innerHTML update
        await new Promise(r => setTimeout(r, 0));
        DOM.custSelect.value = newCust.id;
        DOM.custSelect.dispatchEvent(new Event('change'));
        DOM.modalQuickCust.style.display = 'none';
        DOM.formQuickCust.reset();
        showToast(`Customer ${name} added successfully!`, 'success');
      } catch (err) {
        console.error(err);
      }
    });

    DOM.btnHoldCart.addEventListener('click', async () => {
      if (state.cart.length === 0) {
        showToast('Cannot hold an empty cart!', 'warning');
        return;
      }

      try {
        await fetchApi('/api/sales/held', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cashier_id: state.activeUser.id,
            customer_name: state.selectedCustomer.name,
            cart_data: state.cart
          })
        });

        state.cart = [];
        renderCart();
        await updateHeldCount();
        showToast('Sale placed on hold successfully!', 'success');
      } catch (err) {
        console.error(err);
      }
    });

    DOM.btnHeldSales.addEventListener('click', openHeldSalesModal);
    DOM.btnCloseHeldModal.addEventListener('click', () => {
      DOM.modalHeldSales.style.display = 'none';
    });

    DOM.btnRegisterMgr.addEventListener('click', openRegisterMgrModal);
    DOM.btnCloseRegModal.addEventListener('click', () => {
      DOM.modalRegisterMgr.style.display = 'none';
    });

    DOM.btnCompletePay.addEventListener('click', async () => {
      if (state.cart.length === 0) {
        showToast('Cart is empty!', 'warning');
        return;
      }

      // FIX #6: Block checkout if no user is authenticated
      if (!state.activeUser) {
        showAlertModal({
          title: 'Authentication Required',
          message: 'Please log in with your PIN before processing any sale.',
          type: 'warning',
          icon: '🔐',
          onConfirm: () => {
            state.pinBuffer = '';
            DOM.pinDisplay.textContent = '——';
            DOM.pinErrorMsg.textContent = '';
            DOM.modalPinLogin.style.display = 'flex';
          }
        });
        return;
      }

      if (!state.registerSession) {
        showAlertModal({
          title: 'Register Closed',
          message: 'Please open a Cash Register Session before processing sales transactions!',
          type: 'warning',
          icon: '🟢',
          onConfirm: () => openRegisterMgrModal()
        });
        return;
      }

      const subtotal = parseFloat(DOM.sumSubtotal.textContent.replace('৳', '')) || 0;
      const discount = parseFloat(DOM.inputDiscount.value) || 0;
      const taxAmount = parseFloat(DOM.sumTax.textContent.replace('৳', '')) || 0;
      const grandTotal = Math.max(0, subtotal - discount);

      // FIX #16: Warn if discount wipes out the entire cart value
      if (discount > 0 && discount >= subtotal) {
        showAlertModal({
          title: 'Discount Exceeds Subtotal',
          message: `The discount (৳${discount.toFixed(2)}) is equal to or greater than the cart subtotal (৳${subtotal.toFixed(2)}). The grand total will be ৳0.00. Are you sure?`,
          type: 'warning',
          icon: '⚠️'
        });
        return;
      }

      let cashGiven = grandTotal;
      let changeDue = 0;
      let payDetails = {};

      if (state.paymentMethod === 'cash') {
        const rawCash = DOM.inputCashGiven.value.trim();
        cashGiven = rawCash === '' ? 0 : (parseFloat(rawCash) || 0);
        if (cashGiven < grandTotal) {
          showToast(`Cash tendered (৳${cashGiven.toFixed(2)}) is less than total (৳${grandTotal.toFixed(2)})`, 'warning');
          return;
        }
        changeDue = cashGiven - grandTotal;
        payDetails = { mode: 'cash', cashGiven, changeDue };
      } else if (state.paymentMethod === 'card') {
        payDetails = { mode: 'card', ref: DOM.inputCardRef.value || 'N/A' };
      } else if (state.paymentMethod === 'wallet') {
        payDetails = { mode: 'wallet', ref: DOM.inputWalletRef.value || 'N/A' };
      }

      // FIX #25: Disable checkout button during API call to prevent double-submit.
      DOM.btnCompletePay.disabled = true;
      DOM.btnCompletePay.textContent = 'Processing...';

      try {
        const payload = {
          cashier_id: state.activeUser.id,
          customer_id: state.selectedCustomer.id,
          items: state.cart,
          subtotal,
          discount_amount: discount,
          tax_amount: taxAmount,
          grand_total: grandTotal,
          payment_method: state.paymentMethod,
          payment_details: payDetails,
          cash_given: cashGiven,
          change_due: changeDue
        };

        const checkoutRes = await fetchApi('/api/sales/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (checkoutRes.success) {
          showToast(`Checkout completed! Invoice: ${checkoutRes.sale.invoice_no}`, 'success');
          await showReceiptModal(checkoutRes.sale.id);
          state.cart = [];
          renderCart();
          DOM.inputDiscount.value = '0.00';
          DOM.inputCashGiven.value = '';
          await loadQuickMedicines(state.activeCategory);
        }
      } catch (err) {
        console.error('Checkout failed:', err);
      } finally {
        // FIX #25: Re-enable button regardless of success or failure
        DOM.btnCompletePay.disabled = false;
        DOM.btnCompletePay.textContent = 'Complete Payment';
      }
    });

    DOM.btnLockPos.addEventListener('click', () => {
      state.pinBuffer = '';
      // FIX #20: Show empty indicator instead of pre-filling 4 dots
      DOM.pinDisplay.textContent = '——';
      DOM.pinErrorMsg.textContent = '';
      DOM.modalPinLogin.style.display = 'flex';
    });

    document.querySelectorAll('.btn-pin').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = btn.dataset.num;
        if (num === 'C') {
          state.pinBuffer = '';
        } else if (num !== undefined) {
          if (state.pinBuffer.length < 6) state.pinBuffer += num;
        }
        // FIX #20: Show '——' when buffer is empty instead of pre-filled '••••'
        DOM.pinDisplay.textContent = state.pinBuffer ? '•'.repeat(state.pinBuffer.length) : '——';
      });
    });

    document.getElementById('btn-pin-submit').addEventListener('click', async () => {
      if (!state.pinBuffer) return;
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: state.pinBuffer })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          state.activeUser = data.user;
          DOM.activeCashierName.textContent = data.user.name;
          DOM.modalPinLogin.style.display = 'none';
          state.pinBuffer = '';
          showToast(`Authenticated as ${data.user.name} (${data.user.role})`, 'success');
          await checkRegisterSession();
        } else {
          DOM.pinErrorMsg.textContent = data.error || 'Invalid PIN';
          state.pinBuffer = '';
          // FIX #20: Reset to empty indicator, not pre-filled dots
          DOM.pinDisplay.textContent = '——';
        }
      } catch (err) {
        console.error(err);
      }
    });

    DOM.btnCloseBatchModal.addEventListener('click', () => DOM.modalBatchSelector.style.display = 'none');
    DOM.btnCloseReceiptModal.addEventListener('click', () => DOM.modalReceiptPreview.style.display = 'none');
    DOM.btnStartNewSale.addEventListener('click', () => DOM.modalReceiptPreview.style.display = 'none');
  }

  async function updateHeldCount() {
    try {
      const res = await fetch('/api/sales/held/list');
      const list = await res.json();
      state.heldSales = list;
      DOM.heldCountBadge.textContent = list.length;
    } catch (err) {
      console.error(err);
    }
  }

  async function openHeldSalesModal() {
    await updateHeldCount();
    if (state.heldSales.length === 0) {
      DOM.heldSalesContainer.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">No held sales found.</p>';
    } else {
      let html = '';
      state.heldSales.forEach(h => {
        const items = JSON.parse(h.cart_data);
        html += `
          <div class="batch-card-option" style="margin-bottom:10px;">
            <div>
              <strong>Hold #${h.id} - ${h.customer_name}</strong>
              <div style="font-size:12px; color:#94a3b8;">${items.length} items | Held by: ${h.cashier_name || 'Cashier'} at ${new Date(h.created_at).toLocaleTimeString()}</div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn-qcash btn-recall-held" data-id="${h.id}">Recall Cart</button>
              <button class="btn-remove-row btn-del-held" data-id="${h.id}">×</button>
            </div>
          </div>
        `;
      });
      DOM.heldSalesContainer.innerHTML = html;

      DOM.heldSalesContainer.querySelectorAll('.btn-recall-held').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.dataset.id);
          const held = state.heldSales.find(h => h.id === id);
          if (held) {
            state.cart = JSON.parse(held.cart_data);
            renderCart();
            fetch(`/api/sales/held/${id}`, { method: 'DELETE' });
            DOM.modalHeldSales.style.display = 'none';
            updateHeldCount();
            showToast('Recalled held sale to cart', 'info');
          }
        });
      });

      DOM.heldSalesContainer.querySelectorAll('.btn-del-held').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = parseInt(btn.dataset.id);
          await fetch(`/api/sales/held/${id}`, { method: 'DELETE' });
          await openHeldSalesModal();
        });
      });
    }
    DOM.modalHeldSales.style.display = 'flex';
  }

  async function openRegisterMgrModal() {
    await checkRegisterSession();
    if (state.registerSession) {
      DOM.regModalTitle.textContent = 'Close Daily Cash Register Session';
      DOM.regModalBody.innerHTML = `
        <div style="font-size:14px; line-height:1.6; margin-bottom:16px;">
          <p><strong>Opened At:</strong> ${new Date(state.registerSession.opened_at).toLocaleString()}</p>
          <p><strong>Opening Float:</strong> ৳${Number(state.registerSession.opening_balance).toFixed(2)}</p>
          <p><strong>Cash Sales Total:</strong> ৳${Number(state.registerSession.cash_sales).toFixed(2)}</p>
          <p><strong>Expected Cash in Drawer:</strong> <span style="color:#5eead4; font-weight:700;">৳${Number(state.registerSession.expected_cash).toFixed(2)}</span></p>
        </div>
        <form id="form-close-reg">
          <div class="field-group" style="margin-bottom:12px;">
            <label>Actual Cash Count in Drawer (BDT) *</label>
            <input type="number" id="input-close-actual" step="0.5" required class="pos-input" value="${Number(state.registerSession.expected_cash).toFixed(2)}">
          </div>
          <div class="field-group" style="margin-bottom:16px;">
            <label>Closing Notes / Variance Reason</label>
            <input type="text" id="input-close-notes" class="pos-input" placeholder="e.g. Exact count matches">
          </div>
          <button type="submit" class="btn-action btn-pay" style="width:100%;">Close Cash Register & Summary</button>
        </form>
      `;

      document.getElementById('form-close-reg').addEventListener('submit', async (e) => {
        e.preventDefault();
        const actual = document.getElementById('input-close-actual').value;
        const notes = document.getElementById('input-close-notes').value;

        await fetchApi('/api/register/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: state.registerSession.id,
            closing_balance_actual: actual,
            notes
          })
        });

        showToast('Cash register session closed cleanly!', 'success');
        DOM.modalRegisterMgr.style.display = 'none';
        await checkRegisterSession();
      });
    } else {
      DOM.regModalTitle.textContent = 'Open Daily Cash Register Session';
      DOM.regModalBody.innerHTML = `
        <form id="form-open-reg">
          <div class="field-group" style="margin-bottom:16px;">
            <label>Opening Cash Float Balance (BDT) *</label>
            <input type="number" id="input-open-float" step="1" required class="pos-input" value="1000">
          </div>
          <button type="submit" class="btn-action btn-pay" style="width:100%;">Open Cash Register Session</button>
        </form>
      `;

      document.getElementById('form-open-reg').addEventListener('submit', async (e) => {
        e.preventDefault();
        const openFloat = document.getElementById('input-open-float').value;

        await fetchApi('/api/register/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cashier_id: state.activeUser.id,
            opening_balance: openFloat
          })
        });

        showToast('Cash register session opened!', 'success');
        DOM.modalRegisterMgr.style.display = 'none';
        await checkRegisterSession();
      });
    }

    DOM.modalRegisterMgr.style.display = 'flex';
  }

  // Show Receipt Modal & Setup Triggers
  async function showReceiptModal(saleId) {
    try {
      const sale = await fetchApi(`/api/sales/${saleId}`);
      await loadSettings();

      const receiptHtml = window.ReceiptEngine.generateThermalReceiptHtml(sale, state.storeSettings);
      DOM.receiptPaperContent.innerHTML = receiptHtml;
      DOM.modalReceiptPreview.style.display = 'flex';

      // 1. Thermal Printer
      DOM.btnDoPrint.onclick = () => {
        window.ReceiptEngine.printThermalReceiptHtml(receiptHtml, state.storeSettings.receipt_paper_width || '80mm');
      };

      // 2. Direct PDF Download
      DOM.btnDownloadPdf.onclick = () => {
        window.ReceiptEngine.downloadReceiptPdfHtml(receiptHtml, `Receipt_${sale.invoice_no}.pdf`, state.storeSettings.receipt_paper_width || '80mm');
        showToast(`Generating ${sale.invoice_no}.pdf download...`, 'info');
      };

      // 3. ESC/POS Raw Bin
      DOM.btnDownloadEscpos.onclick = () => {
        window.open(`/api/sales/${saleId}/receipt?format=escpos`, '_blank');
      };
    } catch (err) {
      console.error(err);
    }
  }

})();
