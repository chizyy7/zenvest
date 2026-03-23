/**
 * ai.js — AI Insights chat interface module
 * Handles communication with the Zen AI financial advisor (GPT-4o backend)
 */

import { getToken } from './auth.js';
import { escapeHtml, showToast as toast } from './utils.js';

const API_URL = window.API_URL || 'https://zenvest-production.up.railway.app';

/** @type {Array<{role: 'user'|'ai', content: string}>} Chat history */
const chatHistory = [];

/** @type {boolean} Whether a message is currently being processed */
let isLoading = false;

// escapeHtml and toast imported from utils.js above

/**
 * Append a message bubble to the chat
 * @param {'user'|'ai'} role
 * @param {string} content
 * @param {boolean} isTyping - Show typing indicator instead of content
 * @returns {HTMLElement} The message element
 */
function appendMessage(role, content, isTyping = false) {
  const messages = document.getElementById('ai-messages');
  if (!messages) return null;

  const msg = document.createElement('div');
  msg.className = `chat-message ${role}`;

  const avatar = role === 'ai'
    ? '<div class="ai-avatar" style="width:28px;height:28px;font-size:0.875rem;flex-shrink:0;" aria-hidden="true">🤖</div>'
    : '';

  if (isTyping) {
    msg.innerHTML = `
      ${avatar}
      <div class="chat-bubble" aria-live="polite" aria-label="Zen is typing">
        <span style="display:inline-flex;gap:4px;align-items:center;">
          <span style="animation:bounce 1s ease infinite;width:6px;height:6px;border-radius:50%;background:var(--color-zen);display:inline-block;"></span>
          <span style="animation:bounce 1s ease 0.2s infinite;width:6px;height:6px;border-radius:50%;background:var(--color-zen);display:inline-block;"></span>
          <span style="animation:bounce 1s ease 0.4s infinite;width:6px;height:6px;border-radius:50%;background:var(--color-zen);display:inline-block;"></span>
        </span>
      </div>
    `;
  } else {
    // Sanitize multiline content (replace newlines with <br>)
    const safeContent = escapeHtml(content).replace(/\n/g, '<br>');
    msg.innerHTML = `${avatar}<div class="chat-bubble">${safeContent}</div>`;
  }

  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
  return msg;
}

/**
 * Send a message to the AI and stream back a response
 * @param {string} message
 */
async function sendMessage(message) {
  if (!message.trim() || isLoading) return;

  isLoading = true;

  // Clear input
  const input = document.getElementById('ai-input');
  if (input) input.value = '';

  // Add user message
  chatHistory.push({ role: 'user', content: message });
  appendMessage('user', message);

  // Show typing indicator
  const typingEl = appendMessage('ai', '', true);

  const token = await getToken();

  try {
    let aiResponse;

    if (!token) {
      // Demo mode without auth
      aiResponse = getDemoResponse(message);
    } else {
      // Call backend
      const transactions = window.getTransactions ? window.getTransactions() : [];

      const res = await fetch(`${API_URL}/insights/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          history: chatHistory.slice(-10), // last 10 messages for context
          transactions: transactions.slice(-50) // last 50 transactions
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      aiResponse = data.response || data.message || 'I could not process your request.';
    }

    // Remove typing indicator and show real response
    if (typingEl) typingEl.remove();
    chatHistory.push({ role: 'ai', content: aiResponse });
    appendMessage('ai', aiResponse);

  } catch (err) {
    console.error('AI chat error:', err);
    if (typingEl) typingEl.remove();
    const fallback = getFallbackResponse(message);
    chatHistory.push({ role: 'ai', content: fallback });
    appendMessage('ai', fallback);
  } finally {
    isLoading = false;
  }
}

/**
 * Get a demo response for common questions (no API needed)
 * @param {string} message
 * @returns {string}
 */
function getDemoResponse(message) {
  const lower = message.toLowerCase();

  if (lower.includes('save') || lower.includes('saving')) {
    return "Great question! Here are 3 quick wins to save more:\n\n• Track your daily coffee and food spending — small amounts add up fast\n• Set up automatic transfers to savings on payday (pay yourself first!)\n• Review your subscriptions monthly and cancel unused ones\n\nEven saving $50/month compounds significantly over time. 🌱";
  }
  if (lower.includes('invest') || lower.includes('investment')) {
    return "Based on general principles: start with an emergency fund (3-6 months expenses), then consider low-cost index funds like S&P 500 ETFs. They historically return 8-12% annually with minimal effort.\n\nKey rule: time in the market beats timing the market. Start small, stay consistent! 📈";
  }
  if (lower.includes('budget') || lower.includes('spending')) {
    return "The 50/30/20 rule is a great starting point:\n\n• 50% — Needs (rent, food, utilities)\n• 30% — Wants (entertainment, dining out)\n• 20% — Savings & investments\n\nLooking at your transactions will give you a clearer picture of where your money actually goes! 💰";
  }
  if (lower.includes('goal') || lower.includes('track')) {
    return "Setting SMART financial goals works best:\n\n• Specific: 'Save $5,000 for emergency fund'\n• Measurable: Track progress weekly\n• Achievable: Break into monthly targets\n• Relevant: Aligned with your life priorities\n• Time-bound: Set a clear deadline\n\nSmall consistent actions beat big sporadic ones every time! 🎯";
  }

  return "I'm Zen, your AI financial advisor. I'm here to help you think clearly about your finances.\n\nTry asking me:\n• 'How can I save more money?'\n• 'What's a good investment strategy for beginners?'\n• 'How do I build an emergency fund?'\n\nWhat's on your mind? 🌱";
}

/**
 * Get a fallback response when the API fails
 * @param {string} message
 * @returns {string}
 */
function getFallbackResponse(message) {
  return "I'm having a moment — let me gather my thoughts. 🧘\n\nTry refreshing and asking again. In the meantime, remember: the best financial decision is the one you make consistently, not perfectly.";
}

/**
 * Show the premium lock overlay for free users
 */
function showPremiumLock() {
  const lock = document.getElementById('ai-lock');
  if (lock) lock.style.display = 'flex';
}

/**
 * Initialize the AI chat interface
 * @param {boolean} isPremium
 */
export function initAIChat(isPremium = false) {
  if (!isPremium) {
    showPremiumLock();
    return;
  }

  // Load initial insights if transactions are available
  setTimeout(() => {
    const txCount = window.getTransactions ? window.getTransactions().length : 0;
    if (txCount > 0) {
      appendMessage('ai', `I can see you have ${txCount} transactions tracked. Would you like me to analyze your spending patterns and give you some personalized insights? Just ask! 📊`);
    }
  }, 500);
}

// ============================================================
// Event handlers — exposed globally for app.html inline handlers
// ============================================================

/**
 * Send a message from the input field
 */
window.sendAiMessage = function() {
  const input = document.getElementById('ai-input');
  if (!input) return;
  const message = input.value.trim();
  if (!message) return;
  sendMessage(message);
};

/**
 * Send a pre-defined quick message
 * @param {string} message
 */
window.sendQuickMessage = function(message) {
  sendMessage(message);
};

// ============================================================
// CSS for typing bounce animation (injected once)
// ============================================================
(function injectBounceStyle() {
  if (document.getElementById('bounce-style')) return;
  const style = document.createElement('style');
  style.id = 'bounce-style';
  style.textContent = `
    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30%            { transform: translateY(-6px); }
    }
  `;
  document.head.appendChild(style);
})();

// ============================================================
// Initialization
// ============================================================
(async function initAI() {
  if (!document.getElementById('ai-messages')) return;

  const isPremium = localStorage.getItem('zenvest_premium') === 'true';
  initAIChat(isPremium);
})();
