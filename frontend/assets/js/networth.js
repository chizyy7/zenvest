/**
 * networth.js — Net worth dashboard module
 * Handles CRUD for net worth snapshots and animated display
 */

import { getToken } from './auth.js';
import { renderNetWorthChart } from './charts.js';
import { escapeHtml, showToast as toast } from './utils.js';

const API_URL = window.API_URL || 'https://zenvest-api.railway.app';

/** @type {Array<Object>} Net worth snapshots cache */
let snapshots = [];

// escapeHtml and toast imported from utils.js above

/**
 * Animate a number counting up from start to end
 * @param {HTMLElement} el - Element to update
 * @param {number} start
 * @param {number} end
 * @param {number} duration - Duration in ms
 */
function animateCountUp(el, start, end, duration = 1000) {
  const startTime = performance.now();
  const range = end - start;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
    const current = start + range * eased;

    el.textContent = `$${current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Fetch net worth snapshots from the API
 * @returns {Promise<Array<Object>>}
 */
export async function fetchNetWorthSnapshots() {
  const token = await getToken();
  if (!token) return [];

  try {
    const res = await fetch(`${API_URL}/networth`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    snapshots = Array.isArray(data) ? data : data.snapshots || [];
    return snapshots;
  } catch (err) {
    console.error('Failed to fetch net worth:', err);
    return snapshots;
  }
}

/**
 * Save a new net worth snapshot
 * @param {Object} snapshotData
 * @returns {Promise<Object|null>}
 */
export async function saveNetWorthSnapshot(snapshotData) {
  const token = await getToken();
  if (!token) return null;

  const res = await fetch(`${API_URL}/networth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(snapshotData)
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const snapshot = await res.json();
  snapshots.push(snapshot);
  return snapshot;
}

/**
 * Calculate the monthly change in net worth
 * @param {Array<Object>} snapList
 * @returns {{ amount: number, direction: 'up'|'down'|'flat' }}
 */
function calcMonthlyChange(snapList) {
  if (snapList.length < 2) return { amount: 0, direction: 'flat' };

  const sorted  = [...snapList].sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date));
  const latest  = parseFloat(sorted[sorted.length - 1].net_worth);
  const prev    = parseFloat(sorted[sorted.length - 2].net_worth);
  const diff    = latest - prev;

  return {
    amount:    Math.abs(diff),
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  };
}

/**
 * Render the assets breakdown list
 * @param {Object} snapshot - Latest snapshot with asset fields
 */
function renderAssets(snapshot) {
  const container = document.getElementById('assets-list');
  const totalEl   = document.getElementById('total-assets');
  if (!container || !snapshot) return;

  const assets = {
    'Savings':     parseFloat(snapshot.savings)     || 0,
    'Investments': parseFloat(snapshot.investments) || 0,
    'Crypto':      parseFloat(snapshot.crypto)      || 0,
    'Property':    parseFloat(snapshot.property)    || 0
  };

  const total = Object.values(assets).reduce((s, v) => s + v, 0);

  const rows = Object.entries(assets)
    .filter(([, v]) => v > 0)
    .map(([label, value]) => `
      <div style="display:flex;justify-content:space-between;padding:0.625rem 0;border-bottom:1px solid var(--border);">
        <span style="color:var(--text-secondary);font-size:0.9375rem;">${escapeHtml(label)}</span>
        <span style="font-weight:600;color:var(--color-profit);">$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
    `);

  container.innerHTML = rows.length ? rows.join('') :
    '<p style="color:var(--text-muted);font-size:0.9375rem;">No assets recorded yet.</p>';

  if (totalEl) totalEl.textContent = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

/**
 * Render the liabilities breakdown list
 * @param {Object} snapshot - Latest snapshot with liability fields
 */
function renderLiabilities(snapshot) {
  const container = document.getElementById('liabilities-list');
  const totalEl   = document.getElementById('total-liabilities');
  if (!container || !snapshot) return;

  const liabilities = {
    'Loans':        parseFloat(snapshot.loans)        || 0,
    'Credit Cards': parseFloat(snapshot.credit_cards) || 0,
    'Other Debt':   parseFloat(snapshot.other_debt)   || 0
  };

  const total = Object.values(liabilities).reduce((s, v) => s + v, 0);

  const rows = Object.entries(liabilities)
    .filter(([, v]) => v > 0)
    .map(([label, value]) => `
      <div style="display:flex;justify-content:space-between;padding:0.625rem 0;border-bottom:1px solid var(--border);">
        <span style="color:var(--text-secondary);font-size:0.9375rem;">${escapeHtml(label)}</span>
        <span style="font-weight:600;color:var(--color-loss);">$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
    `);

  container.innerHTML = rows.length ? rows.join('') :
    '<p style="color:var(--text-muted);font-size:0.9375rem;">No liabilities recorded yet.</p>';

  if (totalEl) totalEl.textContent = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

/**
 * Render the full net worth view with hero number, trend, and chart
 * @param {Array<Object>} snapList
 * @param {boolean} isPremium
 */
export function renderNetWorth(snapList, isPremium = false) {
  const lock = document.getElementById('networth-lock');

  if (!isPremium) {
    if (lock) lock.style.display = 'flex';
    return;
  }

  if (lock) lock.style.display = 'none';

  const sorted  = [...snapList].sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date));
  const latest  = sorted[sorted.length - 1];
  const netWorth = latest ? parseFloat(latest.net_worth) : 0;

  // Animate net worth counter
  const totalEl = document.getElementById('networth-total');
  if (totalEl) {
    animateCountUp(totalEl, 0, netWorth, 1200);
    totalEl.style.color = netWorth >= 0 ? 'var(--color-zen)' : 'var(--color-loss)';
  }

  // Monthly trend
  const trendEl = document.getElementById('networth-trend');
  if (trendEl) {
    const change = calcMonthlyChange(snapList);
    const sign   = change.direction === 'up' ? '↑' : change.direction === 'down' ? '↓' : '';
    const color  = change.direction === 'up' ? 'rgba(0,217,139,0.1)' : change.direction === 'down' ? 'rgba(255,77,109,0.1)' : 'rgba(127,255,212,0.1)';
    const textColor = change.direction === 'up' ? 'var(--color-profit)' : change.direction === 'down' ? 'var(--color-loss)' : 'var(--text-secondary)';

    trendEl.innerHTML = `<span aria-hidden="true">${sign}</span> $${change.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} this month`;
    trendEl.style.background = color;
    trendEl.style.color      = textColor;
  }

  // Assets & liabilities
  if (latest) {
    renderAssets(latest);
    renderLiabilities(latest);
  }

  // Line chart
  renderNetWorthChart(snapList);
}

// ============================================================
// Net Worth Form Handler
// ============================================================
const networthForm = document.getElementById('networth-form');
if (networthForm) {
  networthForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const snapshotData = {
      savings:      parseFloat(document.getElementById('nw-savings').value)      || 0,
      investments:  parseFloat(document.getElementById('nw-investments').value)  || 0,
      crypto:       parseFloat(document.getElementById('nw-crypto').value)        || 0,
      property:     parseFloat(document.getElementById('nw-property').value)      || 0,
      loans:        parseFloat(document.getElementById('nw-loans').value)         || 0,
      credit_cards: parseFloat(document.getElementById('nw-credit-cards').value) || 0,
      other_debt:   parseFloat(document.getElementById('nw-other-debt').value)    || 0,
      total_assets:
        (parseFloat(document.getElementById('nw-savings').value)     || 0) +
        (parseFloat(document.getElementById('nw-investments').value) || 0) +
        (parseFloat(document.getElementById('nw-crypto').value)      || 0) +
        (parseFloat(document.getElementById('nw-property').value)    || 0),
      total_liabilities:
        (parseFloat(document.getElementById('nw-loans').value)        || 0) +
        (parseFloat(document.getElementById('nw-credit-cards').value) || 0) +
        (parseFloat(document.getElementById('nw-other-debt').value)   || 0)
    };

    const btn = networthForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;"></span> Saving...';

    try {
      await saveNetWorthSnapshot(snapshotData);
      toast('Net worth updated! 💎', 'success');
      closeModal('networth-modal');
      const isPremium = localStorage.getItem('zenvest_premium') === 'true';
      renderNetWorth(snapshots, isPremium);
    } catch (err) {
      toast(err.message || 'Failed to save net worth', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

// ============================================================
// Initialization
// ============================================================
(async function initNetWorth() {
  if (!document.getElementById('networth-total')) return;

  const isPremium = localStorage.getItem('zenvest_premium') === 'true';
  const snapList  = await fetchNetWorthSnapshots();
  renderNetWorth(snapList, isPremium);
})();
