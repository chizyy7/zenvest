/**
 * reports.js — PDF financial report generation module
 * Generates and downloads monthly financial reports
 * PDF is generated server-side via Python reportlab
 */

import { getToken } from './auth.js';
import { showToast as toast } from './utils.js';

const API_URL = window.API_URL || 'https://zenvest-api.railway.app';

// toast imported from utils.js above

/**
 * Generate and download a PDF financial report for a given month
 * @param {string} monthYear - Format: 'YYYY-MM'
 * @param {boolean} emailReport - Whether to email the report instead of downloading
 * @returns {Promise<void>}
 */
export async function generateReport(monthYear, emailReport = false) {
  const isPremium = localStorage.getItem('zenvest_premium') === 'true';
  if (!isPremium) {
    toast('PDF reports require a Premium subscription 💎', 'info');
    if (window.showView) window.showView('upgrade');
    return;
  }

  const token = await getToken();
  if (!token) {
    toast('Please sign in to generate reports', 'error');
    return;
  }

  const btn = document.getElementById('generate-report-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;"></span> Generating...';
  }

  toast('Generating your PDF report...', 'info');

  try {
    const res = await fetch(`${API_URL}/reports/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        month_year: monthYear,
        email: emailReport
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    if (emailReport) {
      const data = await res.json();
      toast(data.message || 'Report sent to your email! 📧', 'success');
    } else {
      // Download as PDF
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `zenvest-report-${monthYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Report downloaded! 📄', 'success');
    }
  } catch (err) {
    console.error('Report generation error:', err);
    toast('Failed to generate report. Try again.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Download PDF Report';
    }
  }
}

/**
 * Get the current month in YYYY-MM format
 * @returns {string}
 */
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Render the reports section in the settings view
 */
export function renderReportsSection() {
  const container = document.getElementById('reports-section');
  if (!container) return;

  const isPremium = localStorage.getItem('zenvest_premium') === 'true';

  if (!isPremium) {
    container.innerHTML = `
      <div class="card" style="position:relative;">
        <h2 class="section-title" style="margin-bottom:0.5rem;">📄 PDF Reports</h2>
        <p style="color:var(--text-secondary);font-size:0.9375rem;margin-bottom:1.25rem;">
          Generate professional PDF reports of your monthly finances.
        </p>
        <div class="premium-lock" style="position:static;display:flex;background:none;padding:0;">
          <button class="btn btn-gold" onclick="showView('upgrade')">
            Upgrade for PDF Reports
          </button>
        </div>
      </div>
    `;
    return;
  }

  const currentMonth = getCurrentMonth();

  container.innerHTML = `
    <div class="card">
      <h2 class="section-title" style="margin-bottom:0.5rem;">📄 PDF Financial Reports</h2>
      <p style="color:var(--text-secondary);font-size:0.9375rem;margin-bottom:1.25rem;">
        Download a professional PDF report of any month — including spending breakdown,
        net worth, goal progress, and AI insights.
      </p>

      <div class="form-group" style="margin-bottom:1rem;">
        <label class="form-label" for="report-month">Select Month</label>
        <input type="month" id="report-month" class="form-input" value="${currentMonth}"
          style="max-width:240px;" aria-label="Select month for report" />
      </div>

      <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
        <button class="btn btn-zen" id="generate-report-btn" onclick="downloadReport()">
          📥 Download PDF Report
        </button>
        <button class="btn btn-ghost" onclick="emailReport()">
          📧 Email to me
        </button>
      </div>
    </div>
  `;
}

/**
 * Global handler: download PDF report
 */
window.downloadReport = function() {
  const monthInput = document.getElementById('report-month');
  const month = monthInput ? monthInput.value : getCurrentMonth();
  generateReport(month, false);
};

/**
 * Global handler: email PDF report
 */
window.emailReport = function() {
  const monthInput = document.getElementById('report-month');
  const month = monthInput ? monthInput.value : getCurrentMonth();
  generateReport(month, true);
};
