/**
 * goals.js — Financial goals CRUD and display module
 * Manages creating, updating, and rendering goal progress cards
 */

import { getToken } from './auth.js';
import { escapeHtml, showToast as toast } from './utils.js';

const API_URL = window.API_URL || 'https://zenvest-production.up.railway.app';

/** @type {Array<Object>} In-memory goals cache */
let goals = [];

// Goal category metadata
const GOAL_CATEGORIES = {
  'Emergency Fund': { icon: '🛡️', color: '#00D98B' },
  'House Deposit':  { icon: '🏠', color: '#7FFFD4' },
  'Travel':         { icon: '✈️', color: '#45B7D1' },
  'Education':      { icon: '📚', color: '#8B5CF6' },
  'Retirement':     { icon: '👴', color: '#F5C842' },
  'Custom':         { icon: '⭐', color: '#FF6B6B' }
};

/**
 * Get days remaining until a deadline
 * @param {string} deadline - ISO date string
 * @returns {number|null}
 */
function getDaysRemaining(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// escapeHtml and toast imported from utils.js above

/**
 * Fetch goals from the API
 * @returns {Promise<Array<Object>>}
 */
export async function fetchGoals() {
  const token = await getToken();
  if (!token) return [];

  try {
    const res = await fetch(`${API_URL}/goals`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    goals = Array.isArray(data) ? data : data.goals || [];
    return goals;
  } catch (err) {
    console.error('Failed to fetch goals:', err);
    return goals;
  }
}

/**
 * Create a new goal
 * @param {Object} goalData
 * @returns {Promise<Object|null>}
 */
export async function createGoal(goalData) {
  const token = await getToken();
  if (!token) return null;

  const res = await fetch(`${API_URL}/goals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(goalData)
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const goal = await res.json();
  goals.unshift(goal);
  return goal;
}

/**
 * Update an existing goal
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<Object|null>}
 */
export async function updateGoal(id, updates) {
  const token = await getToken();
  if (!token) return null;

  const res = await fetch(`${API_URL}/goals/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const updated = await res.json();
  const idx = goals.findIndex(g => g.id === id);
  if (idx !== -1) goals[idx] = updated;
  return updated;
}

/**
 * Delete a goal by ID
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteGoal(id) {
  const token = await getToken();
  if (!token) return false;

  const res = await fetch(`${API_URL}/goals/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) return false;
  goals = goals.filter(g => g.id !== id);
  return true;
}

/**
 * Render a single goal card
 * @param {Object} goal
 * @returns {string} HTML string
 */
function renderGoalCard(goal) {
  const meta     = GOAL_CATEGORIES[goal.category] || { icon: '⭐', color: '#7FFFD4' };
  const current  = parseFloat(goal.current_amount) || 0;
  const target   = parseFloat(goal.target_amount)  || 1;
  const pct      = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);
  const days     = getDaysRemaining(goal.deadline);
  const isComplete = goal.is_completed || pct >= 100;

  const milestoneMsg = getMilestoneMessage(pct, goal.name);

  return `
    <div class="goal-card ${isComplete ? 'completed' : ''}" data-id="${goal.id}" role="article" aria-label="${escapeHtml(goal.name)} goal">
      <div class="goal-header">
        <div>
          <span class="goal-icon" aria-hidden="true">${meta.icon}</span>
          <p class="goal-name">${escapeHtml(goal.name)}</p>
          <span class="badge" style="background:${meta.color}22;color:${meta.color};border:1px solid ${meta.color}44;font-size:0.6875rem;margin-top:0.25rem;">
            ${escapeHtml(goal.category)}
          </span>
        </div>
        <div style="display:flex;gap:0.25rem;flex-shrink:0;">
          <button class="btn btn-icon btn-ghost btn-sm" onclick="editGoal('${goal.id}')" aria-label="Edit goal" title="Edit">✏️</button>
          <button class="btn btn-icon btn-danger btn-sm" onclick="confirmDeleteGoal('${goal.id}')" aria-label="Delete goal" title="Delete">🗑️</button>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="progress-bar-container" style="margin:0.875rem 0 0.5rem;" role="progressbar"
        aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${pct}% complete">
        <div class="progress-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,${meta.color},${meta.color}99);"
          data-target-width="${pct}"></div>
      </div>

      <div class="goal-meta">
        <span class="goal-percent">${pct}% complete</span>
        ${days !== null ? `<span>${days === 0 ? '🎯 Due today' : `${days} days left`}</span>` : ''}
      </div>

      <div class="goal-amounts">
        <span class="goal-current" style="color:${meta.color};">$${current.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        <span class="goal-target">/ $${target.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>

      <p style="font-size:0.8125rem;color:var(--text-muted);margin-top:0.375rem;">
        $${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} remaining
      </p>

      ${milestoneMsg ? `
        <div style="margin-top:0.875rem;padding:0.75rem;background:${meta.color}11;border:1px solid ${meta.color}33;border-radius:var(--radius-sm);font-size:0.8125rem;color:${meta.color};">
          🤖 ${escapeHtml(milestoneMsg)}
        </div>
      ` : ''}

      ${!isComplete ? `
        <button class="btn btn-outline-zen btn-sm" style="width:100%;margin-top:0.875rem;border-color:${meta.color}44;color:${meta.color};"
          onclick="quickAddAmount('${goal.id}')">
          + Add Progress
        </button>
      ` : `
        <div style="text-align:center;margin-top:0.875rem;padding:0.5rem;background:rgba(0,217,139,0.1);border-radius:var(--radius-sm);">
          <span style="color:var(--color-profit);font-weight:600;">🎉 Goal Achieved!</span>
        </div>
      `}
    </div>
  `;
}

/**
 * Get a motivational AI message for milestone percentages
 * @param {number} pct
 * @param {string} goalName
 * @returns {string|null}
 */
function getMilestoneMessage(pct, goalName) {
  if (pct >= 100) return `You hit your ${goalName} goal! Incredible work! 🎉`;
  if (pct >= 75)  return `You're 75% of the way there! Just a little more — you've got this! 💪`;
  if (pct >= 50)  return `Halfway there! Keep up the momentum. You're doing great! 🌟`;
  if (pct >= 25)  return `Great start! 25% complete. Every contribution counts! 🚀`;
  return null;
}

/**
 * Trigger confetti animation for completed goals
 */
function triggerConfetti() {
  const colors = ['#7FFFD4', '#F5C842', '#8B5CF6', '#00D98B', '#FF6B6B'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}vw;
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration: ${2 + Math.random() * 2}s;
      animation-delay: ${Math.random() * 0.5}s;
    `;
    document.body.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}

/**
 * Render all goals in the goals grid
 * @param {Array<Object>} goalList
 * @param {boolean} isPremium
 */
export function renderGoals(goalList, isPremium = false) {
  const grid  = document.getElementById('goals-grid');
  const empty = document.getElementById('goals-empty');
  const lock  = document.getElementById('goals-lock');

  if (!grid) return;

  // Show premium lock for free users
  if (!isPremium) {
    if (lock) lock.style.display = 'flex';
    return;
  }

  if (lock) lock.style.display = 'none';

  if (goalList.length === 0) {
    grid.innerHTML  = '';
    if (empty) empty.style.display = 'flex';
    return;
  }

  if (empty) empty.style.display = 'none';
  grid.innerHTML = goalList.map(renderGoalCard).join('');

  // Animate progress bars after render
  requestAnimationFrame(() => {
    grid.querySelectorAll('.progress-bar-fill[data-target-width]').forEach(bar => {
      bar.style.width = '0%';
      setTimeout(() => {
        bar.style.transition = 'width 0.8s cubic-bezier(0.4,0,0.2,1)';
        bar.style.width = `${bar.dataset.targetWidth}%`;
      }, 100);
    });
  });
}

// ============================================================
// Goal Form Handler
// ============================================================
const goalForm = document.getElementById('goal-form');
if (goalForm) {
  goalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId   = document.getElementById('goal-edit-id').value;
    const name     = document.getElementById('goal-name').value.trim();
    const category = document.getElementById('goal-category').value;
    const target   = parseFloat(document.getElementById('goal-target').value);
    const current  = parseFloat(document.getElementById('goal-current').value) || 0;
    const deadline = document.getElementById('goal-deadline').value;

    if (!name) { toast('Please enter a goal name', 'error'); return; }
    if (!target || target <= 0) { toast('Please enter a valid target amount', 'error'); return; }

    try {
      const goalData = { name, category, target_amount: target, current_amount: current, deadline };

      if (editId) {
        const updated = await updateGoal(editId, goalData);
        toast('Goal updated ✅', 'success');
        if (updated && parseFloat(updated.current_amount) >= parseFloat(updated.target_amount)) {
          triggerConfetti();
        }
      } else {
        await createGoal(goalData);
        toast('Goal created! 🎯', 'success');
      }

      closeModal('goal-modal');
      const isPremium = localStorage.getItem('zenvest_premium') === 'true';
      renderGoals(goals, isPremium);
    } catch (err) {
      toast(err.message || 'Failed to save goal', 'error');
    }
  });
}

/**
 * Open the goal edit modal
 * @param {string} id - Goal ID
 */
window.editGoal = function(id) {
  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  document.getElementById('goal-edit-id').value   = id;
  document.getElementById('modal-title-goal').textContent = 'Edit Goal';
  document.getElementById('goal-name').value      = goal.name;
  document.getElementById('goal-category').value  = goal.category;
  document.getElementById('goal-target').value    = goal.target_amount;
  document.getElementById('goal-current').value   = goal.current_amount;
  document.getElementById('goal-deadline').value  = goal.deadline || '';
  openModal('goal-modal');
};

/**
 * Confirm and delete a goal
 * @param {string} id - Goal ID
 */
window.confirmDeleteGoal = async function(id) {
  if (!confirm('Delete this goal? This cannot be undone.')) return;
  const ok = await deleteGoal(id);
  if (ok) {
    toast('Goal deleted', 'success');
    const isPremium = localStorage.getItem('zenvest_premium') === 'true';
    renderGoals(goals, isPremium);
  } else {
    toast('Failed to delete goal', 'error');
  }
};

/**
 * Open a quick "add progress" modal for a goal
 * @param {string} id - Goal ID
 */
window.quickAddAmount = function(id) {
  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  const amount = prompt(`How much would you like to add to "${goal.name}"?`, '');
  if (!amount) return;

  const add = parseFloat(amount);
  if (isNaN(add) || add <= 0) {
    toast('Please enter a valid amount', 'error');
    return;
  }

  const newCurrent = parseFloat(goal.current_amount) + add;
  updateGoal(id, { current_amount: newCurrent }).then(updated => {
    if (updated) {
      toast(`Added $${add.toFixed(2)} to "${goal.name}" 🎯`, 'success');
      if (newCurrent >= parseFloat(goal.target_amount)) {
        triggerConfetti();
        toast(`🎉 Goal "${goal.name}" completed! Amazing!`, 'success');
      }
      const isPremium = localStorage.getItem('zenvest_premium') === 'true';
      renderGoals(goals, isPremium);
    }
  }).catch(err => toast(err.message, 'error'));
};

// ============================================================
// Initialization
// ============================================================
(async function initGoals() {
  if (!document.getElementById('goals-grid')) return;

  const isPremium = localStorage.getItem('zenvest_premium') === 'true';
  const goalList  = await fetchGoals();
  renderGoals(goalList, isPremium);
})();
