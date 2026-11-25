/**
 * FinMate - GitHub Pages Client-side Backend Adapter
 * Enables the entire application to run directly on GitHub Pages without a Python server.
 */
(function() {
  const isGitHubPages = window.location.hostname.includes('github.io') || 
                         window.location.protocol === 'file:' ||
                         window.location.search.includes('mock=true');

  // Central in-memory state (matching app.py DataStore)
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const formatDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let accounts = [
    { id: "acc-hdfc-001", bank: "HDFC Bank", name: "HDFC Savings", type: "savings", last_four: "4582", balance: 42580, status: "demo_connected", provider: "demo", last_synced: now.toISOString(), color: "#1a73e8" },
    { id: "acc-icici-001", bank: "ICICI Bank", name: "ICICI Savings", type: "savings", last_four: "1294", balance: 18240, status: "demo_connected", provider: "demo", last_synced: new Date(now - 5*60000).toISOString(), color: "#f4511e" }
  ];

  const demoBanks = [
    { id: "demo-hdfc", name: "HDFC Bank", color: "#004c8f" },
    { id: "demo-icici", name: "ICICI Bank", color: "#f58220" },
    { id: "demo-sbi", name: "SBI", color: "#1a4fa0" },
    { id: "demo-axis", name: "Axis Bank", color: "#97144d" },
    { id: "demo-kotak", name: "Kotak Mahindra", color: "#ed1c24" }
  ];

  const demoBankAccounts = {
    "demo-hdfc": [
      { id: "demo-acc-001", name: "Savings Account", last_four: "7823", balance: 38450, type: "savings" },
      { id: "demo-acc-002", name: "Current Account", last_four: "9156", balance: 125000, type: "current" }
    ],
    "demo-icici": [{ id: "demo-acc-003", name: "Savings Account", last_four: "3491", balance: 22100, type: "savings" }],
    "demo-sbi": [{ id: "demo-acc-004", name: "Savings Account", last_four: "6742", balance: 55200, type: "savings" }],
    "demo-axis": [{ id: "demo-acc-005", name: "Salary Account", last_four: "1587", balance: 67800, type: "savings" }],
    "demo-kotak": [{ id: "demo-acc-006", name: "Savings Account", last_four: "4290", balance: 31500, type: "savings" }]
  };

  let budgets = [
    { id: "bud-001", category: "Food & Dining", icon: "🍕", limit: 8000, period: "monthly", color: "#ff6b6b" },
    { id: "bud-002", category: "Shopping", icon: "🛍️", limit: 5000, period: "monthly", color: "#ffa726" },
    { id: "bud-003", category: "Transport", icon: "🚗", limit: 3000, period: "monthly", color: "#42a5f5" },
    { id: "bud-004", category: "Entertainment", icon: "🎬", limit: 2000, period: "monthly", color: "#ab47bc" },
    { id: "bud-005", category: "Bills & Utilities", icon: "📱", limit: 5000, period: "monthly", color: "#26a69a" }
  ];

  let goals = [
    { id: "goal-001", name: "Emergency Fund", icon: "🏦", target: 100000, current: 45000, deadline: formatDateStr(new Date(now.getTime() + 180*86400000)), color: "#1a73e8", monthly_contribution: 5000 },
    { id: "goal-002", name: "New Laptop", icon: "💻", target: 80000, current: 32000, deadline: formatDateStr(new Date(now.getTime() + 120*86400000)), color: "#f4511e", monthly_contribution: 8000 },
    { id: "goal-003", name: "Vacation Trip", icon: "✈️", target: 50000, current: 18000, deadline: formatDateStr(new Date(now.getTime() + 90*86400000)), color: "#00897b", monthly_contribution: 6000 }
  ];

  let notifications = [
    { id: "notif-001", type: "budget_alert", title: "Budget Alert", message: "Food & Dining spending is at 85% of your monthly budget.", icon: "⚠️", read: false, timestamp: now.toISOString(), action: "budgets" },
    { id: "notif-002", type: "goal_milestone", title: "Goal Milestone!", message: "Emergency Fund reached 45% of target!", icon: "🎯", read: false, timestamp: new Date(now - 2*3600000).toISOString(), action: "goals" },
    { id: "notif-003", type: "sync", title: "Bank Synced", message: "HDFC Savings synced successfully. 3 new transactions.", icon: "🔄", read: true, timestamp: new Date(now - 5*3600000).toISOString(), action: "transactions" },
    { id: "notif-004", type: "insight", title: "AI Insight", message: "Your dining expenses increased 23% this week compared to last week.", icon: "🤖", read: false, timestamp: new Date(now - 8*3600000).toISOString(), action: "ai_advisor" },
    { id: "notif-005", type: "large_transaction", title: "Large Transaction", message: "₹3,500 spent at Reliance Digital.", icon: "💸", read: true, timestamp: new Date(now - 24*3600000).toISOString(), action: "transactions" }
  ];

  let investments = [
    { id: "inv-001", name: "Reliance Industries", symbol: "RELIANCE", type: "stock", exchange: "NSE", quantity: 10, avg_price: 2450.00, current_price: 2680.50, day_change: 1.85, sector: "Energy", color: "#1a73e8", icon: "📈", history: [2420, 2435, 2460, 2445, 2480, 2510, 2490, 2530, 2560, 2580, 2600, 2630, 2650, 2670, 2680] },
    { id: "inv-002", name: "HDFC Bank", symbol: "HDFCBANK", type: "stock", exchange: "NSE", quantity: 15, avg_price: 1580.00, current_price: 1725.30, day_change: 0.92, sector: "Banking", color: "#004c8f", icon: "🏦", history: [1560, 1575, 1590, 1580, 1600, 1620, 1610, 1640, 1660, 1680, 1690, 1700, 1710, 1720, 1725] },
    { id: "inv-003", name: "Infosys", symbol: "INFY", type: "stock", exchange: "NSE", quantity: 20, avg_price: 1420.00, current_price: 1385.60, day_change: -0.45, sector: "IT", color: "#0066b2", icon: "💻", history: [1440, 1430, 1425, 1420, 1410, 1400, 1395, 1390, 1385, 1380, 1375, 1378, 1380, 1383, 1386] },
    { id: "inv-004", name: "Parag Parikh Flexi Cap Fund", symbol: "PPFCF", type: "mutual_fund", exchange: "MF", quantity: 150.234, avg_price: 55.80, current_price: 68.42, day_change: 0.35, sector: "Flexi Cap", color: "#10b981", icon: "📊", history: [56.2, 57.0, 57.8, 58.5, 59.2, 60.1, 61.0, 62.3, 63.5, 64.8, 65.5, 66.2, 67.0, 67.8, 68.4] },
    { id: "inv-005", name: "Nifty 50 Index Fund", symbol: "NIFTY50", type: "mutual_fund", exchange: "MF", quantity: 200.500, avg_price: 180.20, current_price: 198.75, day_change: 0.62, sector: "Index", color: "#6366f1", icon: "📈", history: [181, 183, 184, 185, 187, 188, 190, 191, 193, 194, 195, 196, 197, 198, 199] },
    { id: "inv-006", name: "Sovereign Gold Bond 2024", symbol: "SGB2024", type: "gold", exchange: "RBI", quantity: 5, avg_price: 5200.00, current_price: 5850.00, day_change: 0.15, sector: "Gold", color: "#f59e0b", icon: "🥇", history: [5220, 5280, 5310, 5350, 5400, 5450, 5500, 5550, 5600, 5650, 5700, 5750, 5790, 5820, 5850] }
  ];

  let sips = [
    { id: "sip-001", investment_id: "inv-004", name: "Parag Parikh Flexi Cap", amount: 5000, frequency: "monthly", date: 5, status: "active", start_date: "2024-01-05", total_invested: 100000, current_value: 125000, icon: "📊" },
    { id: "sip-002", investment_id: "inv-005", name: "Nifty 50 Index Fund", amount: 3000, frequency: "monthly", date: 10, status: "active", start_date: "2024-03-10", total_invested: 54000, current_value: 62500, icon: "📈" }
  ];

  let watchlist = [
    { id: "watch-001", name: "TCS", symbol: "TCS", current_price: 3820.50, day_change: 1.12, sector: "IT", icon: "💻" },
    { id: "watch-002", name: "Bajaj Finance", symbol: "BAJFINANCE", current_price: 6950.30, day_change: -0.78, sector: "NBFC", icon: "🏦" },
    { id: "watch-003", name: "ITC Ltd", symbol: "ITC", current_price: 465.80, day_change: 0.45, sector: "FMCG", icon: "🏭" }
  ];

  let settings = {
    currency: "₹",
    dark_mode: true,
    presentation_mode: false,
    notification_preferences: { budget_alerts: true, goal_milestones: true, large_transactions: true, weekly_summary: true }
  };

  // Generate initial transactions
  let transactions = [];
  const sampleExpenses = [
    ["Zomato Order", -450, "Food & Dining", "🍕"],
    ["Swiggy Delivery", -380, "Food & Dining", "🍕"],
    ["Amazon Purchase", -1500, "Shopping", "🛍️"],
    ["Uber Ride", -350, "Transport", "🚗"],
    ["Netflix Subscription", -649, "Entertainment", "🎬"],
    ["Electricity Bill", -1850, "Bills & Utilities", "📱"],
    ["Apollo Pharmacy", -650, "Health", "🏥"],
    ["Reliance Digital", -3500, "Shopping", "🛍️"],
    ["Starbucks Coffee", -520, "Food & Dining", "🍕"],
    ["Petrol - HP", -1200, "Transport", "🚗"],
    ["BookMyShow", -450, "Entertainment", "🎬"],
    ["Grocery Store", -1200, "Food & Dining", "🍕"]
  ];
  const sampleIncome = [
    ["Monthly Salary - TCS", 45000, "Salary", "💼"],
    ["Freelance Project", 15000, "Freelance", "💻"],
    ["Mutual Fund Dividend", 2500, "Investment Returns", "📈"]
  ];

  let txId = 1;
  sampleExpenses.forEach(([desc, amt, cat, icon], i) => {
    const d = new Date(now.getTime() - (i * 3 + 1) * 86400000);
    transactions.push({
      id: `tx-${String(txId++).padStart(4, '0')}`,
      date: formatDateStr(d),
      description: desc,
      amount: amt,
      category: cat,
      category_icon: icon,
      type: "expense",
      source: i < 5 ? "bank_sync" : "manual",
      account_id: i % 2 === 0 ? "acc-hdfc-001" : "acc-icici-001",
      status: "completed",
      tags: []
    });
  });

  sampleIncome.forEach(([desc, amt, cat, icon], i) => {
    const d = new Date(now.getTime() - (i * 12 + 2) * 86400000);
    transactions.push({
      id: `tx-${String(txId++).padStart(4, '0')}`,
      date: formatDateStr(d),
      description: desc,
      amount: amt,
      category: cat,
      category_icon: icon,
      type: "income",
      source: "bank_sync",
      account_id: "acc-hdfc-001",
      status: "completed",
      tags: []
    });
  });

  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Helper computation functions
  function computeSummary() {
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyTxns = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = monthlyTxns.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenses = Math.abs(monthlyTxns.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
    const savings = income - expenses;
    const total_balance = accounts.reduce((sum, a) => sum + a.balance, 0);

    const source_counts = { bank_sync: 0, statement_import: 0, manual: 0 };
    transactions.forEach(t => {
      const src = t.source || 'manual';
      if (source_counts[src] !== undefined) source_counts[src]++;
    });

    return { total_balance, income, expenses, savings, account_count: accounts.length, transaction_count: transactions.length, source_counts };
  }

  function computeCategoryBreakdown() {
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const categories = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.amount < 0) {
        const cat = t.category || "Uncategorized";
        if (!categories[cat]) categories[cat] = { amount: 0, icon: t.category_icon || "📦", count: 0 };
        categories[cat].amount += Math.abs(t.amount);
        categories[cat].count++;
      }
    });
    return Object.entries(categories).map(([k, v]) => ({ category: k, icon: v.icon, amount: v.amount, count: v.count })).sort((a, b) => b.amount - a.amount);
  }

  function computeBudgetStatus() {
    const breakdown = computeCategoryBreakdown().reduce((acc, c) => ({ ...acc, [c.category]: c.amount }), {});
    return budgets.map(b => {
      const spent = breakdown[b.category] || 0;
      return {
        ...b,
        spent,
        remaining: Math.max(0, b.limit - spent),
        percentage: b.limit > 0 ? Math.min(100, Math.round((spent / b.limit) * 100)) : 0
      };
    });
  }

  function computeDailySpending(days = 30) {
    const daily = {};
    for (let i = 0; i < days; i++) {
      const d = formatDateStr(new Date(now.getTime() - i * 86400000));
      daily[d] = { income: 0, expenses: 0 };
    }
    transactions.forEach(t => {
      if (daily[t.date]) {
        if (t.amount > 0) daily[t.date].income += t.amount;
        else daily[t.date].expenses += Math.abs(t.amount);
      }
    });
    return Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)).map(([date, data]) => ({ date, ...data }));
  }

  function computePortfolioSummary() {
    let total_invested = 0, current_value = 0, day_pnl = 0;
    const type_alloc = {}, sector_alloc = {};

    investments.forEach(inv => {
      const invested = inv.quantity * inv.avg_price;
      const current = inv.quantity * inv.current_price;
      total_invested += invested;
      current_value += current;
      day_pnl += current * (inv.day_change / 100);

      type_alloc[inv.type] = (type_alloc[inv.type] || 0) + current;
      sector_alloc[inv.sector] = (sector_alloc[inv.sector] || 0) + current;
    });

    const total_pnl = current_value - total_invested;
    const total_pnl_pct = total_invested > 0 ? (total_pnl / total_invested * 100) : 0;

    const holdings_pnl = investments.map(inv => {
      const invested = inv.quantity * inv.avg_price;
      const current = inv.quantity * inv.current_price;
      return {
        id: inv.id, name: inv.name, symbol: inv.symbol, type: inv.type,
        pnl: current - invested,
        pnl_pct: invested > 0 ? Math.round(((current - invested) / invested * 100) * 100) / 100 : 0
      };
    }).sort((a, b) => b.pnl_pct - a.pnl_pct);

    return {
      total_invested: Math.round(total_invested),
      current_value: Math.round(current_value),
      total_pnl: Math.round(total_pnl),
      total_pnl_pct: Math.round(total_pnl_pct * 100) / 100,
      day_pnl: Math.round(day_pnl),
      holdings_count: investments.length,
      type_allocation: Object.entries(type_alloc).map(([type, value]) => ({ type, value: Math.round(value) })),
      sector_allocation: Object.entries(sector_alloc).map(([sector, value]) => ({ sector, value: Math.round(value) })),
      top_gainers: holdings_pnl.slice(0, 3),
      top_losers: holdings_pnl.slice(-3).reverse(),
      sip_monthly: sips.filter(s => s.status === 'active').reduce((sum, s) => sum + s.amount, 0),
      sip_total_invested: sips.reduce((sum, s) => sum + s.total_invested, 0),
      sip_current_value: sips.reduce((sum, s) => sum + s.current_value, 0)
    };
  }

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = async function(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;

    // Only intercept /api/ routes
    if (url.includes('/api/')) {
      const method = (init.method || 'GET').toUpperCase();
      let body = null;
      if (init.body) {
        try { body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body; } catch(e) {}
      }

      // Try local network if NOT forced to GitHub Pages
      if (!isGitHubPages) {
        try {
          const response = await originalFetch(input, init);
          if (response.ok || (url.includes('/api/banks/') && response.status === 400)) {
            return response;
          }
        } catch(e) {
          // Server offline, fall through to client mock!
        }
      }

      // Handle Mock Routes Client-side
      const makeResponse = (data, status = 200) => new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
      });

      // 1. Dashboard
      if (url.includes('/api/dashboard')) {
        return makeResponse({
          summary: computeSummary(),
          accounts,
          recent_transactions: transactions.slice(0, 10),
          category_breakdown: computeCategoryBreakdown(),
          daily_spending: computeDailySpending(30),
          budget_status: computeBudgetStatus(),
          goals,
          notifications: notifications.filter(n => !n.read)
        });
      }

      if (url === '/api/analytics' && method === 'GET') {
        return makeResponse({
          summary: computeSummary(),
          category_breakdown: computeCategoryBreakdown(),
          daily_spending: computeDailySpending(30),
          monthly_trend: computeDailySpending(90)
        });
      }

      // 2. Transactions
      if (url.includes('/api/transactions')) {
        if (method === 'GET') {
          return makeResponse({ transactions, total: transactions.length });
        }
        if (method === 'POST') {
          const tx = {
            id: `tx-${Math.random().toString(36).substr(2, 8)}`,
            date: body.date || formatDateStr(new Date()),
            description: body.description,
            amount: body.type === 'expense' ? -Math.abs(Number(body.amount)) : Math.abs(Number(body.amount)),
            category: body.category || "Uncategorized",
            category_icon: body.category_icon || "📦",
            type: body.type || "expense",
            source: "manual",
            account_id: body.account_id || accounts[0]?.id,
            status: "completed",
            tags: []
          };
          transactions.unshift(tx);
          return makeResponse({ success: true, transaction: tx });
        }
        if (method === 'DELETE') {
          const parts = url.split('/');
          const id = parts[parts.length - 1];
          transactions = transactions.filter(t => t.id !== id);
          return makeResponse({ success: true });
        }
      }

      // 3. Budgets
      if (url.includes('/api/budgets')) {
        if (method === 'GET') return makeResponse({ budgets: computeBudgetStatus() });
        if (method === 'POST') {
          const bud = { id: `bud-${Math.random().toString(36).substr(2, 6)}`, ...body };
          budgets.push(bud);
          return makeResponse({ success: true, budget: bud });
        }
        if (method === 'DELETE') {
          const id = url.split('/').pop();
          budgets = budgets.filter(b => b.id !== id);
          return makeResponse({ success: true });
        }
      }

      // 4. Goals
      if (url.includes('/api/goals')) {
        if (method === 'GET') return makeResponse({ goals });
        if (method === 'POST') {
          const goal = { id: `goal-${Math.random().toString(36).substr(2, 6)}`, current: 0, ...body };
          goals.push(goal);
          return makeResponse({ success: true, goal });
        }
        if (method === 'PUT') {
          const id = url.split('/').pop();
          const g = goals.find(x => x.id === id);
          if (g && body.add_amount) g.current += Number(body.add_amount);
          return makeResponse({ success: true, goal: g });
        }
        if (method === 'DELETE') {
          const id = url.split('/').pop();
          goals = goals.filter(g => g.id !== id);
          return makeResponse({ success: true });
        }
      }

      // 5. Investments & SIPs
      if (url.includes('/api/investments/sip-calculator')) {
        const monthly = Number(body.monthly_investment || 5000);
        const rate = Number(body.expected_return || 12);
        const years = Number(body.time_period || 10);
        const months = years * 12;
        const i = rate / 12 / 100;
        const totalInvested = monthly * months;
        const futureValue = monthly * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
        return makeResponse({
          success: true,
          total_invested: Math.round(totalInvested),
          future_value: Math.round(futureValue),
          wealth_gain: Math.round(futureValue - totalInvested),
          absolute_return_pct: Math.round(((futureValue - totalInvested) / totalInvested * 100) * 10) / 10,
          yearly_data: []
        });
      }

      if (url.includes('/api/investments/watchlist')) {
        if (method === 'GET') return makeResponse({ watchlist });
        if (method === 'POST') {
          const item = { id: `watch-${Math.random().toString(36).substr(2, 6)}`, ...body };
          watchlist.push(item);
          return makeResponse({ success: true, item });
        }
        if (method === 'DELETE') {
          const id = url.split('/').pop();
          watchlist = watchlist.filter(w => w.id !== id);
          return makeResponse({ success: true });
        }
      }

      if (url.includes('/api/investments')) {
        if (method === 'GET') return makeResponse({ investments, summary: computePortfolioSummary() });
        if (method === 'POST') {
          const inv = {
            id: `inv-${Math.random().toString(36).substr(2, 6)}`,
            name: body.name,
            symbol: body.symbol || body.name.slice(0, 4).toUpperCase(),
            type: body.type || 'stock',
            exchange: body.exchange || 'NSE',
            quantity: Number(body.quantity),
            avg_price: Number(body.avg_price),
            current_price: Number(body.current_price || body.avg_price),
            day_change: Number(body.day_change || 0),
            sector: body.sector || 'Other',
            color: body.color || '#6366f1',
            icon: body.icon || '📈',
            history: body.history || []
          };
          investments.push(inv);
          return makeResponse({ success: true, investment: inv });
        }
        if (method === 'DELETE') {
          const id = url.split('/').pop();
          investments = investments.filter(i => i.id !== id);
          return makeResponse({ success: true });
        }
      }

      if (url.includes('/api/sips')) {
        if (method === 'GET') return makeResponse({ sips });
        if (method === 'POST') {
          if (url.endsWith('/toggle')) {
            const parts = url.split('/');
            const sipId = parts[parts.length - 2];
            const sip = sips.find(s => s.id === sipId);
            if (sip) {
              sip.status = sip.status === 'active' ? 'paused' : 'active';
              return makeResponse({ success: true, sip });
            }
            return makeResponse({ success: false }, 404);
          }
          const sip = {
            id: `sip-${Math.random().toString(36).substr(2, 6)}`,
            investment_id: body.investment_id || null,
            name: body.name,
            amount: Number(body.amount),
            frequency: body.frequency || 'monthly',
            date: Number(body.date || 1),
            status: 'active',
            start_date: formatDateStr(new Date()),
            total_invested: 0,
            current_value: 0,
            icon: body.icon || '📊'
          };
          sips.push(sip);
          return makeResponse({ success: true, sip });
        }
        if (method === 'DELETE') {
          const id = url.split('/').pop();
          sips = sips.filter(s => s.id !== id);
          return makeResponse({ success: true });
        }
      }

      // 6. Bank connections
      if (url === '/api/banks/available' && method === 'GET') {
        return makeResponse({ banks: demoBanks });
      }

      const bankAccountsMatch = url.match(/^\/api\/banks\/([^/]+)\/accounts$/);
      if (bankAccountsMatch && method === 'GET') {
        return makeResponse({ accounts: demoBankAccounts[bankAccountsMatch[1]] || [] });
      }

      if (url === '/api/banks/connect' && method === 'POST') {
        const bank = demoBanks.find(candidate => candidate.id === body?.bank_id);
        const account = demoBankAccounts[bank?.id]?.find(candidate => candidate.id === body?.account_id);
        if (!account) return makeResponse({ success: false, error: "Demo account not found." }, 400);

        if (!accounts.some(existing => existing.id === account.id)) {
          accounts.push({
            ...account,
            bank: bank.name,
            color: bank.color,
            status: "demo_connected",
            provider: "demo",
            last_synced: new Date().toISOString()
          });
        }
        return makeResponse({ success: true, accounts: [account] });
      }

      if (url === '/api/banks/sync' && method === 'POST') {
        const account = accounts.find(candidate => candidate.id === body?.account_id);
        if (!account) return makeResponse({ success: false, error: "Connect the account before syncing." }, 400);

        const sample = [...sampleExpenses.slice(0, 11), sampleIncome[0]];
        const pending = sample.map(([description, amount, category, category_icon], index) => {
          const date = new Date(now);
          date.setDate(date.getDate() - index);
          return {
            id: 'tx-sync-' + account.id + '-' + index,
            date: formatDateStr(date),
            description, amount, category, category_icon,
            type: amount < 0 ? "expense" : "income",
            account_id: account.id,
            source: "bank_sync",
            status: "completed",
            tags: []
          };
        });
        const importedIds = new Set(transactions.map(tx => tx.id));
        const newTransactions = pending.filter(tx => !importedIds.has(tx.id));
        return makeResponse({
          success: true,
          new_transactions: newTransactions,
          total_found: pending.length,
          duplicate_count: pending.length - newTransactions.length
        });
      }

      if (url === '/api/banks/import' && method === 'POST') {
        if (!Array.isArray(body?.transactions)) {
          return makeResponse({ success: false, error: "No transactions to import." }, 400);
        }
        const importedIds = new Set(transactions.map(tx => tx.id));
        let imported = 0;
        for (const tx of body.transactions) {
          const id = tx.id || 'tx-' + txId++;
          if (importedIds.has(id)) continue;
          importedIds.add(id);
          transactions.push({ ...tx, id, source: body.source || "bank_sync", status: "completed" });
          imported++;
        }
        transactions.sort((first, second) => second.date.localeCompare(first.date));
        return makeResponse({ success: true, imported });
      }

      if (url === '/api/banks/disconnect' && method === 'POST') {
        if (!body?.account_id) {
          return makeResponse({ success: false, error: "Select an account to disconnect." }, 400);
        }
        accounts = accounts.filter(account => account.id !== body.account_id);
        return makeResponse({ success: true });
      }

      // 7. AI Advisor
      if (url.includes('/api/ai/chat')) {
        const query = (body.message || "").toLowerCase();
        let reply = "I analyzed your financial profile. You have healthy savings this month! Try setting automated budgets to keep your entertainment expenses under control.";
        if (query.includes("spend") || query.includes("highest")) {
          const top = computeCategoryBreakdown()[0];
          reply = `Your highest spending category this month is **${top?.category || 'Food & Dining'}** at ₹${(top?.amount || 0).toLocaleString('en-IN')}.`;
        } else if (query.includes("budget")) {
          reply = "You are currently within your planned limits on most categories, though Food & Dining is close to 85% of budget limit!";
        } else if (query.includes("goal") || query.includes("save")) {
          reply = "You're on track with your Emergency Fund goal (45% reached)! Keep contributing ₹5,000 monthly.";
        }
        return makeResponse({ response: reply, type: "general" });
      }

      if (url.includes('/api/ai/insights')) {
        return makeResponse({
          insights: [
            { type: "tip", title: "Smart Saving", message: "You spent 15% less on shopping compared to last week!", icon: "💡" },
            { type: "alert", title: "Subscription Notice", message: "Netflix subscription of ₹649 is scheduled soon.", icon: "🔔" }
          ]
        });
      }

      // 8. Notifications
      if (url.includes('/api/notifications')) {
        if (url.includes('/read-all')) {
          notifications.forEach(n => n.read = true);
          return makeResponse({ success: true });
        }
        return makeResponse({ notifications });
      }

      // 9. Settings
      if (url.includes('/api/settings')) {
        if (method === 'GET') return makeResponse({ settings });
        if (method === 'PUT') {
          settings = { ...settings, ...body };
          return makeResponse({ success: true, settings });
        }
      }

      // 10. Accounts
      if (url.includes('/api/accounts')) {
        if (method === 'POST') {
          const acc = {
            id: `acc-manual-${Math.random().toString(36).substr(2, 6)}`,
            bank: body.bank || 'Manual Account',
            name: body.name,
            type: body.type || 'savings',
            last_four: String(body.last_four || '0000').slice(-4),
            balance: Number(body.balance || 0),
            status: 'manual',
            provider: 'manual',
            last_synced: new Date().toISOString(),
            color: body.color || '#6366f1'
          };
          accounts.push(acc);
          return makeResponse({ success: true, account: acc });
        }
        return makeResponse({ accounts });
      }

      // Fallback 200 OK
      return makeResponse({ success: true });
    }

    return originalFetch(input, init);
  };
})();
