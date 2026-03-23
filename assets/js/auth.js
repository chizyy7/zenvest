/**
 * auth.js — Supabase authentication module
 * Handles login, signup, logout, Google OAuth, and session management
 */

/** @type {import('@supabase/supabase-js').SupabaseClient} */
let supabase = null;

// ============================================================
// Configuration
// Supabase credentials stored in environment / page config
// ============================================================
const SUPABASE_URL = window.SUPABASE_URL || 'https://qdazhhqahfcgsighktru.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_secret_Xqz8iH2yADfrO1q_GTnOFQ_jrNHajKw';
const API_URL = window.API_URL || 'https://zenvest-api.railway.app';

/**
 * Initialize the Supabase client
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function initSupabase() {
  if (!supabase && window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

/**
 * Get the current authenticated session
 * @returns {Promise<import('@supabase/supabase-js').Session|null>}
 */
export async function getSession() {
  const client = initSupabase();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session;
}

/**
 * Get the current authenticated user
 * @returns {Promise<import('@supabase/supabase-js').User|null>}
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Get the JWT access token for API calls
 * @returns {Promise<string|null>}
 */
export async function getToken() {
  const session = await getSession();
  return session?.access_token ?? null;
}

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{data: any, error: any}>}
 */
export async function signIn(email, password) {
  const client = initSupabase();
  if (!client) return { data: null, error: new Error('Supabase not initialized') };
  return await client.auth.signInWithPassword({ email, password });
}

/**
 * Sign up with email, password and display name
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @returns {Promise<{data: any, error: any}>}
 */
export async function signUp(email, password, name) {
  const client = initSupabase();
  if (!client) return { data: null, error: new Error('Supabase not initialized') };
  return await client.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, name }
    }
  });
}

/**
 * Sign in with Google OAuth
 * @returns {Promise<{data: any, error: any}>}
 */
export async function signInWithGoogle() {
  const client = initSupabase();
  if (!client) return { data: null, error: new Error('Supabase not initialized') };
  return await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '')}/app.html`
    }
  });
}

/**
 * Send a password reset email
 * @param {string} email
 * @returns {Promise<{data: any, error: any}>}
 */
export async function resetPassword(email) {
  const client = initSupabase();
  if (!client) return { data: null, error: new Error('Supabase not initialized') };
  return await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '')}/login.html`
  });
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export async function signOut() {
  const client = initSupabase();
  if (client) await client.auth.signOut();
  localStorage.removeItem('zenvest_token');
  localStorage.removeItem('zenvest_user');
  window.location.href = 'index.html';
}

/**
 * Check if user is authenticated. Redirects to login if not.
 * @returns {Promise<import('@supabase/supabase-js').User|null>}
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

/**
 * Get the user's display name from their profile
 * @param {import('@supabase/supabase-js').User} user
 * @returns {string}
 */
export function getUserDisplayName(user) {
  if (!user) return 'User';
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User'
  );
}

/**
 * Check if user is premium by querying the users table
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function checkIsPremium(userId) {
  const client = initSupabase();
  if (!client) return false;

  const { data, error } = await client
    .from('users')
    .select('is_premium')
    .eq('id', userId)
    .single();

  if (error || !data) return false;
  return data.is_premium === true;
}

// ============================================================
// Form Handlers (for login.html)
// ============================================================

/**
 * Display a toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function toast(message, type = 'info') {
  if (window.showToast) {
    window.showToast(message, type);
    return;
  }
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

/**
 * Set a button to loading state
 * @param {HTMLButtonElement} btn
 * @param {boolean} loading
 * @param {string} originalText
 */
function setLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;"></span> Loading...';
  } else {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ---- Login Form ----
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');

    if (!email || !password) {
      toast('Please fill in all fields', 'error');
      return;
    }

    setLoading(btn, true, 'Sign In');
    const { data, error } = await signIn(email, password);
    setLoading(btn, false, 'Sign In');

    if (error) {
      toast(error.message || 'Sign in failed', 'error');
      return;
    }

    toast('Welcome back! 👋', 'success');

    // Check if user has completed onboarding
    const profile = localStorage.getItem('zenvest_profile');
    setTimeout(() => {
      window.location.href = profile ? 'app.html' : 'onboarding.html';
    }, 800);
  });
}

// ---- Sign Up Form ----
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('signup-name').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const btn      = document.getElementById('signup-btn');

    if (!name || !email || !password) {
      toast('Please fill in all fields', 'error');
      return;
    }
    if (password.length < 8) {
      toast('Password must be at least 8 characters', 'error');
      return;
    }

    setLoading(btn, true, 'Create Account');
    const { data, error } = await signUp(email, password, name);
    setLoading(btn, false, 'Create Account');

    if (error) {
      toast(error.message || 'Sign up failed', 'error');
      return;
    }

    toast('Account created! Check your email to verify. 🎉', 'success');
    setTimeout(() => { window.location.href = 'onboarding.html'; }, 1500);
  });
}

// ---- Forgot Password Form ----
const forgotForm = document.getElementById('forgot-form');
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) {
      toast('Please enter your email', 'error');
      return;
    }

    const { error } = await resetPassword(email);
    if (error) {
      toast(error.message || 'Failed to send reset email', 'error');
    } else {
      toast('Password reset email sent! Check your inbox. 📧', 'success');
    }
  });
}

// ---- Google Sign In Button ----
window.signInWithGoogle = async function() {
  const { error } = await signInWithGoogle();
  if (error) toast(error.message || 'Google sign in failed', 'error');
};

// ---- Global sign out ----
window.signOut = signOut;

// ---- On page load: redirect if already authenticated ----
(async function redirectIfAuthed() {
  if (window.location.pathname.endsWith('login.html')) {
    const user = await getCurrentUser();
    if (user) {
      const profile = localStorage.getItem('zenvest_profile');
      window.location.href = profile ? 'app.html' : 'onboarding.html';
    }
  }
})();
