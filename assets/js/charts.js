/**
 * charts.js — Chart.js visualization module
 * Renders the spending donut chart and net worth line chart
 */

/** @type {Chart|null} Spending donut chart instance */
let spendingChart = null;

/** @type {Chart|null} Net worth line chart instance */
let networthChart = null;

// Category colors matching the design system
const CATEGORY_COLORS = {
  'Food & Drink':  '#FF6B6B',
  'Transport':     '#4ECDC4',
  'Entertainment': '#45B7D1',
  'Bills':         '#96CEB4',
  'Health':        '#FFEAA7',
  'Shopping':      '#DDA0DD',
  'Other':         '#98D8C8',
  'Income':        '#00D98B'
};

/**
 * Configure Chart.js global defaults for dark theme
 */
function configureChartDefaults() {
  if (!window.Chart) return;

  Chart.defaults.color = '#8896A7';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
}

/**
 * Build spending data from transactions for the current period
 * @param {Array<Object>} transactions
 * @param {string} period - 'week' | 'month' | 'year'
 * @returns {{labels: string[], data: number[], colors: string[]}}
 */
function buildSpendingData(transactions, period = 'month') {
  const now    = new Date();
  const filtered = transactions.filter(tx => {
    if (tx.type !== 'expense') return false;
    const d = new Date(tx.date);
    if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    }
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (period === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // Aggregate by category
  const catMap = {};
  filtered.forEach(tx => {
    catMap[tx.category] = (catMap[tx.category] || 0) + parseFloat(tx.amount);
  });

  const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  return {
    labels: entries.map(([cat]) => cat),
    data:   entries.map(([, amt]) => amt),
    colors: entries.map(([cat]) => CATEGORY_COLORS[cat] || '#98D8C8'),
    total:  entries.reduce((s, [, a]) => s + a, 0)
  };
}

/**
 * Initialize or update the spending donut chart
 * @param {Array<Object>} transactions
 * @param {string} period
 */
export function renderSpendingChart(transactions, period = 'month') {
  if (!window.Chart) return;
  configureChartDefaults();

  const canvas = document.getElementById('spending-chart');
  if (!canvas) return;

  const { labels, data, colors, total } = buildSpendingData(transactions, period);

  // Update total display
  const totalEl = document.getElementById('donut-total');
  if (totalEl) {
    totalEl.textContent = `$${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  // Destroy existing chart
  if (spendingChart) {
    spendingChart.destroy();
    spendingChart = null;
  }

  // Empty state
  if (data.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 10, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 24;
    ctx.stroke();
    renderLegend([], []);
    return;
  }

  const ctx = canvas.getContext('2d');
  spendingChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: '#111827',
        borderWidth: 3,
        hoverBorderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ` ${ctx.label}: $${ctx.parsed.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${pct}%)`;
            }
          },
          backgroundColor: '#111827',
          borderColor: 'rgba(127,255,212,0.2)',
          borderWidth: 1,
          titleColor: '#F0F4F8',
          bodyColor: '#8896A7',
          padding: 12
        }
      }
    }
  });

  renderLegend(labels, data, colors, total);
}

/**
 * Render the chart legend below the donut
 * @param {string[]} labels
 * @param {number[]} data
 * @param {string[]} colors
 * @param {number} total
 */
function renderLegend(labels, data, colors, total = 0) {
  const legend = document.getElementById('chart-legend');
  if (!legend) return;

  if (labels.length === 0) {
    legend.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem;text-align:center;">No expenses this period</p>';
    return;
  }

  legend.innerHTML = labels.map((label, i) => {
    const pct = total > 0 ? ((data[i] / total) * 100).toFixed(0) : 0;
    const amt = `$${data[i].toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    return `
      <div class="legend-item" role="listitem">
        <div class="legend-dot" style="background:${colors[i]};" aria-hidden="true"></div>
        <span class="legend-label">${label}</span>
        <span class="legend-value">${amt}</span>
        <span style="color:var(--text-muted);font-size:0.75rem;margin-left:0.25rem;">${pct}%</span>
      </div>
    `;
  }).join('');
}

/**
 * Initialize or update the net worth line chart
 * @param {Array<{snapshot_date: string, net_worth: number}>} snapshots
 */
export function renderNetWorthChart(snapshots) {
  if (!window.Chart) return;
  configureChartDefaults();

  const canvas = document.getElementById('networth-chart');
  if (!canvas) return;

  // Destroy existing
  if (networthChart) {
    networthChart.destroy();
    networthChart = null;
  }

  // Fallback empty data
  let labels = [], values = [];
  if (!snapshots || snapshots.length === 0) {
    const today = new Date();
    labels = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today);
      d.setMonth(today.getMonth() - (5 - i));
      return d.toLocaleDateString('en-US', { month: 'short' });
    });
    values = [0, 0, 0, 0, 0, 0];
  } else {
    const sorted = [...snapshots].sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date));
    labels = sorted.map(s => new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    values = sorted.map(s => parseFloat(s.net_worth));
  }

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 240);
  gradient.addColorStop(0, 'rgba(127, 255, 212, 0.2)');
  gradient.addColorStop(1, 'rgba(127, 255, 212, 0)');

  networthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Net Worth',
        data: values,
        borderColor: '#7FFFD4',
        borderWidth: 2.5,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#7FFFD4',
        pointBorderColor: '#111827',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#8896A7', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#8896A7',
            font: { size: 11 },
            callback: (v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Net Worth: $${ctx.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
          },
          backgroundColor: '#111827',
          borderColor: 'rgba(127,255,212,0.2)',
          borderWidth: 1,
          titleColor: '#F0F4F8',
          bodyColor: '#7FFFD4',
          padding: 12
        }
      }
    }
  });
}

/**
 * Expose updateCharts globally for the dashboard period selector
 */
window.updateCharts = function() {
  const period = document.getElementById('chart-period')?.value || 'month';
  const txs    = window.getTransactions ? window.getTransactions() : [];
  renderSpendingChart(txs, period);
};
