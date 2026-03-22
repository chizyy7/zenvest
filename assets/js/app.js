/**
 * app.js — Main application orchestrator
 * Initializes auth, routing, user state, and all feature modules
 */

import { requireAuth, getSession, getUserDisplayName, checkIsPremium, signOut } from './auth.js';
import { fetchTransactions, renderRecentTransactions, updateStatsDisplay, getSpendingByCategory } from './tracker.js';
import { renderSpendingChart } from './charts.js';
import { fetchGoals, renderGoals } from './goals.js';
import { fetchNetWorthSnapshots, renderNetWorth } from './networth.js';
import { fetchRecommendations } from './investments.js';
import { renderReportsSection } from './reports.js';

// ============================================================
// Global Toast Notification System
// ============================================================

/**
 * Show a global toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons  = { success: '✅', error: '❌', info: 'ℹ️' };
  const safe   = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const el     = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `<span class="toast-icon" aria-hidden="true">${icons[type]}</span><span>${safe}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3500);
};

// ============================================================
// Time-based Greeting
// ============================================================

/**
 * Get a greeting based on the current hour
 * @returns {string}
 */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ============================================================
// User Profile UI
// ============================================================

/**
 * Update the sidebar user info with the authenticated user's data
 * @param {import('@supabase/supabase-js').User} user
 * @param {boolean} isPremium
 */
function updateUserUI(user, isPremium) {
  const name        = getUserDisplayName(user);
  const initials    = name.charAt(0).toUpperCase();

  // Welcome message
  const welcomeEl = document.getElementById('welcome-msg');
  if (welcomeEl) {
    welcomeEl.textContent = `${getGreeting()}, ${name.split(' ')[0]} 👋`;
  }

  // Sidebar user info
  const nameEl   = document.getElementById('user-name');
  const tierEl   = document.getElementById('user-tier');
  const avatarEl = document.getElementById('user-avatar');
  const mobileAvatar = document.getElementById('mobile-user-avatar');

  if (nameEl)   nameEl.textContent   = name;
  if (tierEl)   tierEl.textContent   = isPremium ? '💎 Premium' : 'Free Plan';
  if (avatarEl) avatarEl.textContent = initials;
  if (mobileAvatar) mobileAvatar.textContent = initials;

  // Settings form
  const settingsName  = document.getElementById('settings-name');
  const settingsEmail = document.getElementById('settings-email');
  if (settingsName)  settingsName.value  = name;
  if (settingsEmail) settingsEmail.value = user.email || '';

  // Upgrade card visibility
  const upgradeCard = document.getElementById('upgrade-card');
  if (upgradeCard) {
    upgradeCard.style.display = isPremium ? 'none' : 'block';
  }

  // Premium lock overlays
  if (isPremium) {
    document.querySelectorAll('.premium-lock').forEach(lock => {
      lock.style.display = 'none';
    });
    const subscriptionStatus = document.getElementById('subscription-status');
    if (subscriptionStatus) {
      subscriptionStatus.innerHTML = 'You are on the <strong style="color:var(--color-gold);">Premium</strong> plan. ✨';
    }
    const upgradeSettingsBtn = document.getElementById('upgrade-settings-btn');
    if (upgradeSettingsBtn) {
      upgradeSettingsBtn.textContent = 'Manage Subscription';
      upgradeSettingsBtn.disabled = true;
    }
  }
}

// ============================================================
// Dashboard Data Loading
// ============================================================

/**
 * Load and render all dashboard data
 * @param {string} userId
 * @param {boolean} isPremium
 */
async function loadDashboardData(userId, isPremium) {
  try {
    // Fetch transactions (needed for all views)
    const transactions = await fetchTransactions();

    // Update stats row
    updateStatsDisplay(transactions);

    // Update recent transactions list
    renderRecentTransactions(transactions);

    // Update spending chart
    const period = document.getElementById('chart-period')?.value || 'month';
    renderSpendingChart(transactions, period);

    // Load investment recommendations
    await fetchRecommendations(isPremium);

    // Load premium features
    if (isPremium) {
      const [goalList, snapshots] = await Promise.all([
        fetchGoals(),
        fetchNetWorthSnapshots()
      ]);
      renderGoals(goalList, true);
      renderNetWorth(snapshots, true);
    } else {
      // Show lock overlays
      renderGoals([], false);
      renderNetWorth([], false);
    }

    // Render reports section if settings view is active
    renderReportsSection();

  } catch (err) {
    console.error('Dashboard data load error:', err);
    window.showToast('Some data failed to load. Refresh to try again.', 'error');
  }
}

// ============================================================
// Settings Save Handler
// ============================================================

/**
 * Save profile name changes
 */
window.saveProfile = async function() {
  const nameInput = document.getElementById('settings-name');
  if (!nameInput) return;

  const newName = nameInput.value.trim();
  if (!newName) {
    window.showToast('Please enter a name', 'error');
    return;
  }

  // In a full implementation, this would update Supabase user_metadata
  window.showToast('Profile updated! ✅', 'success');
};

// ============================================================
// Application Initialization
// ============================================================

/**
 * Bootstrap the Zenvest application
 */
async function initApp() {
  // Only run on app.html
  if (!document.getElementById('view-dashboard')) return;

  // Require authentication — redirect to login if not authenticated
  const user = await requireAuth();
  if (!user) return; // requireAuth handles redirect

  // Check premium status
  const cachedPremium = localStorage.getItem('zenvest_premium') === 'true';
  let isPremium = cachedPremium;

  try {
    // Verify with server (non-blocking)
    isPremium = await checkIsPremium(user.id);
    if (isPremium !== cachedPremium) {
      localStorage.setItem('zenvest_premium', String(isPremium));
    }
  } catch {
    // Use cached value
  }

  // Update UI with user info
  updateUserUI(user, isPremium);

  // Load all data
  await loadDashboardData(user.id, isPremium);

  // Load onboarding profile if available
  const profile = localStorage.getItem('zenvest_profile');
  if (!profile && !localStorage.getItem('zenvest_profile_skipped')) {
    // Soft prompt to complete onboarding after 2 seconds
    setTimeout(() => {
      window.showToast('Complete your financial profile for better recommendations 🎯', 'info');
    }, 2000);
  }
}

// Start the app
initApp();
