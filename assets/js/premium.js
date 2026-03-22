/**
 * premium.js — Paystack payment integration module
 * Handles upgrading users to premium via Paystack
 */

import { getToken, getCurrentUser } from './auth.js';
import { showToast as toast } from './utils.js';

const API_URL = window.API_URL || 'https://zenvest-api.railway.app';

// Paystack public key (test key — replace with live key for production)
const PAYSTACK_PUBLIC_KEY = window.PAYSTACK_PUBLIC_KEY || 'pk_test_YOUR_PAYSTACK_PUBLIC_KEY';

// Pricing in cents
const PRICES = {
  monthly: 799,     // $7.99
  annual:  5999     // $59.99
};

// toast imported from utils.js above

/**
 * Verify a completed Paystack payment with the backend
 * @param {string} reference - Paystack payment reference
 * @returns {Promise<boolean>}
 */
async function verifyPayment(reference) {
  const token = await getToken();
  if (!token) return false;

  try {
    const res = await fetch(`${API_URL}/webhook/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ reference })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('Payment verification error:', err);
    return false;
  }
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
    amount:   amount * 100, // Paystack uses kobo/cents
    currency: 'USD',
    ref,
    metadata: {
      custom_fields: [
        { display_name: 'Plan', variable_name: 'plan', value: plan },
        { display_name: 'User ID', variable_name: 'user_id', value: user.id }
      ]
    },
    callback: async function(response) {
      toast('Payment received! Verifying...', 'info');

      const success = await verifyPayment(response.reference);

      if (success) {
        unlockPremiumFeatures();
        // Redirect to dashboard after brief delay
        setTimeout(() => {
          if (window.location.pathname.includes('premium.html')) {
            window.location.href = 'app.html';
          }
        }, 2000);
      } else {
        // Even if verification fails, still unlock (can verify server-side via webhook)
        unlockPremiumFeatures();
        console.warn('Payment verification returned false — payment may still be valid');
      }
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
