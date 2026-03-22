/**
 * tracker.js — Transaction CRUD module
 * Handles adding, editing, deleting, and displaying transactions
 */

import { getToken, getCurrentUser } from './auth.js';

const API_URL = window.API_URL || 'https://zenvest-api.railway.app';

/** @type {Array<Object>} In-memory cache of transactions */
let transactions = [];

/** @type {'all'|'income'|'expense'|'category'|'month'} Active filter */
let activeFilter = 'all';

/** @type {string} Active category filter value */
let activeCategoryFilter = '';

/** @type {string} Active month filter value */
let activeMonthFilter = '';

// Category metadata
const CATEGORY_META = {
  'Food & Drink':  { icon: '🍔', color: '#FF6B6B' },
  'Transport':     { icon: '🚌', color: '#4ECDC4' },
  'Entertainment': { icon: '🎬', color: '#45B7D1' },
  'Bills':         { icon: '📄', color: '#96CEB4' },
  'Health':        { icon: '❤️', color: '#FFEAA7' },
  'Shopping':      { icon: '🛍️', color: '#DDA0DD' },
  'Income':        { icon: '💵', color: '#00D98B' },
  'Other':         { icon: '📦', color: '#98D8C8' }
};

/**
 * Format a dollar amount with sign and color class
 * @param {number} amount
 * @param {string} type - 'income' or 'expense'
 * @returns {{text: string, cls: string}}
 */
function formatAmount(amount, type) {
  const sign = type === 'income' ? '+' : '-';
  const text = `${sign}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const cls  = type === 'income' ? 'income' : 'expense';
  return { text, cls };
}

/**
 * Format a date string to a human-readable label
 * @param {string} dateStr - ISO date string
 * @returns {string}
 */
function formatDateLabel(dateStr) {
  const date  = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Fetch all transactions for the current user from the API
 * @returns {Promise<Array<Object>>}
 */
export async function fetchTransactions() {
  const token = await getToken();
  if (!token) return [];

  try {
    const res = await fetch(`${API_URL}/transactions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    transactions = Array.isArray(data) ? data : data.transactions || [];
    return transactions;
  } catch (err) {
    console.error('Failed to fetch transactions:', err);
    // Return cached or empty
    return transactions;
  }
}

/**
 * Add a new transaction
 * @param {Object} txData - Transaction payload
 * @returns {Promise<Object|null>}
 */
export async function addTransaction(txData) {
  const token = await getToken();
  if (!token) return null;

  const res = await fetch(`${API_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(txData)
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const newTx = await res.json();
  transactions.unshift(newTx);
  return newTx;
}

/**
 * Update an existing transaction
 * @param {string} id - Transaction ID
 * @param {Object} txData - Updated fields
 * @returns {Promise<Object|null>}
 */
export async function updateTransaction(id, txData) {
  const token = await getToken();
  if (!token) return null;

  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(txData)
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const updated = await res.json();
  const idx = transactions.findIndex(t => t.id === id);
  if (idx !== -1) transactions[idx] = updated;
  return updated;
}

/**
 * Delete a transaction by ID
 * @param {string} id - Transaction ID
 * @returns {Promise<boolean>}
 */
export async function deleteTransaction(id) {
  const token = await getToken();
  if (!token) return false;

  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) return false;
  transactions = transactions.filter(t => t.id !== id);
  return true;
}

/**
 * Calculate monthly stats from a list of transactions
 * @param {Array<Object>} txList
 * @returns {{ income: number, expenses: number, balance: number, savingsRate: number }}
 */
export function calcStats(txList) {
  let income = 0, expenses = 0;
  const now = new Date();
  const monthTxs = txList.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  monthTxs.forEach(t => {
    if (t.type === 'income') income += parseFloat(t.amount);
    else expenses += parseFloat(t.amount);
  });

  const balance     = income - expenses;
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

  return { income, expenses, balance, savingsRate };
}

/**
 * Get spending breakdown by category for the current month
 * @param {Array<Object>} txList
 * @returns {Array<{category: string, amount: number, color: string, icon: string}>}
 */
export function getSpendingByCategory(txList) {
  const now = new Date();
  const expenses = txList.filter(t => {
    const d = new Date(t.date);
    return t.type === 'expense' &&
           d.getMonth() === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
  });

  const catMap = {};
  expenses.forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + parseFloat(t.amount);
  });

  return Object.entries(catMap)
    .map(([category, amount]) => ({
      category,
      amount,
      color: CATEGORY_META[category]?.color || '#98D8C8',
      icon:  CATEGORY_META[category]?.icon  || '📦'
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Apply active filters and return filtered transactions
 * @param {Array<Object>} txList
 * @returns {Array<Object>}
 */
function applyFilters(txList) {
  let filtered = [...txList];

  if (activeFilter === 'income') {
    filtered = filtered.filter(t => t.type === 'income');
  } else if (activeFilter === 'expense') {
    filtered = filtered.filter(t => t.type === 'expense');
  }

  if (activeCategoryFilter) {
    filtered = filtered.filter(t => t.category === activeCategoryFilter);
  }

  if (activeMonthFilter) {
    const [year, month] = activeMonthFilter.split('-');
    filtered = filtered.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === parseInt(year) &&
             d.getMonth() + 1 === parseInt(month);
    });
  }

  return filtered;
}

/**
 * Render a single transaction row HTML
 * @param {Object} tx - Transaction object
 * @returns {string} HTML string
 */
function renderTransactionRow(tx) {
  const meta   = CATEGORY_META[tx.category] || { icon: '📦', color: '#98D8C8' };
  const amount = formatAmount(tx.amount, tx.type);
  const date   = new Date(tx.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return `
    <div class="transaction-item" data-id="${tx.id}" role="row">
      <div class="transaction-icon" style="background:${meta.color}22;" role="presentation">
        <span aria-hidden="true">${meta.icon}</span>
      </div>
      <div class="transaction-info">
        <p class="transaction-name">${escapeHtml(tx.description || tx.category)}</p>
        <p class="transaction-category">${escapeHtml(tx.category)} · ${date}</p>
      </div>
      <span class="transaction-amount ${amount.cls}" aria-label="${amount.text}">${amount.text}</span>
      <div class="transaction-actions">
        <button class="btn btn-icon btn-ghost btn-sm" onclick="editTransaction('${tx.id}')"
          aria-label="Edit transaction" title="Edit">✏️</button>
        <button class="btn btn-icon btn-danger btn-sm" onclick="confirmDeleteTransaction('${tx.id}')"
          aria-label="Delete transaction" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}

/**
 * Render transactions grouped by date in the full transactions view
 * @param {Array<Object>} txList
 */
function renderTransactionsList(txList) {
  const container = document.getElementById('transactions-list');
  if (!container) return;

  const filtered = applyFilters(txList);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">💸</div>
        <p class="empty-title">No transactions found</p>
        <p class="empty-desc">Try adjusting your filters or add a new transaction.</p>
        <button class="btn btn-zen" onclick="openAddTransaction()" style="margin-top:1rem;">
          + Add Transaction
        </button>
      </div>
    `;
    return;
  }

  // Group by date
  const groups = {};
  filtered.forEach(tx => {
    const key = tx.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });

  const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

  let html = '<div role="table" aria-label="Transactions">';
  sortedDates.forEach(date => {
    html += `
      <div class="transaction-date-group" role="rowgroup">
        <p class="transaction-date-label" role="columnheader">${formatDateLabel(date)}</p>
        ${groups[date].map(renderTransactionRow).join('')}
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

/**
 * Render recent transactions in the dashboard (last 5)
 * @param {Array<Object>} txList
 */
export function renderRecentTransactions(txList) {
  const container = document.getElementById('recent-transactions-list');
  if (!container) return;

  const recent = [...txList]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:2rem 0;">
        <div class="empty-icon" aria-hidden="true">💸</div>
        <p class="empty-title">No transactions yet</p>
        <p class="empty-desc">Add your first transaction to get started.</p>
        <button class="btn btn-zen btn-sm" onclick="openAddTransaction()" style="margin-top:0.75rem;">
          + Add Transaction
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="transaction-list" role="list" aria-label="Recent transactions">
      ${recent.map(renderTransactionRow).join('')}
    </div>
  `;
}

/**
 * Update dashboard stats display
 * @param {Array<Object>} txList
 */
export function updateStatsDisplay(txList) {
  const { income, expenses, balance, savingsRate } = calcStats(txList);

  const fmt = (v) => `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const balanceEl = document.getElementById('stat-balance');
  if (balanceEl) {
    balanceEl.textContent = fmt(balance);
    balanceEl.className   = `stat-value count-up ${balance >= 0 ? 'text-zen' : 'text-loss'}`;
  }

  const incomeEl = document.getElementById('stat-income');
  if (incomeEl) incomeEl.textContent = fmt(income);

  const expensesEl = document.getElementById('stat-expenses');
  if (expensesEl) expensesEl.textContent = fmt(expenses);

  const savingsEl = document.getElementById('stat-savings-rate');
  if (savingsEl) savingsEl.textContent = `${Math.max(0, savingsRate)}%`;
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Show a toast notification
 * @param {string} msg
 * @param {'success'|'error'|'info'} type
 */
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${escapeHtml(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ============================================================
// Transaction Form Handler
// ============================================================
const txForm = document.getElementById('transaction-form');
if (txForm) {
  txForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn        = document.getElementById('save-transaction-btn');
    const editId     = document.getElementById('transaction-edit-id').value;
    const type       = document.getElementById('transaction-type').value;
    const amount     = parseFloat(document.getElementById('transaction-amount').value);
    const category   = document.getElementById('transaction-category').value;
    const description = document.getElementById('transaction-description').value.trim();
    const date       = document.getElementById('transaction-date').value;

    if (!amount || amount <= 0) { toast('Please enter a valid amount', 'error'); return; }
    if (!category) { toast('Please select a category', 'error'); return; }
    if (!date)     { toast('Please select a date', 'error'); return; }

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;"></span> Saving...';

    try {
      const txData = { type, amount, category, description, date };

      if (editId) {
        await updateTransaction(editId, txData);
        toast('Transaction updated ✅', 'success');
      } else {
        await addTransaction(txData);
        toast('Transaction added ✅', 'success');
      }

      closeModal('transaction-modal');
      refreshDashboard();
    } catch (err) {
      toast(err.message || 'Failed to save transaction', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

/**
 * Open the edit modal for an existing transaction
 * @param {string} id - Transaction ID
 */
window.editTransaction = function(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;

  document.getElementById('transaction-edit-id').value  = id;
  document.getElementById('modal-title-transaction').textContent = 'Edit Transaction';
  document.getElementById('transaction-amount').value   = tx.amount;
  document.getElementById('transaction-category').value = tx.category;
  document.getElementById('transaction-description').value = tx.description || '';
  document.getElementById('transaction-date').value     = tx.date;
  setTransactionType(tx.type);
  openModal('transaction-modal');
};

/**
 * Confirm and delete a transaction
 * @param {string} id - Transaction ID
 */
window.confirmDeleteTransaction = async function(id) {
  if (!confirm('Delete this transaction?')) return;

  const ok = await deleteTransaction(id);
  if (ok) {
    toast('Transaction deleted', 'success');
    refreshDashboard();
  } else {
    toast('Failed to delete transaction', 'error');
  }
};

/**
 * Filter transactions by type/category/month
 * @param {string} type - Filter type
 * @param {HTMLElement} el - The clicked element
 */
window.filterTransactions = function(type, el) {
  if (type === 'all' || type === 'income' || type === 'expense') {
    activeFilter = type;
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    el.classList.add('active');
    el.setAttribute('aria-pressed', 'true');
  } else if (type === 'category') {
    activeCategoryFilter = el.value;
  } else if (type === 'month') {
    activeMonthFilter = el.value;
  }

  renderTransactionsList(transactions);
};

/**
 * Refresh the entire dashboard with latest transactions
 */
async function refreshDashboard() {
  const txList = await fetchTransactions();
  renderTransactionsList(txList);
  renderRecentTransactions(txList);
  updateStatsDisplay(txList);

  // Update charts if available
  if (window.updateCharts) window.updateCharts();
}

// ============================================================
// Initialization
// ============================================================
(async function initTracker() {
  // Only run on app.html
  if (!document.getElementById('transactions-list')) return;

  const txList = await fetchTransactions();
  renderTransactionsList(txList);
  renderRecentTransactions(txList);
  updateStatsDisplay(txList);

  // Expose for charts module
  window.getTransactions = () => transactions;
})();
