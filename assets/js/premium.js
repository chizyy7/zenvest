/**
 * premium.js — Paystack payment integration module
 * Handles upgrading users to premium via Paystack
 */

import { getToken, getCurrentUser, getSupabase } from './auth.js';
import { showToast as toast } from './utils.js';

const API_URL = window.API_URL || 'https://zenvest-production.up.railway.app';

// Paystack public key (test key — replace with live key for production)
const PAYSTACK_PUBLIC_KEY = 'pk_test_04b090cd1cc8ab38d07e6e90d7c4cfe9dd4fd8d9';

// Pricing (monthly in NGN × 100 = kobo for Paystack; annual kept in USD cents)
const PRICES = {
  monthly: 12000,   // 12000 × 100 = 1,200,000 kobo (test price ≈ $0.79)
  annual:  5999     // $59.99 in cents
};

// toast imported from utils.js above

/**
 * Update user to premium in Supabase after successful payment
 * @param {string} userId - The user's ID
 * @param {string} reference - Paystack payment reference
 */
async function upgradeToPremium(userId, reference) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('users')
    .update({
      is_premium: true,
      premium_since: new Date().toISOString(),
      paystack_reference: reference
    })
    .eq('id', userId);

  if (!error) {
    showPremiumSuccess();
    setTimeout(() => window.location.reload(), 2000);
  } else {
    console.error('Failed to upgrade to premium:', error);
    toast('Payment received but profile update failed. Please contact support.', 'error');
  }
}

/**
 * Show a success message and unlock premium features in the UI
 */
function showPremiumSuccess() {
  unlockPremiumFeatures();
  toast('🎉 Payment successful! Welcome to Premium!', 'success');
}

/**
 * Unlock premium features in the UI after successful payment
 */
function unlockPremiumFeatures() {
  // Store premium status
  localStorage.setItem('zenvest_premium', 'true');

  // Update sidebar
  const upgradeCard = document.getElementById('upgrade-card');
  if (upgradeCard) upgradeCard.style.display = 'none';

  const userTier = document.getElementById('user-tier');
  if (userTier) userTier.textContent = '💎 Premium';

  // Hide all premium locks
  document.querySelectorAll('.premium-lock').forEach(lock => {
    lock.style.display = 'none';
  });

  // Update settings subscription status
  const subStatus = document.getElementById('subscription-status');
  if (subStatus) subStatus.innerHTML = 'You are on the <strong style="color:var(--color-gold);">Premium</strong> plan. ✨';

  const upgradeSettingsBtn = document.getElementById('upgrade-settings-btn');
  if (upgradeSettingsBtn) {
    upgradeSettingsBtn.textContent = 'Manage Subscription';
    upgradeSettingsBtn.disabled = true;
  }

  toast('🎉 Welcome to Premium! All features are now unlocked.', 'success');
}

/**
 * Initialize a Paystack payment popup (simplified form used by upgrade button)
 * @param {string} userEmail - The user's email address
 * @param {string} userId - The user's ID
 */
export function initializePaystackPayment(userEmail, userId) {
  const handler = window.PaystackPop.setup({
    key:      PAYSTACK_PUBLIC_KEY,
    email:    userEmail,
    amount:   1200000,
    currency: 'NGN',
    ref:      'ZV_' + new Date().getTime(),
    callback: function(response) {
      console.log('Payment successful', response);
      handlePaymentSuccess(response, userId);
    },
    onClose: function() {
      console.log('Payment window closed');
    }
  });

  handler.openIframe();
}

/**
 * Handle a successful Paystack payment by upgrading the user in Supabase
 * @param {object} response - Paystack response object
 * @param {string} userId - The user's ID
 */
async function handlePaymentSuccess(response, userId) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('users')
      .update({
        is_premium: true,
        premium_since: new Date().toISOString(),
        paystack_reference: response.reference
      })
      .eq('id', userId);

    if (!error) {
      toast('🎉 Welcome to Premium!', 'success');
      setTimeout(() => window.location.reload(), 2000);
    } else {
      console.error('Failed to update premium status:', error);
      toast('Payment received but profile update failed. Please contact support.', 'error');
    }
  } catch (err) {
    console.error('Error upgrading:', err);
  }
}

/**
 * Initialize a Paystack payment popup
 * @param {string} plan - 'monthly' | 'annual'
 */
export async function initPremiumPayment(plan = 'monthly') {
  const user = await getCurrentUser();

  if (!user) {
    toast('Please sign in before upgrading', 'info');
    window.location.href = 'login.html';
    return;
  }

  const amount = PRICES[plan] || PRICES.monthly;
  const ref    = `zenvest_${plan}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Check if Paystack is loaded
  if (!window.PaystackPop) {
    toast('Payment processor is loading, please try again', 'info');
    return;
  }

  const handler = window.PaystackPop.setup({
    key:      PAYSTACK_PUBLIC_KEY,
    email:    user.email,
    amount:   amount * 100, // Paystack uses kobo
    currency: 'NGN',
    ref,
    metadata: {
      custom_fields: [
        { display_name: 'Plan', variable_name: 'plan', value: plan },
        { display_name: 'User ID', variable_name: 'user_id', value: user.id }
      ]
    },
    callback: function(response) {
      console.log('Payment successful:', response.reference);
      upgradeToPremium(user.id, response.reference);
    },
    onClose: function() {
      toast('Payment cancelled. You can upgrade anytime! 💎', 'info');
    }
  });

  handler.openIframe();
}

// ============================================================
// Expose globally for inline onclick handlers
// ============================================================
window.initPaystack = function() {
  const plan = window.selectedPlan || 'monthly';
  initPremiumPayment(plan);
};

window.initPremiumPayment = initPremiumPayment;

// ============================================================
// Upgrade button event listener
// ============================================================
document.querySelector('.upgrade-btn')
  ?.addEventListener('click', async () => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      initializePaystackPayment(user.email, user.id);
    }
  });

// ============================================================
// Initialization — check premium status on load
// ============================================================
(async function checkPremiumStatus() {
  // Skip if not on app page
  if (!document.getElementById('upgrade-card')) return;

  const isPremium = localStorage.getItem('zenvest_premium') === 'true';
  if (isPremium) {
    unlockPremiumFeatures();
  }

  // Also verify with server if we have a token
  const token = await getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_URL}/auth/validate`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    if (data.is_premium && !isPremium) {
      unlockPremiumFeatures();
    }
  } catch {
    // Silently fail — use cached status
  }
})();
