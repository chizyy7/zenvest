/**
 * investments.js — Investment recommendations display module
 * Fetches and renders ML-powered investment recommendations
 */

import { getToken } from './auth.js';
import { escapeHtml, showToast as toast } from './utils.js';

const API_URL = window.API_URL || 'https://zenvest-production.up.railway.app';

/** @type {Array<Object>} Cached recommendations */
let recommendations = [];

// escapeHtml and toast imported from utils.js above

// Asset type metadata
const ASSET_META = {
  'ETF':    { icon: '📈', color: '#7FFFD4' },
  'Stock':  { icon: '💹', color: '#00D98B' },
  'Bond':   { icon: '🏛️', color: '#96CEB4' },
  'Crypto': { icon: '💎', color: '#8B5CF6' },
  'Fund':   { icon: '📊', color: '#45B7D1' }
};

/**
 * Determine asset metadata from asset type string
 * @param {string} assetType
 * @returns {{icon: string, color: string}}
 */
function getAssetMeta(assetType) {
  for (const [key, meta] of Object.entries(ASSET_META)) {
    if (assetType?.toLowerCase().includes(key.toLowerCase())) return meta;
  }
  return { icon: '📊', color: '#7FFFD4' };
}

/**
 * Get badge HTML for risk level
 * @param {string} risk - 'Low' | 'Low-Medium' | 'Medium' | 'Medium-High' | 'High'
 * @returns {string}
 */
function riskBadge(risk) {
  const lower = risk?.toLowerCase() || '';
  if (lower.includes('low') && !lower.includes('medium')) return `<span class="badge badge-low">${escapeHtml(risk)}</span>`;
  if (lower.includes('high')) return `<span class="badge badge-high">${escapeHtml(risk)}</span>`;
  return `<span class="badge badge-medium">${escapeHtml(risk)}</span>`;
}

/**
 * Render a single investment card
 * @param {Object} rec - Recommendation object
 * @returns {string} HTML string
 */
function renderInvestmentCard(rec) {
  const meta = getAssetMeta(rec.asset_type || rec.asset);
  const alloc = rec.allocation_percentage || rec.allocation || '';
  const name  = rec.asset_name || rec.asset || 'Investment';
  const type  = rec.asset_type || '';
  const risk  = rec.risk_level || rec.risk || 'Medium';
  const ret   = rec.expected_return || '—';
  const reason = rec.reasoning || rec.reason || rec.why || '';

  return `
    <article class="investment-card" aria-label="${escapeHtml(name)}">
      <div class="investment-type-icon" style="background:${meta.color}22;border:1px solid ${meta.color}44;" aria-hidden="true">
        ${meta.icon}
      </div>

      ${alloc ? `
        <span class="badge" style="background:${meta.color}22;color:${meta.color};border:1px solid ${meta.color}44;margin-bottom:0.5rem;font-size:0.75rem;">
          ${escapeHtml(alloc)} allocation
        </span>
      ` : ''}

      <h3 class="investment-name">${escapeHtml(name)}</h3>

      ${type ? `<p style="font-size:0.8125rem;color:var(--text-secondary);">${escapeHtml(type)}</p>` : ''}

      <p class="investment-return" aria-label="Expected return: ${escapeHtml(ret)}">${escapeHtml(ret)}</p>
      <p style="font-size:0.8125rem;color:var(--text-muted);margin-top:-0.5rem;">expected annually</p>

      <div class="investment-meta">
        ${riskBadge(risk)}
        <span style="font-size:0.8125rem;color:var(--text-secondary);">risk level</span>
      </div>

      ${reason ? `<p class="investment-reason">${escapeHtml(reason)}</p>` : ''}

      <button class="btn btn-outline-zen btn-sm" style="width:100%;margin-top:1rem;"
        onclick="window.open('https://www.google.com/search?q=${encodeURIComponent(name + ' investment')}', '_blank')"
        aria-label="Learn more about ${escapeHtml(name)}">
        Learn More →
      </button>
    </article>
  `;
}

/**
 * Render the featured recommendation on the dashboard
 * @param {Object} rec - First recommendation
 */
function renderFeaturedRecommendation(rec) {
  const container = document.getElementById('recommendation-content');
  if (!container || !rec) return;

  const meta = getAssetMeta(rec.asset_type || rec.asset);
  const name = rec.asset_name || rec.asset || 'Investment';
  const ret  = rec.expected_return || 'Up to 12% annually';
  const risk = rec.risk_level || rec.risk || 'Medium';

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.625rem;margin-bottom:0.625rem;">
      <span style="font-size:1.25rem;" aria-hidden="true">${meta.icon}</span>
      <span style="font-weight:600;font-size:0.9375rem;color:${meta.color};">${escapeHtml(name)}</span>
      ${riskBadge(risk)}
    </div>
    <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:0.5rem;">
      Expected return: <strong style="color:var(--color-zen);">${escapeHtml(ret)}</strong>
    </p>
    ${rec.reasoning || rec.reason ? `<p style="color:var(--text-muted);font-size:0.8125rem;">${escapeHtml(rec.reasoning || rec.reason)}</p>` : ''}
  `;
}

/**
 * Update the risk profile display
 * @param {Object} profile - User profile from localStorage
 */
function updateRiskProfileDisplay(profile) {
  const circle = document.getElementById('risk-score-circle');
  const numEl  = document.getElementById('risk-score-num');
  const descEl = document.getElementById('risk-profile-desc');

  if (!profile) return;

  const score = profile.risk_tolerance || 3;
  const descs = {
    1: 'Very conservative investor',
    2: 'Conservative investor',
    3: 'Balanced investor',
    4: 'Growth-oriented investor',
    5: 'Aggressive investor'
  };

  if (numEl)  numEl.textContent  = score;
  if (descEl) descEl.textContent = descs[score] || 'Balanced investor';
}

/**
 * Fetch investment recommendations from the API
 * @param {boolean} isPremium
 * @returns {Promise<Array<Object>>}
 */
export async function fetchRecommendations(isPremium = false) {
  const token = await getToken();

  // Use cached profile for request
  const profile = JSON.parse(localStorage.getItem('zenvest_profile') || 'null');

  // Show loading state
  const grid    = document.getElementById('investments-grid');
  const loading = document.getElementById('investments-loading');
  if (grid)    grid.innerHTML = '';
  if (loading) loading.style.display = 'block';

  try {
    let data;

    if (!token) {
      // Demo recommendations if not authenticated
      data = getDefaultRecommendations();
    } else {
      const res = await fetch(`${API_URL}/recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    }

    recommendations = Array.isArray(data) ? data : data.recommendations || getDefaultRecommendations();

    // Free users limited to 3
    const toShow = isPremium ? recommendations : recommendations.slice(0, 3);

    if (loading) loading.style.display = 'none';

    renderRecommendations(toShow, isPremium);

    // Show featured on dashboard
    if (recommendations.length > 0) {
      renderFeaturedRecommendation(recommendations[0]);
    }

    return recommendations;
  } catch (err) {
    console.error('Failed to fetch recommendations:', err);
    if (loading) loading.style.display = 'none';

    const fallback = getDefaultRecommendations();
    recommendations = fallback;
    const toShow = isPremium ? fallback : fallback.slice(0, 3);
    renderRecommendations(toShow, isPremium);
    renderFeaturedRecommendation(fallback[0]);

    return fallback;
  }
}

/**
 * Render recommendations grid
 * @param {Array<Object>} recList
 * @param {boolean} isPremium
 */
function renderRecommendations(recList, isPremium) {
  const grid    = document.getElementById('investments-grid');
  const freeNote = document.getElementById('free-tier-note');

  if (!grid) return;

  if (recList.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon" aria-hidden="true">📈</div>
        <p class="empty-title">No recommendations yet</p>
        <p class="empty-desc">Complete your financial profile to get personalized recommendations.</p>
        <a href="onboarding.html" class="btn btn-zen" style="margin-top:1rem;">Complete Profile</a>
      </div>
    `;
    return;
  }

  grid.innerHTML = recList.map(renderInvestmentCard).join('');

  if (freeNote) {
    freeNote.style.display = (!isPremium && recommendations.length > 3) ? 'block' : 'none';
  }
}

/**
 * Refresh recommendations (re-fetch)
 */
window.refreshRecommendations = async function() {
  const btn = document.querySelector('[onclick="refreshRecommendations()"]');
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;"></span> Refreshing...';
    btn.disabled = true;
    await fetchRecommendations(localStorage.getItem('zenvest_premium') === 'true');
    btn.innerHTML = orig;
    btn.disabled = false;
    toast('Recommendations refreshed! 🤖', 'success');
  } else {
    await fetchRecommendations(localStorage.getItem('zenvest_premium') === 'true');
  }
};

/**
 * Get default/sample recommendations for demo mode
 * @returns {Array<Object>}
 */
function getDefaultRecommendations() {
  return [
    {
      asset_name:        'S&P 500 Index Fund',
      asset_type:        'ETF',
      risk_level:        'Low-Medium',
      expected_return:   '8–12% annually',
      allocation_percentage: '40%',
      reasoning:         'Highly diversified across 500 of the largest US companies. Historically delivers reliable long-term growth with minimal active management required.'
    },
    {
      asset_name:        'US Treasury Bonds',
      asset_type:        'Bond',
      risk_level:        'Low',
      expected_return:   '4–5% annually',
      allocation_percentage: '25%',
      reasoning:         'Government-backed, very low risk. Excellent for capital preservation and provides stability to balance equity exposure.'
    },
    {
      asset_name:        'NASDAQ-100 ETF (QQQ)',
      asset_type:        'ETF',
      risk_level:        'Medium',
      expected_return:   '10–15% annually',
      allocation_percentage: '20%',
      reasoning:         'Exposure to top tech companies. Higher growth potential with moderate volatility. Good for long-term investors with a 5+ year horizon.'
    },
    {
      asset_name:        'Bitcoin (BTC)',
      asset_type:        'Crypto',
      risk_level:        'High',
      expected_return:   '15–30% annually',
      allocation_percentage: '10%',
      reasoning:         'High risk, high potential reward. Keep as a small satellite position only. Dollar-cost averaging reduces timing risk significantly.'
    },
    {
      asset_name:        'Real Estate Investment Trust (REIT)',
      asset_type:        'Fund',
      risk_level:        'Medium',
      expected_return:   '6–9% annually',
      allocation_percentage: '5%',
      reasoning:         'Provides real estate exposure without buying property. REITs must distribute 90% of income as dividends — great for passive income.'
    }
  ];
}

// ============================================================
// Initialization
// ============================================================
(async function initInvestments() {
  if (!document.getElementById('investments-grid')) return;

  const isPremium = localStorage.getItem('zenvest_premium') === 'true';
  const profile   = JSON.parse(localStorage.getItem('zenvest_profile') || 'null');

  updateRiskProfileDisplay(profile);
  await fetchRecommendations(isPremium);
})();
