/* =============================================================================
   FinMate - Application Logic
   Handles all page rendering, API calls, state management, and interactions
   ============================================================================= */

// =============================================================================
// STATE
// =============================================================================
let currentPage = 'dashboard';
let dashboardData = null;
let chartInstances = {};
let selectedBankId = null;
let selectedAccountId = null;
let syncedTransactions = [];
let statementTransactions = [];
let presentationMode = false;

const CATEGORY_COLORS = {
  'Food & Dining': '#a855f7',
  'Shopping': '#38bdf8',
  'Transport': '#22d3ee',
  'Entertainment': '#f472b6',
  'Bills & Utilities': '#818cf8',
  'Health': '#2dd4bf',
  'Education': '#fbbf24',
  'Salary': '#2dd4bf',
  'Freelance': '#38bdf8',
  'Investment Returns': '#c084fc',
  'Cash': '#94a3b8',
  'Transfer': '#fb7185',
  'Other': '#64748b',
  'Uncategorized': '#64748b'
};

// =============================================================================
// UTILITIES
// =============================================================================
function formatCurrency(amount) {
  const abs = Math.abs(amount);
  if (abs >= 100000) return '₹' + (abs / 100000).toFixed(1) + 'L';
  return '₹' + abs.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hours ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

async function apiCall(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return null;
  }
}


// =============================================================================
// NAVIGATION
// =============================================================================
function navigateTo(page) {
  currentPage = page;

  // Update sidebar
  document.querySelectorAll('.nav-item').forEach(item => {
    const active = item.dataset.page === page;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });

  // Show page
  document.querySelectorAll('.page-container').forEach(p => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });

  // Scroll to top
  document.getElementById('mainContent').scrollTop = 0;

  setSidebarOpen(false);
  const heading = document.querySelector('#page-' + page + ' h1');
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });

  loadPage(page);
}

const mobileNavigation = window.matchMedia('(max-width: 768px)');

function setSidebarOpen(open, restoreFocus = false) {
  const sidebar = document.getElementById('sidebar');
  const menu = document.getElementById('menuToggle');
  const isOpen = mobileNavigation.matches && open;
  sidebar.classList.toggle('open', isOpen);
  sidebar.inert = mobileNavigation.matches && !isOpen;
  document.getElementById('sidebarOverlay').classList.toggle('active', isOpen);
  document.getElementById('mainContent').inert = isOpen;
  menu.closest('header').inert = isOpen;
  menu.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) sidebar.querySelector('.sidebar-close').focus();
  else if (restoreFocus) menu.focus();
}

function toggleSidebar() {
  const open = document.getElementById('sidebar').classList.contains('open');
  setSidebarOpen(!open, open);
}

mobileNavigation.addEventListener('change', () => setSidebarOpen(false));

document.addEventListener('keydown', event => {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar.classList.contains('open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    setSidebarOpen(false, true);
  }
  if (event.key === 'Tab') {
    const buttons = sidebar.querySelectorAll('button');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

async function loadPage(page) {
  switch (page) {
    case 'dashboard': await loadDashboard(); break;
    case 'transactions': await loadTransactions(); break;
    case 'connect-bank': await loadConnectBank(); break;
    case 'analytics': await loadAnalytics(); break;
    case 'investments': await loadInvestments(); break;
    case 'budgets': await loadBudgets(); break;
    case 'goals': await loadGoals(); break;
    case 'ai-advisor': await loadAIAdvisor(); break;
    case 'notifications': await loadNotifications(); break;
    case 'settings': await loadSettingsAccounts(); break;
    case 'monthly-report': /* loaded on demand */ break;
  }
}



// =============================================================================
// DASHBOARD
// =============================================================================
async function loadDashboard() {
  const status = document.getElementById('dashboardStatus');
  status.textContent = 'Loading dashboard…';
  const data = await apiCall('/api/dashboard');
  status.textContent = data?.summary ? '' : 'Could not load the dashboard. Please try again.';
  document.getElementById('dashboardRetry').hidden = Boolean(data?.summary);
  if (!data?.summary) return;
  dashboardData = data;

  // Summary
  document.getElementById('dashTotalBalance').textContent = formatCurrency(data.summary.total_balance);
  document.getElementById('dashAccountCount').textContent = `Across ${data.summary.account_count} connected accounts`;
  document.getElementById('dashIncome').textContent = formatCurrency(data.summary.income);
  document.getElementById('dashExpenses').textContent = formatCurrency(data.summary.expenses);
  const savings = document.getElementById('dashSavings');
  savings.textContent = (data.summary.savings < 0 ? '−' : '') + formatCurrency(data.summary.savings);
  savings.classList.toggle('negative', data.summary.savings < 0);

  // Hydrate Cosmic Hero Float Metrics & AI Insight Card
  const inc = data.summary.income || 0;
  const sav = data.summary.savings || 0;
  const savPct = inc > 0 ? Math.round((sav / inc) * 100) : 0;
  const heroPctEl = document.getElementById('heroSavingsPct');
  if (heroPctEl) heroPctEl.textContent = `${savPct >= 0 ? '+' : ''}${savPct}% net savings rate`;
  const heroGrowthEl = document.getElementById('heroMonthlyGrowth');
  if (heroGrowthEl) heroGrowthEl.textContent = `${savPct >= 0 ? '+' : ''}${savPct}%`;
  const heroStatusTitle = document.getElementById('heroStatusTitle');
  const heroStatusSub = document.getElementById('heroStatusSub');
  if (heroStatusTitle && heroStatusSub) {
    if (sav >= 0) {
      heroStatusTitle.textContent = "You're on track!";
      heroStatusSub.textContent = `Net surplus of ${formatCurrency(sav)} this month.`;
    } else {
      heroStatusTitle.textContent = "Watch spending";
      heroStatusSub.textContent = `Expenses exceed income by ${formatCurrency(Math.abs(sav))}.`;
    }
  }
  hydrateDashboardShowcase(data);

  // Money Sources
  const sourceCards = document.getElementById('dashSourceCards');
  const sources = data.summary.source_counts;
  sourceCards.innerHTML = `
    <button type="button" class="source-click-card" onclick="navigateTo('transactions');document.getElementById('txSourceFilter').value='bank_sync';filterTransactions()">
      <span class="source-info">
        <span class="source-label">Bank Synced</span>
        <span class="source-count">${sources.bank_sync} transactions</span>
      </span>
    </button>
    <button type="button" class="source-click-card" onclick="navigateTo('transactions');document.getElementById('txSourceFilter').value='statement_import';filterTransactions()">
      <span class="source-info">
        <span class="source-label">Statement Imported</span>
        <span class="source-count">${sources.statement_import} transactions</span>
      </span>
    </button>
    <button type="button" class="source-click-card" onclick="navigateTo('transactions');document.getElementById('txSourceFilter').value='manual';filterTransactions()">
      <span class="source-info">
        <span class="source-label">Manual</span>
        <span class="source-count">${sources.manual} transactions</span>
      </span>
    </button>
  `;

  // Connected Accounts
  const acctDiv = document.getElementById('dashAccounts');
  if (data.accounts.length === 0) {
    acctDiv.innerHTML = `
      <div class="empty-state" style="padding:24px 0">
        <h3 style="font-size:0.95rem">No banks connected</h3>
        <p style="font-size:0.82rem">Connect a bank to see your accounts here.</p>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('connect-bank')">Connect Bank</button>
      </div>
    `;
  } else {
    acctDiv.innerHTML = data.accounts.map(acc => `
      <div class="account-card">
        <div class="account-info">
          <div class="account-name">${acc.name}</div>
          <div class="account-number">•••• ${acc.last_four}</div>
        </div>
        <div class="account-balance">
          <div class="balance-amount">${formatCurrency(acc.balance)}</div>
          <div class="balance-status">
            <span class="status-dot ${acc.status === 'demo_connected' ? 'demo' : 'connected'}"></span>
            <span style="color:${acc.status === 'demo_connected' ? 'var(--accent-info)' : 'var(--accent-success)'}">${acc.status === 'demo_connected' ? 'Demo Connected' : 'Connected'}</span>
          </div>
          <div style="font-size:0.68rem;color:var(--text-tertiary);margin-top:2px">Last synced: ${formatTimestamp(acc.last_synced)}</div>
        </div>
      </div>
    `).join('') + `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:600">Total: ${formatCurrency(data.accounts.reduce((s, a) => s + a.balance, 0))}</span>
        <button class="btn btn-ghost btn-sm" onclick="navigateTo('connect-bank')">+ Connect Another</button>
      </div>
    `;
  }

  // Recent Transactions
  const txDiv = document.getElementById('dashRecentTx');
  if (data.recent_transactions.length === 0) {
    txDiv.innerHTML = `
      <div class="empty-state" style="padding:24px 0">
        <h3 style="font-size:0.95rem">No transactions yet</h3>
        <button class="btn btn-primary btn-sm" onclick="showAddTransactionModal()">Add Transaction</button>
      </div>
    `;
  } else {
    txDiv.innerHTML = data.recent_transactions.slice(0, 7).map(renderTransactionItem).join('');
  }

  // Budget Overview
  const budDiv = document.getElementById('dashBudgets');
  if (data.budget_status.length === 0) {
    budDiv.innerHTML = `
      <div class="empty-state" style="padding:24px 0">
        <h3 style="font-size:0.95rem">No budgets set</h3>
        <button class="btn btn-ghost btn-sm" onclick="navigateTo('budgets')">Set Budget →</button>
      </div>
    `;
  } else {
    budDiv.innerHTML = data.budget_status.map(b => {
      const color = b.percentage >= 90 ? 'var(--accent-danger)' : b.percentage >= 70 ? 'var(--accent-warning)' : b.color || 'var(--accent-primary)';
      return `
        <div class="budget-item">
          <div class="budget-header">
            <div class="budget-name">${b.category}</div>
            <div class="budget-amounts">
              <div class="budget-spent" style="color:${color}">${formatCurrency(b.spent)}</div>
              <div class="budget-limit">of ${formatCurrency(b.limit)}</div>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${b.percentage}%;background:${color}"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Charts
  renderDashboardCharts(data);

  // Presentation banner
  const banner = document.getElementById('presentationBanner');
  banner.classList.toggle('active', presentationMode);
}

function renderTransactionItem(tx) {
  const sourceLabel = {
    'bank_sync': 'Bank',
    'statement_import': 'Import',
    'manual': 'Manual'
  };
  return `
    <div class="transaction-item">
      <div class="transaction-details">
        <div class="transaction-name">${tx.description}</div>
        <div class="transaction-meta">
          <span>${formatDate(tx.date)}</span>
          <span>•</span>
          <span>${tx.category}</span>
          <span class="source-badge ${tx.source}">${sourceLabel[tx.source] || tx.source}</span>
        </div>
      </div>
      <div class="transaction-amount ${tx.amount > 0 ? 'income' : 'expense'}">
        ${tx.amount > 0 ? '+' : '-'}${formatCurrency(tx.amount)}
      </div>
    </div>
  `;
}


// =============================================================================
// CHARTS
// =============================================================================
function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function getChartDefaults() {
  const theme = getComputedStyle(document.documentElement);
  const color = token => theme.getPropertyValue(token).trim();
  return {
    color: color('--text-primary') || '#f8fafc',
    gridColor: color('--border-color') || 'rgba(148,163,255,0.16)',
    tickColor: color('--text-secondary') || '#b4bcd8',
    surface: color('--bg-card-solid') || '#11132b',
    primary: color('--accent-primary') || '#9353ff',
    cyan: color('--accent-cyan') || '#22d3ee',
    coral: color('--accent-coral') || '#f472b6',
    success: color('--accent-success') || '#2dd4bf',
    warning: color('--accent-warning') || '#fbbf24'
  };
}

function renderDashboardCharts(data) {
  if (typeof Chart !== 'function') return;
  const defaults = getChartDefaults();

  // Spending Trend (Luminous Cyan & Violet Cosmic Curves)
  destroyChart('dashSpendingChart');
  const dailyLabels = data.daily_spending.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  });

  const trendCtx = document.getElementById('dashSpendingChart').getContext('2d');
  const cyanGrad = trendCtx.createLinearGradient(0, 0, 0, 210);
  cyanGrad.addColorStop(0, 'rgba(34, 211, 238, 0.35)');
  cyanGrad.addColorStop(1, 'rgba(34, 211, 238, 0.0)');

  const violetGrad = trendCtx.createLinearGradient(0, 0, 0, 210);
  violetGrad.addColorStop(0, 'rgba(168, 85, 247, 0.28)');
  violetGrad.addColorStop(1, 'rgba(168, 85, 247, 0.0)');

  chartInstances['dashSpendingChart'] = new Chart(
    trendCtx,
    {
      type: 'line',
      data: {
        labels: dailyLabels,
        datasets: [
          {
            label: 'Income',
            data: data.daily_spending.map(d => d.income),
            borderColor: defaults.cyan,
            backgroundColor: cyanGrad,
            fill: true,
            tension: 0.42,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#ffffff',
            borderWidth: 2.5
          },
          {
            label: 'Expenses',
            data: data.daily_spending.map(d => d.expenses),
            borderColor: '#a855f7',
            backgroundColor: violetGrad,
            fill: true,
            tension: 0.42,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#ffffff',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: defaults.color, usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 11 } } },
          tooltip: {
            backgroundColor: defaults.surface,
            titleColor: defaults.color,
            bodyColor: defaults.tickColor,
            borderColor: defaults.gridColor,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            callbacks: { label: ctx => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: defaults.tickColor, font: { size: 10 }, maxRotation: 0, maxTicksLimit: 7 } },
          y: { grid: { color: defaults.gridColor }, ticks: { color: defaults.tickColor, font: { size: 10 }, callback: v => '₹' + (v / 1000).toFixed(0) + 'k' }, beginAtZero: true }
        }
      }
    }
  );

  // Category Breakdown Doughnut
  destroyChart('dashCategoryChart');
  if (data.category_breakdown.length > 0) {
    chartInstances['dashCategoryChart'] = new Chart(
      document.getElementById('dashCategoryChart').getContext('2d'),
      {
        type: 'doughnut',
        data: {
          labels: data.category_breakdown.map(c => c.category),
          datasets: [{
            data: data.category_breakdown.map(c => c.amount),
            backgroundColor: data.category_breakdown.map(c => CATEGORY_COLORS[c.category] || '#818cf8'),
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: { position: 'bottom', labels: { color: defaults.color, usePointStyle: true, pointStyle: 'circle', padding: 8, font: { size: 10 } } },
            tooltip: {
              backgroundColor: defaults.surface,
              titleColor: defaults.color,
              bodyColor: defaults.tickColor,
              borderColor: defaults.gridColor,
              borderWidth: 1,
              padding: 10,
              cornerRadius: 10,
              callbacks: { label: ctx => `${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}` }
            }
          }
        }
      }
    );
  }
}


// =============================================================================
// TRANSACTIONS PAGE
// =============================================================================
async function loadTransactions() {
  const source = document.getElementById('txSourceFilter').value;
  const search = document.getElementById('txSearchInput').value;
  const category = document.getElementById('txCategoryFilter').value;

  let url = '/api/transactions?';
  if (source) url += `source=${source}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (category) url += `category=${encodeURIComponent(category)}&`;

  const data = await apiCall(url);
  if (!data) return;

  const txList = document.getElementById('txList');
  const txEmpty = document.getElementById('txEmpty');

  if (data.transactions.length === 0) {
    txList.style.display = 'none';
    txEmpty.style.display = 'block';
  } else {
    txList.style.display = 'flex';
    txEmpty.style.display = 'none';
    txList.innerHTML = data.transactions.map(renderTransactionItem).join('');
  }

  // Populate category filter
  const catFilter = document.getElementById('txCategoryFilter');
  if (catFilter.options.length <= 1) {
    const allData = await apiCall('/api/transactions');
    if (allData) {
      const cats = [...new Set(allData.transactions.map(t => t.category))].sort();
      cats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catFilter.appendChild(opt);
      });
    }
  }
}

function filterTransactions() {
  loadTransactions();
}

function showAddTransactionModal() {
  document.getElementById('txDateInput').value = new Date().toISOString().split('T')[0];
  document.getElementById('addTransactionModal').showModal();
}

function setTxType(type, btn) {
  document.getElementById('txTypeInput').value = type;
  btn.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

async function addTransaction() {
  const desc = document.getElementById('txDescInput').value.trim();
  const amount = document.getElementById('txAmountInput').value;
  const date = document.getElementById('txDateInput').value;
  const category = document.getElementById('txCategoryInput').value;
  const type = document.getElementById('txTypeInput').value;
  const catSelect = document.getElementById('txCategoryInput');
  const icon = catSelect.options[catSelect.selectedIndex].dataset.icon || '📦';

  if (!desc || !amount) return alert('Please fill in description and amount.');

  await apiCall('/api/transactions', {
    method: 'POST',
    body: JSON.stringify({ description: desc, amount, date, category, category_icon: icon, type })
  });

  closeModal('addTransactionModal');
  document.getElementById('txDescInput').value = '';
  document.getElementById('txAmountInput').value = '';

  // Refresh current page
  loadPage(currentPage);
  updateNotifBadge();
}


// =============================================================================
// CONNECT BANK
// =============================================================================
const BANK_LINKED_STOCK_HOLDINGS = {
  'demo-acc-001': [
    { name: 'Reliance Industries', symbol: 'RELIANCE', type: 'stock', exchange: 'NSE', quantity: 8, avg_price: 2450.00, current_price: 2680.50, day_change: 1.85, sector: 'Energy', color: '#38bdf8', icon: '📈' },
    { name: 'Tata Consultancy Services', symbol: 'TCS', type: 'stock', exchange: 'NSE', quantity: 5, avg_price: 3620.00, current_price: 3820.50, day_change: 1.12, sector: 'IT', color: '#a855f7', icon: '💻' },
    { name: 'HDFC Bank', symbol: 'HDFCBANK', type: 'stock', exchange: 'NSE', quantity: 12, avg_price: 1580.00, current_price: 1725.30, day_change: 0.92, sector: 'Banking', color: '#818cf8', icon: '🏦' }
  ],
  'demo-acc-002': [],
  'demo-acc-003': [
    { name: 'Infosys', symbol: 'INFY', type: 'stock', exchange: 'NSE', quantity: 15, avg_price: 1420.00, current_price: 1385.60, day_change: -0.45, sector: 'IT', color: '#22d3ee', icon: '💻' },
    { name: 'Tata Power', symbol: 'TATAPOWER', type: 'stock', exchange: 'NSE', quantity: 30, avg_price: 245.00, current_price: 312.80, day_change: 2.34, sector: 'Power', color: '#2dd4bf', icon: '⚡' }
  ],
  'demo-acc-004': [
    { name: 'State Bank of India', symbol: 'SBIN', type: 'stock', exchange: 'NSE', quantity: 25, avg_price: 690.00, current_price: 782.40, day_change: 1.45, sector: 'Banking', color: '#38bdf8', icon: '🏦' },
    { name: 'ITC Ltd', symbol: 'ITC', type: 'stock', exchange: 'NSE', quantity: 40, avg_price: 425.00, current_price: 465.80, day_change: 0.45, sector: 'FMCG', color: '#fbbf24', icon: '🏭' }
  ],
  'demo-acc-005': [
    { name: 'Bajaj Finance', symbol: 'BAJFINANCE', type: 'stock', exchange: 'NSE', quantity: 4, avg_price: 6680.00, current_price: 6950.30, day_change: 0.78, sector: 'NBFC', color: '#a855f7', icon: '🏦' },
    { name: 'Asian Paints', symbol: 'ASIANPAINT', type: 'stock', exchange: 'NSE', quantity: 6, avg_price: 2980.00, current_price: 3150.25, day_change: 0.32, sector: 'Consumer', color: '#f472b6', icon: '🎨' }
  ],
  'demo-acc-006': []
};

const BANK_LINKED_SIP_MANDATES = {
  'demo-acc-001': [
    { name: 'Parag Parikh Flexi Cap', amount: 5000, date: 5, frequency: 'monthly', icon: '📊' },
    { name: 'Nifty 50 Index Fund', amount: 3000, date: 10, frequency: 'monthly', icon: '📈' }
  ],
  'demo-acc-002': [],
  'demo-acc-003': [
    { name: 'ICICI Prudential Bluechip Fund', amount: 4000, date: 12, frequency: 'monthly', icon: '🏦' }
  ],
  'demo-acc-004': [
    { name: 'SBI Small Cap Fund', amount: 2500, date: 15, frequency: 'monthly', icon: '🚀' }
  ],
  'demo-acc-005': [
    { name: 'Axis Midcap Fund', amount: 3500, date: 7, frequency: 'monthly', icon: '📊' }
  ],
  'demo-acc-006': []
};

function resolveBankProfileKey(accountId, bankName = '', accountType = 'savings') {
  if (accountId && (BANK_LINKED_STOCK_HOLDINGS[accountId] || BANK_LINKED_SIP_MANDATES[accountId])) {
    return accountId;
  }
  if (accountType === 'credit' || accountType === 'loan') return null;
  const b = (bankName || '').toLowerCase();
  if (b.includes('hdfc')) return 'demo-acc-001';
  if (b.includes('icici')) return 'demo-acc-003';
  if (b.includes('sbi') || b.includes('state bank')) return 'demo-acc-004';
  if (b.includes('axis')) return 'demo-acc-005';
  if (b.includes('kotak')) return 'demo-acc-006';
  return null;
}

async function syncAccountInvestmentsAndSips(profileKey, syncedTxns = []) {
  const detectedStocks = [...(BANK_LINKED_STOCK_HOLDINGS[profileKey] || [])];
  const detectedSips = [...(BANK_LINKED_SIP_MANDATES[profileKey] || [])];

  const hasStockTxSignal = Array.isArray(syncedTxns) && syncedTxns.some(tx =>
    /dividend|demat|zerodha|groww|upstox|angel|broker|stock|equity|nse|bse/i.test(`${tx.description} ${tx.category}`)
  );
  if (detectedStocks.length === 0 && hasStockTxSignal) {
    detectedStocks.push({ name: 'Nifty 50 Bees ETF', symbol: 'NIFTYBEES', type: 'etf', exchange: 'NSE', quantity: 20, avg_price: 235.00, current_price: 262.40, day_change: 0.85, sector: 'Index', color: '#22d3ee', icon: '📈' });
  }

  const hasSipTxSignal = Array.isArray(syncedTxns) && syncedTxns.some(tx =>
    /\bsip\b|mutual fund|nach|ecs|folio|amc|coin|kuvera/i.test(`${tx.description} ${tx.category}`)
  );
  if (detectedSips.length === 0 && hasSipTxSignal) {
    detectedSips.push({ name: 'Nifty 50 Index SIP', amount: 3000, date: 5, frequency: 'monthly', icon: '📈' });
  }

  const [existingInvData, existingSipData] = await Promise.all([
    apiCall('/api/investments'),
    apiCall('/api/sips')
  ]);

  const existingSymbols = new Set((existingInvData?.investments || []).map(i => (i.symbol || '').toUpperCase()));
  const existingSipNames = new Set((existingSipData?.sips || []).map(s => (s.name || '').trim().toLowerCase()));

  const addedStocks = [];
  const skippedStocks = [];
  for (const stock of detectedStocks) {
    if (existingSymbols.has(stock.symbol.toUpperCase())) {
      skippedStocks.push(stock);
      continue;
    }
    const res = await apiCall('/api/investments', { method: 'POST', body: JSON.stringify(stock) });
    if (res?.success) {
      addedStocks.push(res.investment || stock);
      existingSymbols.add(stock.symbol.toUpperCase());
    }
  }

  const addedSips = [];
  const skippedSips = [];
  for (const sip of detectedSips) {
    const key = sip.name.trim().toLowerCase();
    if (existingSipNames.has(key)) {
      skippedSips.push(sip);
      continue;
    }
    const res = await apiCall('/api/sips', { method: 'POST', body: JSON.stringify(sip) });
    if (res?.success) {
      addedSips.push(res.sip || sip);
      existingSipNames.add(key);
    }
  }

  return { detectedStocks, addedStocks, skippedStocks, detectedSips, addedSips, skippedSips };
}

async function switchToLiveModeForBank() {
  presentationMode = false;
  document.getElementById('presentationToggle').checked = false;
  const demoBadge = document.getElementById('sidebarDemoState');
  if (demoBadge) demoBadge.textContent = 'Live Mode';
  await apiCall('/api/presentation/reset', { method: 'POST' });
  await loadConnectBank();
  updateNotifBadge();
}

async function autoSyncBankStockHoldings(bankId, accountId, syncedTxns) {
  const resultBox = document.getElementById('bankStockSyncResult');
  const viewPortBtn = document.getElementById('bankViewPortfolioBtn');
  if (!resultBox) return;

  if (presentationMode) {
    resultBox.style.display = 'block';
    resultBox.innerHTML = `
      <div style="padding:14px 16px;border-radius:var(--radius-md);background:rgba(139,92,246,0.12);border:1px solid var(--border-glow)">
        <div style="font-weight:700;font-size:0.88rem;color:var(--accent-primary-hover);margin-bottom:4px">Demo Mode Active</div>
        <div style="font-size:0.8rem;color:var(--text-secondary)">Automatic bank-to-portfolio stock &amp; SIP syncing runs in <strong>Live Mode</strong>. Switch to Live Mode on Connect Bank to test automatic discovery from zero holdings.</div>
      </div>
    `;
    if (viewPortBtn) viewPortBtn.style.display = 'none';
    return;
  }

  const profileKey = resolveBankProfileKey(accountId);
  const { detectedStocks, addedStocks, skippedStocks, detectedSips, addedSips, skippedSips } =
    await syncAccountInvestmentsAndSips(profileKey, syncedTxns);

  if (detectedStocks.length === 0 && detectedSips.length === 0) {
    resultBox.style.display = 'block';
    resultBox.innerHTML = `
      <div style="padding:14px 16px;border-radius:var(--radius-md);background:var(--bg-glass);border:1px solid var(--border-color)">
        <div style="font-weight:700;font-size:0.88rem;color:var(--text-primary);margin-bottom:4px">No Stock or SIP Investments Detected</div>
        <div style="font-size:0.8rem;color:var(--text-secondary)">Checked linked demat, brokerage, and mutual fund SIP mandates for this bank account — no active holdings or SIPs were found.</div>
      </div>
    `;
    if (viewPortBtn) viewPortBtn.style.display = 'none';
    return;
  }

  resultBox.style.display = 'block';
  const stocksHtml = detectedStocks.map(s => {
    const val = s.quantity * s.current_price;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);margin-top:6px">
        <div>
          <strong style="font-size:0.85rem">${escapeHtml(s.symbol)}</strong>
          <span style="font-size:0.75rem;color:var(--text-tertiary)"> • ${escapeHtml(s.name)} (${s.quantity} shares)</span>
        </div>
        <span style="font-weight:700;font-size:0.85rem;color:var(--accent-cyan)">${formatCurrency(val)}</span>
      </div>
    `;
  }).join('');

  const sipsHtml = detectedSips.map(sip => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:10px;background:rgba(139,92,246,0.08);border:1px solid var(--border-glow);margin-top:6px">
      <div>
        <strong style="font-size:0.85rem">${escapeHtml(sip.name)}</strong>
        <span style="font-size:0.75rem;color:var(--text-tertiary)"> • Auto-SIP Day ${sip.date} (${sip.frequency})</span>
      </div>
      <span style="font-weight:700;font-size:0.85rem;color:var(--accent-primary-hover)">${formatCurrency(sip.amount)}/mo</span>
    </div>
  `).join('');

  const parts = [];
  if (addedStocks.length > 0) parts.push(`${addedStocks.length} Stock${addedStocks.length > 1 ? 's' : ''}`);
  if (addedSips.length > 0) parts.push(`${addedSips.length} SIP${addedSips.length > 1 ? 's' : ''}`);
  const headline = parts.length > 0
    ? `${parts.join(' & ')} Auto-Added to Portfolio`
    : 'Linked Stocks & SIPs Already in Portfolio';

  const alreadyCount = skippedStocks.length + skippedSips.length;

  resultBox.innerHTML = `
    <div style="padding:14px 16px;border-radius:var(--radius-md);background:var(--accent-success-bg);border:1px solid rgba(45,212,191,0.35)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div style="font-weight:700;font-size:0.9rem;color:var(--accent-success)">✓ ${headline}</div>
        <span class="badge badge-success">Live Mode Sync</span>
      </div>
      <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px">
        Detected linked investments &amp; recurring SIP mandates on this bank account${alreadyCount ? ` (${alreadyCount} already synced)` : ''}:
      </div>
      ${stocksHtml}
      ${sipsHtml}
    </div>
  `;
  if (viewPortBtn) viewPortBtn.style.display = 'inline-flex';
}

async function loadConnectBank() {
  const modeBadge = document.getElementById('bankModeBadge');
  const switchBtn = document.getElementById('bankSwitchLiveBtn');
  if (modeBadge) {
    modeBadge.textContent = presentationMode ? 'Presentation Mode' : 'Live Mode (Auto Stock & SIP Sync)';
    modeBadge.className = `badge ${presentationMode ? 'badge-info' : 'badge-success'}`;
  }
  if (switchBtn) switchBtn.style.display = presentationMode ? 'inline-flex' : 'none';

  // Load available banks
  const data = await apiCall('/api/banks/available');
  const bankList = document.getElementById('bankList');
  if (!data?.banks?.length) {
    bankList.innerHTML = '<p role="alert">Could not load demo banks. <button class="btn btn-secondary btn-sm" onclick="loadConnectBank()">Try again</button></p>';
    return;
  }
  bankList.innerHTML = data.banks.map(bank => `
    <div class="bank-option" data-bank-id="${bank.id}" onclick="selectBank('${bank.id}', this)">
      <div>
        <div class="bank-name">${bank.name}</div>
        <div style="font-size:0.78rem;color:var(--text-tertiary)">Demo Provider</div>
      </div>
      <span class="demo-badge" style="margin-left:auto">Demo</span>
    </div>
  `).join('');

  // Show current accounts
  const acctData = await apiCall('/api/accounts');
  if (acctData && acctData.accounts.length > 0) {
    document.getElementById('bankCurrentAccounts').style.display = 'block';
    const list = document.getElementById('bankAccountsList');
    list.innerHTML = acctData.accounts.map(acc => `
      <div class="account-card">
        <div class="account-info">
          <div class="account-name">${acc.name}</div>
          <div class="account-number">•••• ${acc.last_four} • ${acc.bank}</div>
        </div>
        <div class="account-balance">
          <div class="balance-amount">${formatCurrency(acc.balance)}</div>
          <div class="balance-status">
            <span class="status-dot ${acc.status === 'demo_connected' ? 'demo' : 'connected'}"></span>
            <span style="color:${acc.status === 'demo_connected' ? 'var(--accent-info)' : 'var(--accent-success)'}">${acc.status === 'demo_connected' ? 'Demo' : 'Connected'}</span>
          </div>
        </div>
      </div>
    `).join('');

    const total = acctData.accounts.reduce((s, a) => s + a.balance, 0);
    document.getElementById('bankTotalBalance').textContent = `Total Across Accounts: ${formatCurrency(total)}`;
  } else {
    document.getElementById('bankCurrentAccounts').style.display = 'none';
  }
}

function selectBank(bankId, el) {
  selectedBankId = bankId;
  document.querySelectorAll('.bank-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');

  // Start connection animation
  startBankConnection(bankId);
}

async function startBankConnection(bankId) {
  const bankName = document.querySelector('#bankList .selected .bank-name').textContent;
  document.getElementById('bankStep1').style.display = 'none';
  document.getElementById('bankStep2').style.display = 'block';
  document.getElementById('bankConnectTitle').textContent = 'Connecting to ' + bankName + '...';

  // Animate connection steps
  const steps = ['connStep1', 'connStep2', 'connStep3', 'connStep4'];
  for (let i = 0; i < steps.length; i++) {
    await new Promise(r => setTimeout(r, 800));
    document.getElementById(steps[i]).classList.remove('active');
    document.getElementById(steps[i]).classList.add('done');
    document.getElementById(steps[i]).querySelector('.step-icon').textContent = '✓';
    if (i + 1 < steps.length) {
      document.getElementById(steps[i + 1]).classList.add('active');
    }
  }

  await new Promise(r => setTimeout(r, 500));

  // Show account selection
  const acctData = await apiCall(`/api/banks/${bankId}/accounts`);
  if (!acctData?.accounts?.length) {
    resetBankFlow();
    alert('Could not load demo accounts for ' + bankName + '. Please try again.');
    return;
  }

  document.getElementById('bankStep2').style.display = 'none';
  document.getElementById('bankStep3').style.display = 'block';

  document.getElementById('bankAccountOptions').innerHTML = acctData.accounts.map(acc => `
    <div class="bank-option" data-account-id="${acc.id}" onclick="selectAccount('${acc.id}', this)">
      <div>
        <div class="bank-name">${acc.name}</div>
        <div style="font-size:0.78rem;color:var(--text-tertiary)">•••• ${acc.last_four} • ${acc.type}</div>
      </div>
      <div style="font-weight:700;margin-left:auto">${formatCurrency(acc.balance)}</div>
    </div>
  `).join('');
}

function selectAccount(accountId, el) {
  selectedAccountId = accountId;
  document.querySelectorAll('#bankAccountOptions .bank-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function connectSelectedAccount() {
  if (!selectedAccountId) return alert('Please select an account.');
  document.getElementById('bankStep3').style.display = 'none';
  document.getElementById('bankStep4').style.display = 'block';
}

async function grantPermissionsAndConnect() {
  const permissions = document.getElementById('bankStep4');
  permissions.inert = true;
  try {
    const connection = await apiCall('/api/banks/connect', {
      method: 'POST',
      body: JSON.stringify({ bank_id: selectedBankId, account_id: selectedAccountId })
    });
    if (!connection?.success || !connection.accounts?.length) {
      alert('Could not connect this demo account. Please try again.');
      return;
    }

    const syncData = await apiCall('/api/banks/sync', {
      method: 'POST',
      body: JSON.stringify({ account_id: selectedAccountId })
    });
    if (!syncData?.success || !Array.isArray(syncData.new_transactions)) {
      alert('The demo account connected, but its transactions could not sync. Please try again.');
      return;
    }

    syncedTransactions = syncData.new_transactions;
    document.getElementById('bankSyncMessage').textContent =
      syncedTransactions.length + ' new transactions found';
    document.getElementById('bankDuplicateWarning').style.display =
      syncData.duplicate_count > 0 ? 'flex' : 'none';
    document.getElementById('bankDupCount').textContent =
      syncData.duplicate_count + ' possible duplicates detected';

    // Automatically check if this bank account is invested in any stocks & add to portfolio in Live Mode
    await autoSyncBankStockHoldings(selectedBankId, selectedAccountId, syncedTransactions);

    permissions.style.display = 'none';
    document.getElementById('bankStep5').style.display = 'block';
    loadConnectBank();
  } finally {
    permissions.inert = false;
  }
}

async function importSyncedTransactions() {
  const results = document.getElementById('bankStep5');
  results.inert = true;
  try {
    const imported = await apiCall('/api/banks/import', {
      method: 'POST',
      body: JSON.stringify({ transactions: syncedTransactions, source: 'bank_sync' })
    });
    if (!imported?.success) {
      alert('Could not import the demo transactions. Please try again.');
      return;
    }

    resetBankFlow();
    navigateTo('dashboard');
    updateNotifBadge();
  } finally {
    results.inert = false;
  }
}

function resetBankFlow() {
  ['bankStep1', 'bankStep2', 'bankStep3', 'bankStep4', 'bankStep5'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById('bankStep1').style.display = 'block';
  selectedBankId = null;
  selectedAccountId = null;
  syncedTransactions = [];
  const stockResult = document.getElementById('bankStockSyncResult');
  if (stockResult) { stockResult.style.display = 'none'; stockResult.innerHTML = ''; }
  const viewPortBtn = document.getElementById('bankViewPortfolioBtn');
  if (viewPortBtn) viewPortBtn.style.display = 'none';

  // Reset connection steps
  ['connStep1', 'connStep2', 'connStep3', 'connStep4'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.remove('active', 'done');
    el.querySelector('.step-icon').textContent = String(i + 1);
  });
  document.getElementById('connStep1').classList.add('active');

  loadConnectBank();
}


// =============================================================================
// IMPORT STATEMENT
// =============================================================================
async function simulatePdfUpload() {
  document.getElementById('stmtStep1').style.display = 'none';
  document.getElementById('stmtStep2').style.display = 'block';

  // Simulate parsing delay
  await new Promise(r => setTimeout(r, 2000));

  const data = await apiCall('/api/statement/parse', { method: 'POST', body: '{}' });
  if (!data) {
    document.getElementById('stmtStep2').style.display = 'none';
    document.getElementById('stmtStep1').style.display = 'block';
    return;
  }

  statementTransactions = data.transactions;

  document.getElementById('stmtStep2').style.display = 'none';
  document.getElementById('stmtStep3').style.display = 'block';

  document.getElementById('stmtInfo').textContent =
    `${data.statement_info.bank} • ${data.statement_info.account} • ${data.statement_info.total_transactions} transactions`;

  if (data.duplicate_count > 0) {
    document.getElementById('stmtDuplicateWarning').style.display = 'flex';
    document.getElementById('stmtDupCount').textContent = `${data.duplicate_count} possible duplicates detected`;
  }

  const tbody = document.getElementById('stmtReviewBody');
  tbody.innerHTML = data.transactions.map(tx => `
    <tr>
      <td>${formatDate(tx.date)}</td>
      <td>${tx.description}</td>
      <td><span class="source-badge" style="background:${(CATEGORY_COLORS[tx.category] || '#6e625a')}15;color:${CATEGORY_COLORS[tx.category] || '#6e625a'}">${tx.category}</span></td>
      <td class="${tx.amount > 0 ? 'income' : 'expense'}" style="font-weight:600;color:${tx.amount > 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">
        ${tx.amount > 0 ? '+' : '-'}${formatCurrency(tx.amount)}
      </td>
      <td><span class="confidence-badge ${tx.confidence >= 85 ? 'confidence-high' : 'confidence-medium'}">${tx.confidence}%</span></td>
    </tr>
  `).join('');
}

async function importStatementTransactions() {
  await apiCall('/api/banks/import', {
    method: 'POST',
    body: JSON.stringify({ transactions: statementTransactions, source: 'statement_import' })
  });

  document.getElementById('stmtStep3').style.display = 'none';
  document.getElementById('stmtStep4').style.display = 'block';
  document.getElementById('stmtSuccessMsg').textContent = `${statementTransactions.length} transactions imported`;

  statementTransactions = [];
  updateNotifBadge();
}

function resetStatementFlow() {
  ['stmtStep1', 'stmtStep2', 'stmtStep3', 'stmtStep4'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById('stmtStep1').style.display = 'block';
  document.getElementById('stmtDuplicateWarning').style.display = 'none';
}


// =============================================================================
// ANALYTICS
// =============================================================================
async function loadAnalytics() {
  const status = document.getElementById('analyticsStatus');
  status.textContent = 'Loading analytics…';
  const data = await apiCall('/api/analytics');
  if (!data?.summary || !Array.isArray(data.daily_spending) || !Array.isArray(data.category_breakdown)) {
    status.textContent = 'Could not load analytics. Open this page again to retry.';
    return;
  }

  document.getElementById('analyticsIncome').textContent = formatCurrency(data.summary.income);
  document.getElementById('analyticsExpenses').textContent = formatCurrency(data.summary.expenses);
  document.getElementById('analyticsTxCount').textContent = data.summary.transaction_count;

  const chartsAvailable = typeof Chart === 'function';
  document.getElementById('analyticsCharts').hidden = !chartsAvailable;
  status.textContent = chartsAvailable ? '' : 'Charts could not load. Spending figures are shown below.';
  if (chartsAvailable) renderAnalyticsCharts(data);

  const catList = document.getElementById('analyticsCategoryList');
  const total = data.category_breakdown.reduce((s, c) => s + c.amount, 0);
  catList.innerHTML = data.category_breakdown.map(cat => {
    const pct = total > 0 ? Math.round(cat.amount / total * 100) : 0;
    return `
      <div class="budget-item" style="cursor:pointer" onclick="navigateTo('transactions');document.getElementById('txCategoryFilter').value='${cat.category}';filterTransactions()">
        <div class="budget-header">
          <div class="budget-name">
            <span class="category-dot" style="background:${CATEGORY_COLORS[cat.category] || '#6e625a'}"></span>
            ${cat.category}
          </div>
          <div class="budget-amounts">
            <div class="budget-spent">${formatCurrency(cat.amount)}</div>
            <div class="budget-limit">${cat.count} transactions • ${pct}%</div>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%;background:${CATEGORY_COLORS[cat.category] || '#6e625a'}"></div>
        </div>
      </div>
    `;
  }).join('') || '<p>No categorized expenses this month.</p>';
}

function renderAnalyticsCharts(data) {
  const defaults = getChartDefaults();

  // Line Chart
  destroyChart('analyticsLineChart');
  const labels = data.daily_spending.map(d => new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));

  chartInstances['analyticsLineChart'] = new Chart(
    document.getElementById('analyticsLineChart').getContext('2d'),
    {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Income', data: data.daily_spending.map(d => d.income), backgroundColor: defaults.success, borderRadius: 4 },
          { label: 'Expenses', data: data.daily_spending.map(d => d.expenses), backgroundColor: defaults.coral, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false },
        plugins: {
          legend: { position: 'top', labels: { color: defaults.color, usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11 } } },
          tooltip: { backgroundColor: defaults.surface, titleColor: defaults.color, bodyColor: defaults.tickColor, borderColor: defaults.gridColor, borderWidth: 1, padding: 10, cornerRadius: 8, callbacks: { label: ctx => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: defaults.tickColor, font: { size: 9 }, maxRotation: 0, maxTicksLimit: 10 } },
          y: { grid: { color: defaults.gridColor }, ticks: { color: defaults.tickColor, font: { size: 10 }, callback: v => '₹' + (v / 1000).toFixed(0) + 'k' }, beginAtZero: true }
        }
      }
    }
  );

  // Pie Chart
  destroyChart('analyticsPieChart');
  if (data.category_breakdown.length > 0) {
    chartInstances['analyticsPieChart'] = new Chart(
      document.getElementById('analyticsPieChart').getContext('2d'),
      {
        type: 'doughnut',
        data: {
          labels: data.category_breakdown.map(c => c.category),
          datasets: [{
            data: data.category_breakdown.map(c => c.amount),
            backgroundColor: data.category_breakdown.map(c => CATEGORY_COLORS[c.category] || '#6e625a'),
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: { position: 'right', labels: { color: defaults.color, usePointStyle: true, pointStyle: 'circle', padding: 10, font: { size: 11 } } },
            tooltip: { backgroundColor: defaults.surface, titleColor: defaults.color, bodyColor: defaults.tickColor, borderColor: defaults.gridColor, borderWidth: 1, padding: 10, cornerRadius: 8, callbacks: { label: ctx => `${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}` } }
          }
        }
      }
    );
  }

}


// =============================================================================
// BUDGETS
// =============================================================================
async function loadBudgets() {
  const data = await apiCall('/api/budgets');
  if (!data) return;

  const list = document.getElementById('budgetsList');
  const empty = document.getElementById('budgetsEmpty');

  if (data.budgets.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    list.innerHTML = data.budgets.map(b => {
      const color = b.percentage >= 90 ? 'var(--accent-danger)' : b.percentage >= 70 ? 'var(--accent-warning)' : b.color || 'var(--accent-primary)';
      const status = b.percentage >= 90 ? 'Over Budget!' : b.percentage >= 70 ? 'Approaching Limit' : 'On Track';
      return `
        <div class="card" style="margin-bottom:16px">
          <div class="budget-header">
            <div>
              <div class="budget-name" style="font-size:1.05rem">${b.category}</div>
              <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px">${status}</div>
            </div>
            <div class="budget-amounts" style="text-align:right">
              <div class="budget-spent" style="font-size:1.2rem;color:${color}">${formatCurrency(b.spent)}</div>
              <div class="budget-limit">of ${formatCurrency(b.limit)} (${b.period})</div>
              <div style="font-size:0.78rem;color:var(--accent-success);margin-top:4px">₹${(b.remaining).toLocaleString('en-IN')} remaining</div>
            </div>
          </div>
          <div class="progress-bar" style="height:10px;margin-top:12px">
            <div class="progress-fill" style="width:${b.percentage}%;background:${color}"></div>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:12px">
            <button class="btn btn-ghost btn-sm" onclick="deleteBudget('${b.id}')">Remove</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

function showAddBudgetModal() {
  document.getElementById('addBudgetModal').showModal();
}

async function addBudget() {
  const category = document.getElementById('budgetCategoryInput').value;
  const limit = document.getElementById('budgetLimitInput').value;
  const catSelect = document.getElementById('budgetCategoryInput');
  const icon = catSelect.options[catSelect.selectedIndex].dataset.icon || '📦';

  if (!limit) return alert('Please set a budget limit.');

  await apiCall('/api/budgets', {
    method: 'POST',
    body: JSON.stringify({ category, limit, icon, color: CATEGORY_COLORS[category] || '#4f686d' })
  });

  closeModal('addBudgetModal');
  document.getElementById('budgetLimitInput').value = '';
  loadBudgets();
}

async function deleteBudget(id) {
  await apiCall(`/api/budgets/${id}`, { method: 'DELETE' });
  loadBudgets();
}


// =============================================================================
// GOALS
// =============================================================================
async function loadGoals() {
  const data = await apiCall('/api/goals');
  if (!data) return;

  const list = document.getElementById('goalsList');
  const empty = document.getElementById('goalsEmpty');

  if (data.goals.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    list.innerHTML = data.goals.map(g => {
      const pct = Math.round(g.current / g.target * 100);
      const deadline = new Date(g.deadline);
      const now = new Date();
      const daysLeft = Math.max(0, Math.floor((deadline - now) / (1000 * 60 * 60 * 24)));
      return `
        <div class="goal-card">
          <div class="goal-header">
            <div class="goal-name">
              <span>${g.name}</span>
            </div>
            <div class="goal-percentage">${pct}%</div>
          </div>
          <div class="progress-bar" style="height:10px">
            <div class="progress-fill" style="width:${pct}%;background:${g.color || 'var(--accent-primary)'}"></div>
          </div>
          <div class="goal-amounts">
            <span>Saved: <strong>${formatCurrency(g.current)}</strong></span>
            <span>Target: <strong>${formatCurrency(g.target)}</strong></span>
          </div>
          <div class="goal-deadline">
            ${daysLeft} days left • ₹${g.monthly_contribution.toLocaleString('en-IN')}/month
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
            <button class="btn btn-secondary btn-sm" onclick="addToGoal('${g.id}', ${g.monthly_contribution})">Add ₹${(g.monthly_contribution/1000).toFixed(0)}k</button>
            <button class="btn btn-ghost btn-sm" onclick="deleteGoal('${g.id}')">Remove</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

function showAddGoalModal() {
  const future = new Date();
  future.setMonth(future.getMonth() + 6);
  document.getElementById('goalDeadlineInput').value = future.toISOString().split('T')[0];
  document.getElementById('addGoalModal').showModal();
}

async function addGoal() {
  const name = document.getElementById('goalNameInput').value.trim();
  const target = document.getElementById('goalTargetInput').value;
  const current = document.getElementById('goalCurrentInput').value || 0;
  const deadline = document.getElementById('goalDeadlineInput').value;
  const contribution = document.getElementById('goalContribInput').value || 0;
  const icon = document.getElementById('goalIconInput').value;

  if (!name || !target) return alert('Please fill in goal name and target.');

  await apiCall('/api/goals', {
    method: 'POST',
    body: JSON.stringify({ name, target, current, deadline, monthly_contribution: contribution, icon })
  });

  closeModal('addGoalModal');
  document.getElementById('goalNameInput').value = '';
  document.getElementById('goalTargetInput').value = '';
  document.getElementById('goalCurrentInput').value = '0';
  document.getElementById('goalContribInput').value = '';
  loadGoals();
}

async function addToGoal(goalId, amount) {
  const goals = await apiCall('/api/goals');
  const goal = goals.goals.find(g => g.id === goalId);
  if (!goal) return;

  await apiCall(`/api/goals/${goalId}`, {
    method: 'PUT',
    body: JSON.stringify({ current: goal.current + amount })
  });

  loadGoals();
}

async function deleteGoal(id) {
  await apiCall(`/api/goals/${id}`, { method: 'DELETE' });
  loadGoals();
}


// =============================================================================
// AI ADVISOR
// =============================================================================
async function askAI(message) {
  const input = document.getElementById('aiInput');
  const msg = message || input.value.trim();
  if (!msg) return;

  input.value = '';
  const chatDiv = document.getElementById('aiChatMessages');

  // Add user message
  chatDiv.innerHTML += `
    <div class="chat-message user">
      <div class="chat-bubble">${escapeHtml(msg)}</div>
    </div>
  `;

  // Add loading
  chatDiv.innerHTML += `
    <div class="chat-message assistant" id="aiLoading">
      <div class="chat-bubble"><div class="spinner" style="width:18px;height:18px;border-width:2px"></div></div>
    </div>
  `;

  chatDiv.scrollTop = chatDiv.scrollHeight;

  const data = await apiCall('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message: msg })
  });

  // Remove loading
  const loading = document.getElementById('aiLoading');
  if (loading) loading.remove();

  if (data) {
    // Format markdown-like response
    let formatted = data.response
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    chatDiv.innerHTML += `
      <div class="chat-message assistant">
        <div class="chat-bubble">${formatted}</div>
      </div>
    `;
  }

  chatDiv.scrollTop = chatDiv.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadAIAdvisor() {
  await loadAIInsights();
  await runSimulation();
}

async function loadAIInsights() {
  const data = await apiCall('/api/ai/insights');
  if (!data || !data.insights) return;

  const ins = data.insights;

  // Render Subscriptions
  const subContainer = document.getElementById('aiSubscriptionsList');
  const subBadge = document.getElementById('subTotalBadge');

  if (subContainer && ins.subscriptions && ins.subscriptions.length > 0) {
    if (subBadge) subBadge.textContent = `${formatCurrency(ins.subscription_monthly_total)}/mo`;
    subContainer.innerHTML = ins.subscriptions.map(s => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--card-bg);border-radius:var(--radius-sm);border:1px solid var(--border-color)">
        <div style="display:flex;align-items:center;gap:10px">
          <div>
            <div style="font-weight:600;font-size:0.88rem">${escapeHtml(s.name)}</div>
            <div style="font-size:0.75rem;color:var(--text-tertiary)">${s.count} occurrences • ${escapeHtml(s.category)}</div>
          </div>
        </div>
        <div style="font-weight:700;color:var(--text-primary);font-size:0.9rem">${formatCurrency(s.avg_amount)}/mo</div>
      </div>
    `).join('');
  } else if (subContainer) {
    if (subBadge) subBadge.textContent = '₹0/mo';
    subContainer.innerHTML = `<div class="text-tertiary" style="font-size:0.85rem;padding:8px">No recurring subscriptions detected yet.</div>`;
  }

  // Render Runway & Projections
  const runwayBadge = document.getElementById('aiRunwayBadge');
  if (runwayBadge) {
    runwayBadge.textContent = `${ins.runway_months} Months Safety Buffer`;
    if (ins.runway_months < 3) {
      runwayBadge.className = 'badge badge-danger';
    } else if (ins.runway_months < 6) {
      runwayBadge.className = 'badge badge-warning';
    } else {
      runwayBadge.className = 'badge badge-success';
    }
  }

  const projList = document.getElementById('aiProjectionsList');
  if (projList && ins.projections) {
    projList.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:0.85rem">
        <span style="color:var(--text-secondary)">Projected Balance (3 Mos):</span>
        <strong style="color:var(--accent-color)">${formatCurrency(ins.projections['3_months'])}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.85rem">
        <span style="color:var(--text-secondary)">Projected Balance (6 Mos):</span>
        <strong style="color:var(--accent-color)">${formatCurrency(ins.projections['6_months'])}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.85rem">
        <span style="color:var(--text-secondary)">Projected Balance (1 Year):</span>
        <strong style="color:var(--accent-success)">${formatCurrency(ins.projections['12_months'])}</strong>
      </div>
    `;
  }
}

async function runSimulation() {
  const catEl = document.getElementById('simCategorySelect');
  const cutPctEl = document.getElementById('simCutPct');
  const oneTimeEl = document.getElementById('simOneTimeExpense');
  const extraSavingsEl = document.getElementById('simExtraSavings');

  if (!catEl || !cutPctEl) return;

  const cat = catEl.value;
  const cutPct = cutPctEl.value;
  const oneTime = oneTimeEl ? (oneTimeEl.value || 0) : 0;
  const extraSavings = extraSavingsEl ? (extraSavingsEl.value || 0) : 0;

  const res = await apiCall('/api/ai/simulate', {
    method: 'POST',
    body: JSON.stringify({
      category_to_cut: cat,
      cut_percentage: cutPct,
      one_time_expense: oneTime,
      additional_monthly_savings: extraSavings
    })
  });

  if (!res || !res.simulation) return;

  const sim = res.simulation;
  const proj = sim.projected_state;

  const monthlySavingsEl = document.getElementById('simMonthlyCatSavings');
  if (monthlySavingsEl) monthlySavingsEl.textContent = formatCurrency(proj.monthly_category_savings);
  const annualEl = document.getElementById('simAnnualImpact');
  if (annualEl) {
    annualEl.textContent = `${proj.annual_impact >= 0 ? '+' : ''}${formatCurrency(proj.annual_impact)}`;
    annualEl.style.color = proj.annual_impact >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
  }

  const runwayEl = document.getElementById('simNewRunway');
  if (runwayEl) runwayEl.textContent = `${proj.new_runway_months} months`;

  const goalBox = document.getElementById('simGoalImpactList');
  if (goalBox) {
    if (sim.goal_projections && sim.goal_projections.length > 0) {
      goalBox.innerHTML = sim.goal_projections.map(g => `
        <div style="display:flex;justify-content:space-between;padding:4px 8px;background:var(--card-bg);border-radius:var(--radius-sm)">
          <span>${escapeHtml(g.name)}:</span>
          <strong style="color:${g.months_saved > 0 ? 'var(--accent-success)' : 'var(--text-secondary)'}">
            ${g.months_saved > 0 ? `Reached ${g.months_saved} mos faster!` : `${g.new_months_remaining} mos left`}
          </strong>
        </div>
      `).join('');
    } else {
      goalBox.innerHTML = `<span class="text-tertiary">No active goals to calculate timelines.</span>`;
    }
  }
}

function scrollToSimulator() {
  const el = document.getElementById('simulatorCard');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}



// =============================================================================
// INVESTMENTS
// =============================================================================

const INV_TYPE_LABELS = { stock: 'Stock', mutual_fund: 'Mutual Fund', gold: 'Gold', etf: 'ETF', bond: 'Bond' };
const INV_TYPE_COLORS = { stock: '#38bdf8', mutual_fund: '#a855f7', gold: '#fbbf24', etf: '#2dd4bf', bond: '#f472b6' };
const SECTOR_COLORS = ['#a855f7','#22d3ee','#818cf8','#2dd4bf','#fbbf24','#f472b6','#38bdf8','#c084fc','#fb7185','#6366f1'];

async function loadInvestments() {
  const status = document.getElementById('investmentsStatus');
  status.textContent = 'Loading investments…';
  const data = await apiCall('/api/investments');
  if (!data?.summary || !Array.isArray(data.investments)) {
    status.textContent = 'Could not load investments. Use Refresh to retry.';
    return;
  }

  const { investments, summary } = data;
  const chartsAvailable = typeof Chart === 'function';
  document.getElementById('investmentCharts').hidden = !chartsAvailable;
  status.textContent = chartsAvailable ? '' : 'Charts could not load. Portfolio figures and holdings are shown below.';

  // Summary cards
  document.getElementById('invCurrentValue').textContent = formatCurrency(summary.current_value);
  document.getElementById('invTotalInvested').textContent = formatCurrency(summary.total_invested);
  document.getElementById('invDayPnl').textContent = `${summary.day_pnl >= 0 ? '+' : ''}${formatCurrency(summary.day_pnl)}`;
  document.getElementById('invSipMonthly').textContent = formatCurrency(summary.sip_monthly);

  // P&L badge
  const pnlBadge = document.getElementById('invTotalPnlBadge');
  pnlBadge.textContent = `${summary.total_pnl >= 0 ? '+' : ''}${formatCurrency(summary.total_pnl)} (${summary.total_pnl_pct >= 0 ? '+' : ''}${summary.total_pnl_pct}%)`;
  pnlBadge.className = `stat-change ${summary.total_pnl >= 0 ? 'positive' : 'negative'}`;

  const dayBadge = document.getElementById('invDayPnlBadge');
  dayBadge.className = `stat-change ${summary.day_pnl >= 0 ? 'positive' : 'negative'}`;
  dayBadge.textContent = summary.day_pnl >= 0 ? '↑ Today' : '↓ Today';

  // Holdings count
  document.getElementById('invHoldingsCount').textContent = `${summary.holdings_count} Holdings`;

  // Top Gainers / Losers
  renderPnlList('invTopGainers', summary.top_gainers, true);
  renderPnlList('invTopLosers', summary.top_losers, false);

  // Holdings table
  renderHoldingsTable(investments);

  // Charts
  if (chartsAvailable) renderInvCharts(summary);

  // Load SIPs
  await loadSips(summary);

  // Load watchlist
  await loadWatchlist();
}

function renderPnlList(containerId, items, isGainer) {
  const container = document.getElementById(containerId);
  if (!items || items.length === 0) {
    container.innerHTML = '<div style="font-size:0.85rem;color:var(--text-tertiary);padding:8px">No data</div>';
    return;
  }
  container.innerHTML = items.map(item => {
    const color = item.pnl >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-glass);border-radius:var(--radius-sm);border:1px solid var(--border-color)">
        <div>
          <div style="font-weight:600;font-size:0.9rem">${escapeHtml(item.symbol)}</div>
          <div style="font-size:0.75rem;color:var(--text-tertiary)">${escapeHtml(item.name)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;color:${color};font-size:0.92rem">${item.pnl >= 0 ? '+' : ''}${formatCurrency(item.pnl)}</div>
          <div style="font-size:0.75rem;color:${color}">${item.pnl_pct >= 0 ? '+' : ''}${item.pnl_pct}%</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderHoldingsTable(investments) {
  const tbody = document.getElementById('invHoldingsBody');
  const empty = document.getElementById('invHoldingsEmpty');
  const table = document.getElementById('invHoldingsTable');

  if (!investments || investments.length === 0) {
    table.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  table.style.display = 'table';
  empty.style.display = 'none';

  tbody.innerHTML = investments.map(inv => {
    const invested = inv.quantity * inv.avg_price;
    const current = inv.quantity * inv.current_price;
    const pnl = current - invested;
    const pnlPct = invested > 0 ? (pnl / invested * 100) : 0;
    const pnlColor = pnl >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
    const dayColor = inv.day_change >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
    const typeLabel = INV_TYPE_LABELS[inv.type] || inv.type;

    // Mini sparkline SVG (synthesize trend from avg -> current if history is empty)
    let sparkline = '';
    const histSeries = (inv.history && inv.history.length > 1)
      ? inv.history
      : [inv.avg_price, (inv.avg_price + inv.current_price) / 2, inv.current_price];
    if (histSeries.length > 1) {
      const h = histSeries;
      const min = Math.min(...h);
      const max = Math.max(...h);
      const range = max - min || 1;
      const w = 80, ht = 28;
      const points = h.map((v, i) => `${(i / (h.length - 1)) * w},${ht - ((v - min) / range) * ht}`).join(' ');
      const lineColor = h[h.length - 1] >= h[0] ? '#2dd4bf' : '#fb7185';
      sparkline = `<svg width="${w}" height="${ht}" viewBox="0 0 ${w} ${ht}" style="overflow:visible"><polyline points="${points}" fill="none" stroke="${lineColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div>
              <div style="font-weight:600;font-size:0.88rem">${escapeHtml(inv.symbol)}</div>
              <div style="font-size:0.72rem;color:var(--text-tertiary);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(inv.name)}</div>
            </div>
          </div>
        </td>
        <td><span class="source-badge" style="background:${(INV_TYPE_COLORS[inv.type] || '#6e625a')}15;color:${INV_TYPE_COLORS[inv.type] || '#6e625a'}">${typeLabel}</span></td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.85rem">${inv.quantity % 1 === 0 ? inv.quantity : inv.quantity.toFixed(3)}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.85rem">₹${inv.avg_price.toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:0.85rem">₹${inv.current_price.toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
        <td style="font-size:0.85rem">${formatCurrency(invested)}</td>
        <td style="font-weight:600;font-size:0.85rem">${formatCurrency(current)}</td>
        <td style="font-weight:600;color:${pnlColor};font-size:0.85rem">
          ${pnl >= 0 ? '+' : ''}${formatCurrency(pnl)}<br>
          <span style="font-size:0.72rem">${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%</span>
        </td>
        <td style="color:${dayColor};font-weight:600;font-size:0.85rem">${inv.day_change >= 0 ? '+' : ''}${inv.day_change}%</td>
        <td>${sparkline}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="deleteInvestment('${inv.id}')" style="font-size:0.75rem">Remove</button></td>
      </tr>
    `;
  }).join('');
}

function renderInvCharts(summary) {
  const defaults = getChartDefaults();

  // Type allocation doughnut
  destroyChart('invTypeChart');
  if (summary.type_allocation.length > 0) {
    chartInstances['invTypeChart'] = new Chart(
      document.getElementById('invTypeChart').getContext('2d'),
      {
        type: 'doughnut',
        data: {
          labels: summary.type_allocation.map(a => INV_TYPE_LABELS[a.type] || a.type),
          datasets: [{
            data: summary.type_allocation.map(a => a.value),
            backgroundColor: summary.type_allocation.map(a => INV_TYPE_COLORS[a.type] || '#6e625a'),
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: { position: 'right', labels: { color: defaults.color, usePointStyle: true, pointStyle: 'circle', padding: 10, font: { size: 11 } } },
            tooltip: {
              backgroundColor: defaults.surface, titleColor: defaults.color, bodyColor: defaults.tickColor,
              borderColor: defaults.gridColor, borderWidth: 1, padding: 10, cornerRadius: 8,
              callbacks: { label: ctx => `${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}` }
            }
          }
        }
      }
    );
  }

  // Sector allocation bar chart
  destroyChart('invSectorChart');
  if (summary.sector_allocation.length > 0) {
    chartInstances['invSectorChart'] = new Chart(
      document.getElementById('invSectorChart').getContext('2d'),
      {
        type: 'bar',
        data: {
          labels: summary.sector_allocation.map(a => a.sector),
          datasets: [{
            data: summary.sector_allocation.map(a => a.value),
            backgroundColor: summary.sector_allocation.map((_, i) => SECTOR_COLORS[i % SECTOR_COLORS.length] + 'cc'),
            borderRadius: 6,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: defaults.surface, titleColor: defaults.color, bodyColor: defaults.tickColor,
              borderColor: defaults.gridColor, borderWidth: 1, padding: 10, cornerRadius: 8,
              callbacks: { label: ctx => `₹${ctx.parsed.x.toLocaleString('en-IN')}` }
            }
          },
          scales: {
            x: { grid: { color: defaults.gridColor }, ticks: { color: defaults.tickColor, font: { size: 10 }, callback: v => '₹' + (v / 1000).toFixed(0) + 'k' } },
            y: { grid: { display: false }, ticks: { color: defaults.color, font: { size: 11, weight: 500 } } }
          }
        }
      }
    );
  }
}

// --- SIPs ---
async function loadSips(summary) {
  const data = await apiCall('/api/sips');
  if (!data) return;

  if (summary) {
    document.getElementById('sipTotalInvested').textContent = formatCurrency(summary.sip_total_invested);
    document.getElementById('sipCurrentValue').textContent = formatCurrency(summary.sip_current_value);
  }

  const list = document.getElementById('sipList');
  const empty = document.getElementById('sipEmpty');

  if (data.sips.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    list.innerHTML = data.sips.map(sip => {
      const sipPnl = sip.current_value - sip.total_invested;
      const sipPnlPct = sip.total_invested > 0 ? (sipPnl / sip.total_invested * 100) : 0;
      const pnlColor = sipPnl >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
      const isActive = sip.status === 'active';

      return `
        <div class="goal-card" style="border-left:3px solid ${isActive ? 'var(--accent-success)' : 'var(--accent-warning)'}">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <div style="display:flex;align-items:center;gap:10px">
              <div>
                <div style="font-weight:600;font-size:0.95rem">${escapeHtml(sip.name)}</div>
                <div style="font-size:0.78rem;color:var(--text-tertiary)">₹${sip.amount.toLocaleString('en-IN')}/month • Day ${sip.date} • Since ${formatDate(sip.start_date)}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="source-badge ${isActive ? 'bank_sync' : 'manual'}">${isActive ? 'Active' : 'Paused'}</span>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:12px;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-size:0.75rem;color:var(--text-tertiary)">Invested</div>
              <div style="font-weight:600">${formatCurrency(sip.total_invested)}</div>
            </div>
            <div>
              <div style="font-size:0.75rem;color:var(--text-tertiary)">Current Value</div>
              <div style="font-weight:600">${formatCurrency(sip.current_value)}</div>
            </div>
            <div>
              <div style="font-size:0.75rem;color:var(--text-tertiary)">Returns</div>
              <div style="font-weight:600;color:${pnlColor}">${sipPnl >= 0 ? '+' : ''}${formatCurrency(sipPnl)} (${sipPnlPct.toFixed(1)}%)</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
            <button class="btn btn-secondary btn-sm" onclick="toggleSip('${sip.id}')">${isActive ? 'Pause' : 'Resume'}</button>
            <button class="btn btn-ghost btn-sm" onclick="deleteSip('${sip.id}')">Remove</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

// --- SIP Calculator ---
async function calculateSIP() {
  const amount = parseFloat(document.getElementById('sipCalcAmount').value) || 5000;
  const years = parseInt(document.getElementById('sipCalcYears').value) || 10;
  const rate = parseFloat(document.getElementById('sipCalcReturn').value) || 12;
  const stepUp = parseFloat(document.getElementById('sipCalcStepUp').value) || 0;

  const data = await apiCall('/api/investments/sip-calculator', {
    method: 'POST',
    body: JSON.stringify({ monthly_amount: amount, duration_years: years, expected_return: rate, step_up_pct: stepUp })
  });

  if (!data) return;

  document.getElementById('sipCalcTotalInvested').textContent = formatCurrency(data.total_invested);
  document.getElementById('sipCalcFutureValue').textContent = formatCurrency(data.future_value);
  document.getElementById('sipCalcWealthGain').textContent = formatCurrency(data.wealth_gain);
  document.getElementById('sipCalcReturnPct').textContent = `${data.absolute_return_pct}% absolute returns`;

  // Chart
  if (typeof Chart !== 'function') return;
  destroyChart('sipCalcChart');
  const defaults = getChartDefaults();

  chartInstances['sipCalcChart'] = new Chart(
    document.getElementById('sipCalcChart').getContext('2d'),
    {
      type: 'bar',
      data: {
        labels: data.yearly_data.map(d => `Y${d.year}`),
        datasets: [
          {
            label: 'Invested',
            data: data.yearly_data.map(d => d.invested),
            backgroundColor: defaults.primary,
            borderRadius: 4,
            order: 2
          },
          {
            label: 'Wealth Gain',
            data: data.yearly_data.map(d => d.wealth_gain),
            backgroundColor: defaults.success,
            borderRadius: 4,
            order: 2
          },
          {
            label: 'Total Value',
            data: data.yearly_data.map(d => d.value),
            type: 'line',
            borderColor: defaults.warning,
            backgroundColor: 'transparent',
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 5,
            borderWidth: 2,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { position: 'top', labels: { color: defaults.color, usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 10 } } },
          tooltip: {
            backgroundColor: defaults.surface, titleColor: defaults.color, bodyColor: defaults.tickColor,
            borderColor: defaults.gridColor, borderWidth: 1, padding: 10, cornerRadius: 8,
            callbacks: { label: ctx => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}` }
          }
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: defaults.tickColor, font: { size: 9 }, maxTicksLimit: 15 } },
          y: { stacked: false, grid: { color: defaults.gridColor }, ticks: { color: defaults.tickColor, font: { size: 10 }, callback: v => '₹' + (v >= 10000000 ? (v/10000000).toFixed(1) + 'Cr' : v >= 100000 ? (v/100000).toFixed(1) + 'L' : (v/1000).toFixed(0) + 'k') } }
        }
      }
    }
  );
}

// --- Watchlist ---
async function loadWatchlist() {
  const data = await apiCall('/api/investments/watchlist');
  if (!data) return;

  const container = document.getElementById('watchlistItems');
  const empty = document.getElementById('watchlistEmpty');

  if (data.watchlist.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    container.innerHTML = data.watchlist.map(w => {
      const color = w.day_change >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
      return `
        <div class="transaction-item">
          <div class="transaction-details">
            <div class="transaction-name">${escapeHtml(w.symbol)} — ${escapeHtml(w.name)}</div>
            <div class="transaction-meta">
              <span>${w.sector}</span>
              <span>•</span>
              <span style="color:${color}">${w.day_change >= 0 ? '↑' : '↓'} ${Math.abs(w.day_change)}%</span>
            </div>
          </div>
          <div style="font-weight:700;font-size:0.95rem">₹${w.current_price.toLocaleString('en-IN', {maximumFractionDigits:2})}</div>
          <button class="btn btn-ghost btn-sm" onclick="removeFromWatchlist('${w.id}')" style="margin-left:8px">Remove</button>
        </div>
      `;
    }).join('');
  }
}

// --- Tab switching ---
function switchInvTab(tabName, btn) {
  document.querySelectorAll('.inv-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#invTabs .tab').forEach(t => t.classList.remove('active'));
  document.getElementById('invTab-' + tabName).classList.add('active');
  btn.classList.add('active');

  if (tabName === 'calculator') calculateSIP();
}

// --- CRUD ---
function showAddInvestmentModal() {
  document.getElementById('addInvestmentModal').showModal();
}

function showAddSipModal() {
  document.getElementById('addSipModal').showModal();
}

async function addInvestment() {
  const name = document.getElementById('invNameInput').value.trim();
  const symbol = document.getElementById('invSymbolInput').value.trim();
  const type = document.getElementById('invTypeInput').value;
  const qty = document.getElementById('invQtyInput').value;
  const avgPrice = document.getElementById('invAvgPriceInput').value;
  const currentPrice = document.getElementById('invCurrentPriceInput').value;
  const sector = document.getElementById('invSectorInput').value.trim();

  if (!name || !qty || !avgPrice) return alert('Please fill in name, quantity, and average price.');

  await apiCall('/api/investments', {
    method: 'POST',
    body: JSON.stringify({ name, symbol, type, quantity: qty, avg_price: avgPrice, current_price: currentPrice || avgPrice, sector: sector || 'Other' })
  });

  closeModal('addInvestmentModal');
  document.getElementById('invNameInput').value = '';
  document.getElementById('invSymbolInput').value = '';
  document.getElementById('invQtyInput').value = '';
  document.getElementById('invAvgPriceInput').value = '';
  document.getElementById('invCurrentPriceInput').value = '';
  document.getElementById('invSectorInput').value = '';
  loadInvestments();
}

async function deleteInvestment(id) {
  await apiCall(`/api/investments/${id}`, { method: 'DELETE' });
  loadInvestments();
}

async function addSip() {
  const name = document.getElementById('sipNameInput').value.trim();
  const amount = document.getElementById('sipAmountInput').value;
  const date = document.getElementById('sipDateInput').value;

  if (!name || !amount) return alert('Please fill in fund name and SIP amount.');

  await apiCall('/api/sips', {
    method: 'POST',
    body: JSON.stringify({ name, amount, date })
  });

  closeModal('addSipModal');
  document.getElementById('sipNameInput').value = '';
  document.getElementById('sipAmountInput').value = '';
  loadInvestments();
}

async function deleteSip(id) {
  await apiCall(`/api/sips/${id}`, { method: 'DELETE' });
  loadInvestments();
}

async function toggleSip(id) {
  await apiCall(`/api/sips/${id}/toggle`, { method: 'POST' });
  loadInvestments();
}

async function removeFromWatchlist(id) {
  await apiCall(`/api/investments/watchlist/${id}`, { method: 'DELETE' });
  loadWatchlist();
}
// --- Manual Accounts ---
function showAddAccountModal() {
  document.getElementById('addAccountModal').showModal();
}

async function addAccount() {
  const name = document.getElementById('accNameInput').value.trim();
  const bank = document.getElementById('accBankInput').value.trim();
  const type = document.getElementById('accTypeInput').value;
  const lastFour = document.getElementById('accLastFourInput').value.trim();
  const balance = document.getElementById('accBalanceInput').value;

  if (!name || !bank || !balance) return alert('Please fill in Account Name, Bank Name, and Balance.');

  await apiCall('/api/accounts', {
    method: 'POST',
    body: JSON.stringify({ name, bank, type, last_four: lastFour || '0000', balance })
  });

  let syncNotice = '';
  if (!presentationMode) {
    const profileKey = resolveBankProfileKey(null, bank, type);
    if (profileKey) {
      const synced = await syncAccountInvestmentsAndSips(profileKey, []);
      const syncedParts = [];
      if (synced.addedStocks.length > 0) syncedParts.push(`${synced.addedStocks.length} stock${synced.addedStocks.length > 1 ? 's' : ''}`);
      if (synced.addedSips.length > 0) syncedParts.push(`${synced.addedSips.length} SIP${synced.addedSips.length > 1 ? 's' : ''}`);
      if (syncedParts.length > 0) {
        syncNotice = `Account added — auto-synced ${syncedParts.join(' and ')} to Portfolio.`;
      }
    }
  }

  closeModal('addAccountModal');
  // Clear inputs
  document.getElementById('accNameInput').value = '';
  document.getElementById('accBankInput').value = '';
  document.getElementById('accLastFourInput').value = '';
  document.getElementById('accBalanceInput').value = '';
  // Reload dashboard to reflect changes
  await loadDashboard();
  if (syncNotice) {
    const status = document.getElementById('dashboardStatus');
    if (status) status.textContent = syncNotice;
  }
}


// =============================================================================
// MONTHLY REPORT
// =============================================================================

async function generateReport() {
  const container = document.getElementById('reportContent');
  container.innerHTML = `
    <div class="loading-overlay" style="padding:80px">
      <div class="spinner" style="width:48px;height:48px;border-width:4px"></div>
      <div class="loading-text">Generating AI Report...</div>
      <div style="font-size:0.78rem;color:var(--text-tertiary)">Analyzing your financial data</div>
    </div>
  `;

  await new Promise(r => setTimeout(r, 1500));

  const data = await apiCall('/api/report');
  if (!data) {
    container.innerHTML = `<div class="error-state"><h3>Failed to generate report</h3><p>Please try again.</p><button class="btn btn-primary" onclick="generateReport()">Try Again</button></div>`;
    return;
  }

  const scoreColor = data.health_score >= 70 ? '#2f6b4f' : data.health_score >= 40 ? '#98682f' : '#a33a3f';
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (data.health_score / 100) * circumference;

  container.innerHTML = `
    <div class="report-header">
      <div style="font-size:0.75rem;color:var(--text-tertiary)">AI GENERATED</div>
      <h2>${data.title}</h2>
      <div class="report-period">${data.period}</div>

      <div class="health-score-ring">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="48" fill="none" stroke="var(--border-color)" stroke-width="8" />
          <circle cx="60" cy="60" r="48" fill="none" stroke="${scoreColor}" stroke-width="8"
                  stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"
                  style="transition: stroke-dashoffset 1s ease" />
        </svg>
        <div class="score-value" style="color:${scoreColor}">${data.health_score}</div>
      </div>
      <div style="font-size:0.82rem;color:var(--text-secondary)">Financial Health Score</div>
    </div>

    <div class="content-row" style="margin-bottom:20px">
      <div class="card stat-card">
        <div class="stat-value">${formatCurrency(data.summary.income)}</div>
        <div class="stat-label">Total Income</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">${formatCurrency(data.summary.expenses)}</div>
        <div class="stat-label">Total Expenses</div>
      </div>
    </div>

    <div class="card report-section">
      <div class="card-title" style="margin-bottom:16px">Spending Breakdown</div>
      ${data.category_breakdown.map(cat => {
        const total = data.summary.expenses || 1;
        const pct = Math.round(cat.amount / total * 100);
        return `
          <div class="budget-item">
            <div class="budget-header">
              <div class="budget-name">${cat.category}</div>
              <div class="budget-amounts">
                <div class="budget-spent">${formatCurrency(cat.amount)}</div>
                <div class="budget-limit">${pct}% of spending</div>
              </div>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${pct}%;background:${CATEGORY_COLORS[cat.category] || '#6e625a'}"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    ${data.budget_status.length > 0 ? `
      <div class="card report-section">
        <div class="card-title" style="margin-bottom:16px">Budget Performance</div>
        ${data.budget_status.map(b => {
          const color = b.percentage >= 90 ? 'var(--accent-danger)' : b.percentage >= 70 ? 'var(--accent-warning)' : 'var(--accent-success)';
          const status = b.percentage >= 90 ? 'Over' : b.percentage >= 70 ? 'Close' : 'Good';
          return `
            <div class="budget-item">
              <div class="budget-header">
                <div class="budget-name">${b.category} <span style="font-size:0.75rem;color:var(--text-tertiary)">${status}</span></div>
                <div class="budget-amounts">
                  <div class="budget-spent" style="color:${color}">${formatCurrency(b.spent)} / ${formatCurrency(b.limit)}</div>
                </div>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${b.percentage}%;background:${color}"></div></div>
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    ${data.goals.length > 0 ? `
      <div class="card report-section">
        <div class="card-title" style="margin-bottom:16px">Goal Progress</div>
        ${data.goals.map(g => {
          const pct = Math.round(g.current / g.target * 100);
          return `
            <div class="budget-item">
              <div class="budget-header">
                <div class="budget-name">${g.name}</div>
                <div class="budget-amounts">
                  <div class="budget-spent">${formatCurrency(g.current)} / ${formatCurrency(g.target)}</div>
                  <div class="budget-limit">${pct}% complete</div>
                </div>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${g.color || 'var(--accent-primary)'}"></div></div>
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    <div class="card report-section">
      <div class="card-title" style="margin-bottom:16px">AI Insights</div>
      ${data.insights.map(insight => `
        <div class="insight-card">
          <span>${insight}</span>
        </div>
      `).join('')}
    </div>

    ${data.recommendations.length > 0 ? `
      <div class="card report-section">
        <div class="card-title" style="margin-bottom:16px">Recommendations</div>
        ${data.recommendations.map(rec => `
          <div class="insight-card">
            <span>${rec}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div style="text-align:center;padding:20px;color:var(--text-tertiary);font-size:0.78rem">
      Generated by FinMate on ${new Date(data.generated_at).toLocaleString('en-IN')}
    </div>
  `;
}


// =============================================================================
// NOTIFICATIONS
// =============================================================================
async function loadNotifications() {
  const data = await apiCall('/api/notifications');
  if (!data) return;

  const list = document.getElementById('notifList');
  const empty = document.getElementById('notifEmpty');

  if (data.notifications.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    list.innerHTML = data.notifications.map(n => `
      <div class="notification-item ${n.read ? '' : 'unread'}" onclick="markRead('${n.id}', '${n.action}')">
        <div class="notification-content">
          <div class="notification-title">${n.title}</div>
          <div class="notification-message">${n.message}</div>
          <div class="notification-time">${formatTimestamp(n.timestamp)}</div>
        </div>
      </div>
    `).join('');
  }

  updateNotifBadge();
}

async function markRead(id, action) {
  await apiCall(`/api/notifications/${id}/read`, { method: 'POST' });
  if (action) navigateTo(action.replace('_', '-'));
  else loadNotifications();
  updateNotifBadge();
}

async function markAllRead() {
  await apiCall('/api/notifications/read-all', { method: 'POST' });
  loadNotifications();
}

async function updateNotifBadge() {
  const data = await apiCall('/api/notifications');
  if (!data) return;

  const unread = data.notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notifBadge');
  const topBadge = document.getElementById('topbarNotifBadge');
  if (unread > 0) {
    if (badge) { badge.style.display = 'flex'; badge.textContent = unread; }
    if (topBadge) { topBadge.style.display = 'flex'; topBadge.textContent = unread; }
  } else {
    if (badge) badge.style.display = 'none';
    if (topBadge) topBadge.style.display = 'none';
  }
}


// =============================================================================
// SETTINGS & THEME
// =============================================================================
async function loadSettingsAccounts() {
  const list = document.getElementById('settingsAccountsList');
  const status = document.getElementById('settingsAccountsStatus');
  status.textContent = 'Loading connected accounts…';
  const data = await apiCall('/api/accounts');
  if (!Array.isArray(data?.accounts)) {
    status.textContent = 'Could not load connected accounts. Open Settings again to retry.';
    return;
  }

  status.textContent = '';
  list.innerHTML = data.accounts.map(account => `
    <div class="setting-row">
      <div>
        <div class="setting-label">${escapeHtml(account.name)}</div>
        <div class="setting-desc">${escapeHtml(account.bank)} • Ending in ${escapeHtml(account.last_four)}</div>
      </div>
      <button type="button" class="btn btn-danger btn-sm">Disconnect</button>
    </div>
  `).join('') || '<p class="setting-desc">No connected accounts.</p>';
  list.querySelectorAll('button').forEach((button, index) => {
    const account = data.accounts[index];
    button.setAttribute('aria-label', 'Disconnect ' + account.name + ' ending in ' + account.last_four);
    button.addEventListener('click', async () => {
      if (!confirm('Disconnect ' + account.name + ' ending in ' + account.last_four + '? Imported transactions will be kept.')) return;
      button.disabled = true;
      const result = await apiCall('/api/banks/disconnect', {
        method: 'POST',
        body: JSON.stringify({ account_id: account.id })
      });
      if (!result?.success) {
        status.textContent = 'Could not disconnect this account. Please try again.';
        button.disabled = false;
        button.focus();
        return;
      }
      await loadSettingsAccounts();
      status.textContent = 'Disconnected ' + account.name + ' ending in ' + account.last_four + '.';
      if (currentPage === 'settings') document.getElementById('settingsAccountsHeading').focus();
    });
  });
}

function toggleDarkMode() {
  const isDark = document.getElementById('darkModeToggle').checked;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

  // Re-render charts with new colors
  if (currentPage === 'dashboard' && dashboardData) {
    renderDashboardCharts(dashboardData);
  } else if (currentPage === 'analytics') {
    loadAnalytics();
  }
}

async function togglePresentationMode() {
  presentationMode = !presentationMode;
  document.getElementById('presentationToggle').checked = presentationMode;
  const demoBadge = document.getElementById('sidebarDemoState');
  if (demoBadge) demoBadge.textContent = presentationMode ? 'Demo Active' : 'Live Mode';

  if (presentationMode) {
    await apiCall('/api/presentation/start', { method: 'POST' });
  } else {
    await apiCall('/api/presentation/reset', { method: 'POST' });
  }

  navigateTo('dashboard');
  updateNotifBadge();
}

async function resetAllData() {
  if (!confirm('Are you sure? This will clear all data.')) return;
  await apiCall('/api/presentation/reset', { method: 'POST' });
  presentationMode = false;
  document.getElementById('presentationToggle').checked = false;
  const demoBadge = document.getElementById('sidebarDemoState');
  if (demoBadge) demoBadge.textContent = 'Live Mode';
  navigateTo('dashboard');
  updateNotifBadge();
}


// =============================================================================
// COSMIC SHOWCASE HYDRATION & GLOBAL ⌘K COMMAND SEARCH
// =============================================================================
async function hydrateDashboardShowcase(data) {
  // Portfolio quick figure
  const portEl = document.getElementById('dashPortfolioQuick');
  if (portEl) {
    const invData = await apiCall('/api/investments');
    if (invData?.summary) {
      portEl.textContent = formatCurrency(invData.summary.current_value);
    }
  }

  // AI Insight summary card
  const insightEl = document.getElementById('dashAiInsightText');
  if (insightEl) {
    const insData = await apiCall('/api/ai/insights');
    const runway = insData?.insights?.runway_months;
    const topCat = data.category_breakdown?.[0];
    if (topCat) {
      const runwayText = typeof runway === 'number' ? ` Emergency runway: <strong>${runway} months</strong>.` : '';
      insightEl.innerHTML = `Your highest spend this month is <strong>${escapeHtml(topCat.category)}</strong> (${formatCurrency(topCat.amount)}).${runwayText}`;
    } else if (data.summary.savings > 0) {
      insightEl.innerHTML = `You are saving <strong>${formatCurrency(data.summary.savings)}</strong> this month. Ask AI how to optimize your portfolio.`;
    } else {
      insightEl.textContent = 'Connect a bank or add transactions to unlock real-time AI wealth insights.';
    }
  }
}

function initGlobalCommandSearch() {
  const input = document.getElementById('globalCommandSearch');
  const results = document.getElementById('globalSearchResults');
  if (!input || !results) return;

  const quickCommands = [
    { label: 'Home Dashboard', hint: 'Overview & balances', action: () => navigateTo('dashboard') },
    { label: 'AI Advisor & What-If Simulator', hint: 'Ask AI about spending', action: () => navigateTo('ai-advisor') },
    { label: 'Investment Portfolio & SIPs', hint: 'Stocks, mutual funds, gold', action: () => navigateTo('investments') },
    { label: 'Analytics & Spending Breakdown', hint: '30-day cashflow charts', action: () => navigateTo('analytics') },
    { label: 'Transactions History', hint: 'Filter & search records', action: () => navigateTo('transactions') },
    { label: 'Budgets & Limits', hint: 'Track category caps', action: () => navigateTo('budgets') },
    { label: 'Savings Goals', hint: 'Milestones & targets', action: () => navigateTo('goals') },
    { label: 'Connect Bank Account', hint: 'Automatic bank sync', action: () => navigateTo('connect-bank') },
    { label: 'Import Bank Statement (PDF)', hint: 'Parse transactions', action: () => navigateTo('import-statement') },
    { label: 'Monthly Financial Report', hint: 'AI health score', action: () => navigateTo('monthly-report') },
    { label: 'Add New Transaction', hint: 'Quick expense or income', action: () => showAddTransactionModal() }
  ];

  function renderResults(q) {
    const query = q.trim().toLowerCase();
    if (!query) {
      results.classList.remove('open');
      return;
    }

    const matchedCmds = quickCommands
      .filter(c => c.label.toLowerCase().includes(query) || c.hint.toLowerCase().includes(query))
      .slice(0, 5);

    const matchedTx = (dashboardData?.recent_transactions || [])
      .filter(t => t.description.toLowerCase().includes(query) || t.category.toLowerCase().includes(query))
      .slice(0, 4);

    const items = [];
    matchedCmds.forEach((cmd, idx) => {
      items.push(`<button type="button" class="search-result-item" data-cmd-idx="${idx}"><span><strong>${escapeHtml(cmd.label)}</strong><br><small style="color:var(--text-tertiary)">${escapeHtml(cmd.hint)}</small></span><span style="color:var(--accent-cyan)">→</span></button>`);
    });
    matchedTx.forEach(tx => {
      items.push(`<button type="button" class="search-result-item" data-tx-q="${escapeHtml(tx.description)}"><span>${escapeHtml(tx.description)} <small style="color:var(--text-tertiary)">• ${escapeHtml(tx.category)}</small></span><strong style="color:${tx.amount > 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">${tx.amount > 0 ? '+' : '-'}${formatCurrency(tx.amount)}</strong></button>`);
    });
    items.push(`<button type="button" class="search-result-item" data-ask-ai="1"><span>✦ Ask AI Advisor: "<strong>${escapeHtml(q)}</strong>"</span><span style="color:var(--accent-primary-hover)">AI →</span></button>`);

    results.innerHTML = items.join('');
    results.classList.add('open');

    results.querySelectorAll('[data-cmd-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        matchedCmds[Number(btn.dataset.cmdIdx)].action();
        results.classList.remove('open');
        input.value = '';
      });
    });
    results.querySelectorAll('[data-tx-q]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigateTo('transactions');
        document.getElementById('txSearchInput').value = btn.dataset.txQ;
        filterTransactions();
        results.classList.remove('open');
      });
    });
    const aiBtn = results.querySelector('[data-ask-ai]');
    if (aiBtn) {
      aiBtn.addEventListener('click', () => {
        const prompt = input.value.trim();
        results.classList.remove('open');
        input.value = '';
        navigateTo('ai-advisor');
        if (prompt) askAI(prompt);
      });
    }
  }

  input.addEventListener('input', () => renderResults(input.value));
  input.addEventListener('focus', () => { if (input.value.trim()) renderResults(input.value); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.topbar-search')) results.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    } else if (e.key === 'Escape') {
      results.classList.remove('open');
    }
  });
}


// =============================================================================
// MODALS
// =============================================================================
function closeModal(id) {
  document.getElementById(id).close();
}

// Close modal on outside click
document.addEventListener('click', (e) => {
  if (!(e.target instanceof HTMLDialogElement)) return;
  const bounds = e.target.getBoundingClientRect();
  if (e.clientX < bounds.left || e.clientX > bounds.right ||
      e.clientY < bounds.top || e.clientY > bounds.bottom) {
    e.target.close();
  }
});


// =============================================================================
// INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  setSidebarOpen(false);
  presentationMode = true; // Start with demo data
  document.getElementById('presentationToggle').checked = true;
  const darkToggle = document.getElementById('darkModeToggle');
  if (darkToggle) darkToggle.checked = true;
  initGlobalCommandSearch();
  loadDashboard();
  updateNotifBadge();
});
