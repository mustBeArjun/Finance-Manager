"""
FinMate - Personal Finance Dashboard
Flask backend serving the integrated fintech application.
"""

from flask import Flask, jsonify, request, render_template, send_from_directory
import json
import os
import uuid
from datetime import datetime, timedelta
import random
import copy

app = Flask(__name__, static_folder='static', template_folder='templates')

# =============================================================================
# DATA STORE (In-memory for demo; would use a database in production)
# =============================================================================

class DataStore:
    """Central data store. All modules read from here."""

    def __init__(self):
        self.transactions = []
        self.accounts = []
        self.budgets = []
        self.goals = []
        self.investments = []
        self.sips = []
        self.watchlist = []
        self.notifications = []
        self.settings = {
            "currency": "₹",
            "dark_mode": True,
            "presentation_mode": False,
            "notification_preferences": {
                "budget_alerts": True,
                "goal_milestones": True,
                "large_transactions": True,
                "weekly_summary": True
            }
        }
        self.ai_chat_history = []

    def clear(self):
        self.transactions.clear()
        self.accounts.clear()
        self.budgets.clear()
        self.goals.clear()
        self.investments.clear()
        self.sips.clear()
        self.watchlist.clear()
        self.notifications.clear()
        self.ai_chat_history.clear()

    def load_demo_data(self):
        """Load the presentation-mode sample dataset."""
        self.clear()
        now = datetime.now()

        # --- Demo Accounts ---
        self.accounts = [
            {
                "id": "acc-hdfc-001",
                "bank": "HDFC Bank",
                "name": "HDFC Savings",
                "type": "savings",
                "last_four": "4582",
                "balance": 42580,
                "status": "demo_connected",
                "provider": "demo",
                "last_synced": now.isoformat(),
                "color": "#1a73e8"
            },
            {
                "id": "acc-icici-001",
                "bank": "ICICI Bank",
                "name": "ICICI Savings",
                "type": "savings",
                "last_four": "1294",
                "balance": 18240,
                "status": "demo_connected",
                "provider": "demo",
                "last_synced": (now - timedelta(minutes=5)).isoformat(),
                "color": "#f4511e"
            }
        ]

        # --- Demo Transactions ---
        categories_expenses = [
            ("Food & Dining", "🍕", [
                ("Zomato Order", 450), ("Swiggy Delivery", 380), ("Starbucks Coffee", 520),
                ("Dominos Pizza", 650), ("Local Restaurant", 350), ("Grocery Store", 1200),
                ("Street Food", 150), ("Cafe Coffee Day", 280), ("Barbeque Nation", 870)
            ]),
            ("Shopping", "🛍️", [
                ("Amazon Purchase", 1500), ("Flipkart Order", 890), ("Myntra Fashion", 1200),
                ("DMart Groceries", 2100), ("Reliance Digital", 3500)
            ]),
            ("Transport", "🚗", [
                ("Uber Ride", 350), ("Ola Cab", 280), ("Metro Card Recharge", 500),
                ("Petrol - HP", 1200), ("Rapido Bike", 120)
            ]),
            ("Entertainment", "🎬", [
                ("Netflix Subscription", 649), ("Spotify Premium", 119),
                ("PVR Cinemas", 750), ("BookMyShow", 450)
            ]),
            ("Bills & Utilities", "📱", [
                ("Jio Recharge", 399), ("Electricity Bill", 1850),
                ("Water Bill", 450), ("Internet Bill", 999), ("Gas Bill", 680)
            ]),
            ("Health", "🏥", [
                ("Apollo Pharmacy", 650), ("Gym Membership", 1500),
                ("Doctor Consultation", 800)
            ]),
            ("Education", "📚", [
                ("Udemy Course", 499), ("Books - Amazon", 850)
            ])
        ]

        categories_income = [
            ("Salary", "💼", [("Monthly Salary - TCS", 45000), ("Monthly Salary - TCS", 45000)]),
            ("Freelance", "💻", [("Web Development Project", 15000), ("UI Design Work", 5000)]),
            ("Investment Returns", "📈", [("Mutual Fund Dividend", 2500), ("FD Interest", 1800)])
        ]

        tx_id = 1
        sources = ["bank_sync", "statement_import", "manual"]

        # Generate expense transactions spread over the last 60 days
        for cat_name, cat_icon, items in categories_expenses:
            for item_name, amount in items:
                days_ago = random.randint(0, 59)
                source = random.choice(sources)
                self.transactions.append({
                    "id": f"tx-{tx_id:04d}",
                    "date": (now - timedelta(days=days_ago)).strftime("%Y-%m-%d"),
                    "description": item_name,
                    "amount": -amount,
                    "category": cat_name,
                    "category_icon": cat_icon,
                    "type": "expense",
                    "source": source,
                    "account_id": random.choice(["acc-hdfc-001", "acc-icici-001"]),
                    "status": "completed",
                    "tags": []
                })
                tx_id += 1

        # Generate income transactions
        for cat_name, cat_icon, items in categories_income:
            for item_name, amount in items:
                days_ago = random.randint(0, 45)
                source = random.choice(sources)
                self.transactions.append({
                    "id": f"tx-{tx_id:04d}",
                    "date": (now - timedelta(days=days_ago)).strftime("%Y-%m-%d"),
                    "description": item_name,
                    "amount": amount,
                    "category": cat_name,
                    "category_icon": cat_icon,
                    "type": "income",
                    "source": source,
                    "account_id": random.choice(["acc-hdfc-001", "acc-icici-001"]),
                    "status": "completed",
                    "tags": []
                })
                tx_id += 1

        # Sort by date descending
        self.transactions.sort(key=lambda t: t["date"], reverse=True)

        # Assign source counts to match spec approximately
        for i, tx in enumerate(self.transactions):
            if i < 42:
                tx["source"] = "bank_sync"
            elif i < 60:
                tx["source"] = "statement_import"
            else:
                tx["source"] = "manual"

        # --- Demo Budgets ---
        self.budgets = [
            {"id": "bud-001", "category": "Food & Dining", "icon": "🍕", "limit": 8000, "period": "monthly", "color": "#ff6b6b"},
            {"id": "bud-002", "category": "Shopping", "icon": "🛍️", "limit": 5000, "period": "monthly", "color": "#ffa726"},
            {"id": "bud-003", "category": "Transport", "icon": "🚗", "limit": 3000, "period": "monthly", "color": "#42a5f5"},
            {"id": "bud-004", "category": "Entertainment", "icon": "🎬", "limit": 2000, "period": "monthly", "color": "#ab47bc"},
            {"id": "bud-005", "category": "Bills & Utilities", "icon": "📱", "limit": 5000, "period": "monthly", "color": "#26a69a"},
        ]

        # --- Demo Goals ---
        self.goals = [
            {"id": "goal-001", "name": "Emergency Fund", "icon": "🏦", "target": 100000, "current": 45000, "deadline": (now + timedelta(days=180)).strftime("%Y-%m-%d"), "color": "#1a73e8", "monthly_contribution": 5000},
            {"id": "goal-002", "name": "New Laptop", "icon": "💻", "target": 80000, "current": 32000, "deadline": (now + timedelta(days=120)).strftime("%Y-%m-%d"), "color": "#f4511e", "monthly_contribution": 8000},
            {"id": "goal-003", "name": "Vacation Trip", "icon": "✈️", "target": 50000, "current": 18000, "deadline": (now + timedelta(days=90)).strftime("%Y-%m-%d"), "color": "#00897b", "monthly_contribution": 6000},
        ]

        # --- Demo Notifications ---
        self.notifications = [
            {"id": "notif-001", "type": "budget_alert", "title": "Budget Alert", "message": "Food & Dining spending is at 85% of your monthly budget.", "icon": "⚠️", "read": False, "timestamp": now.isoformat(), "action": "budgets"},
            {"id": "notif-002", "type": "goal_milestone", "title": "Goal Milestone!", "message": "Emergency Fund reached 45% of target!", "icon": "🎯", "read": False, "timestamp": (now - timedelta(hours=2)).isoformat(), "action": "goals"},
            {"id": "notif-003", "type": "sync", "title": "Bank Synced", "message": "HDFC Savings synced successfully. 3 new transactions.", "icon": "🔄", "read": True, "timestamp": (now - timedelta(hours=5)).isoformat(), "action": "transactions"},
            {"id": "notif-004", "type": "insight", "title": "AI Insight", "message": "Your dining expenses increased 23% this week compared to last week.", "icon": "🤖", "read": False, "timestamp": (now - timedelta(hours=8)).isoformat(), "action": "ai_advisor"},
            {"id": "notif-005", "type": "large_transaction", "title": "Large Transaction", "message": "₹3,500 spent at Reliance Digital.", "icon": "💸", "read": True, "timestamp": (now - timedelta(days=1)).isoformat(), "action": "transactions"},
        ]

        # --- Demo Investment Holdings ---
        self.investments = [
            {
                "id": "inv-001",
                "name": "Reliance Industries",
                "symbol": "RELIANCE",
                "type": "stock",
                "exchange": "NSE",
                "quantity": 10,
                "avg_price": 2450.00,
                "current_price": 2680.50,
                "day_change": 1.85,
                "sector": "Energy",
                "color": "#1a73e8",
                "icon": "📈",
                "history": [2420, 2435, 2460, 2445, 2480, 2510, 2490, 2530, 2560, 2580, 2600, 2630, 2650, 2670, 2680]
            },
            {
                "id": "inv-002",
                "name": "HDFC Bank",
                "symbol": "HDFCBANK",
                "type": "stock",
                "exchange": "NSE",
                "quantity": 15,
                "avg_price": 1580.00,
                "current_price": 1725.30,
                "day_change": 0.92,
                "sector": "Banking",
                "color": "#004c8f",
                "icon": "🏦",
                "history": [1560, 1575, 1590, 1580, 1600, 1620, 1610, 1640, 1660, 1680, 1690, 1700, 1710, 1720, 1725]
            },
            {
                "id": "inv-003",
                "name": "Infosys",
                "symbol": "INFY",
                "type": "stock",
                "exchange": "NSE",
                "quantity": 20,
                "avg_price": 1420.00,
                "current_price": 1385.60,
                "day_change": -0.45,
                "sector": "IT",
                "color": "#0066b2",
                "icon": "💻",
                "history": [1440, 1430, 1425, 1420, 1410, 1400, 1395, 1390, 1385, 1380, 1375, 1378, 1380, 1383, 1386]
            },
            {
                "id": "inv-004",
                "name": "Parag Parikh Flexi Cap Fund",
                "symbol": "PPFCF",
                "type": "mutual_fund",
                "exchange": "MF",
                "quantity": 150.234,
                "avg_price": 55.80,
                "current_price": 68.42,
                "day_change": 0.35,
                "sector": "Flexi Cap",
                "color": "#10b981",
                "icon": "📊",
                "history": [56.2, 57.0, 57.8, 58.5, 59.2, 60.1, 61.0, 62.3, 63.5, 64.8, 65.5, 66.2, 67.0, 67.8, 68.4]
            },
            {
                "id": "inv-005",
                "name": "Nifty 50 Index Fund",
                "symbol": "NIFTY50",
                "type": "mutual_fund",
                "exchange": "MF",
                "quantity": 200.500,
                "avg_price": 180.20,
                "current_price": 198.75,
                "day_change": 0.62,
                "sector": "Index",
                "color": "#6366f1",
                "icon": "📈",
                "history": [181, 183, 184, 185, 187, 188, 190, 191, 193, 194, 195, 196, 197, 198, 199]
            },
            {
                "id": "inv-006",
                "name": "Sovereign Gold Bond 2024",
                "symbol": "SGB2024",
                "type": "gold",
                "exchange": "RBI",
                "quantity": 5,
                "avg_price": 5200.00,
                "current_price": 5850.00,
                "day_change": 0.15,
                "sector": "Gold",
                "color": "#f59e0b",
                "icon": "🥇",
                "history": [5220, 5280, 5310, 5350, 5400, 5450, 5500, 5550, 5600, 5650, 5700, 5750, 5790, 5820, 5850]
            },
            {
                "id": "inv-007",
                "name": "Tata Power",
                "symbol": "TATAPOWER",
                "type": "stock",
                "exchange": "NSE",
                "quantity": 50,
                "avg_price": 245.00,
                "current_price": 312.80,
                "day_change": 2.34,
                "sector": "Power",
                "color": "#ef4444",
                "icon": "⚡",
                "history": [248, 255, 260, 268, 272, 278, 282, 288, 290, 295, 298, 302, 305, 310, 313]
            },
            {
                "id": "inv-008",
                "name": "SBI Small Cap Fund",
                "symbol": "SBISCF",
                "type": "mutual_fund",
                "exchange": "MF",
                "quantity": 100.000,
                "avg_price": 110.50,
                "current_price": 132.18,
                "day_change": -0.22,
                "sector": "Small Cap",
                "color": "#8b5cf6",
                "icon": "🚀",
                "history": [112, 114, 116, 118, 120, 122, 124, 125, 127, 128, 129, 130, 131, 132, 132]
            }
        ]

        # --- Demo SIPs ---
        self.sips = [
            {"id": "sip-001", "investment_id": "inv-004", "name": "Parag Parikh Flexi Cap", "amount": 5000, "frequency": "monthly", "date": 5, "status": "active", "start_date": "2024-01-05", "total_invested": 100000, "current_value": 125000, "icon": "📊"},
            {"id": "sip-002", "investment_id": "inv-005", "name": "Nifty 50 Index Fund", "amount": 3000, "frequency": "monthly", "date": 10, "status": "active", "start_date": "2024-03-10", "total_invested": 54000, "current_value": 62500, "icon": "📈"},
            {"id": "sip-003", "investment_id": "inv-008", "name": "SBI Small Cap Fund", "amount": 2000, "frequency": "monthly", "date": 15, "status": "active", "start_date": "2024-06-15", "total_invested": 24000, "current_value": 28400, "icon": "🚀"},
        ]

        # --- Demo Watchlist ---
        self.watchlist = [
            {"id": "watch-001", "name": "TCS", "symbol": "TCS", "current_price": 3820.50, "day_change": 1.12, "sector": "IT", "icon": "💻"},
            {"id": "watch-002", "name": "Bajaj Finance", "symbol": "BAJFINANCE", "current_price": 6950.30, "day_change": -0.78, "sector": "NBFC", "icon": "🏦"},
            {"id": "watch-003", "name": "ITC Ltd", "symbol": "ITC", "current_price": 465.80, "day_change": 0.45, "sector": "FMCG", "icon": "🏭"},
            {"id": "watch-004", "name": "Asian Paints", "symbol": "ASIANPAINT", "current_price": 3150.25, "day_change": -0.32, "sector": "Paints", "icon": "🎨"},
        ]

        self.settings["presentation_mode"] = True

    # --- Computed Properties ---
    def get_summary(self):
        """Compute dashboard summary from current transactions."""
        now = datetime.now()
        current_month = now.month
        current_year = now.year

        monthly_txns = [
            t for t in self.transactions
            if datetime.strptime(t["date"], "%Y-%m-%d").month == current_month
            and datetime.strptime(t["date"], "%Y-%m-%d").year == current_year
        ]

        income = sum(t["amount"] for t in monthly_txns if t["amount"] > 0)
        expenses = abs(sum(t["amount"] for t in monthly_txns if t["amount"] < 0))
        savings = income - expenses
        total_balance = sum(a["balance"] for a in self.accounts) if self.accounts else (income - expenses)

        source_counts = {"bank_sync": 0, "statement_import": 0, "manual": 0}
        for t in self.transactions:
            src = t.get("source", "manual")
            if src in source_counts:
                source_counts[src] += 1

        return {
            "total_balance": total_balance,
            "income": income,
            "expenses": expenses,
            "savings": savings,
            "account_count": len(self.accounts),
            "transaction_count": len(self.transactions),
            "source_counts": source_counts
        }

    def get_category_breakdown(self):
        """Compute spending by category for the current month."""
        now = datetime.now()
        current_month = now.month
        current_year = now.year

        categories = {}
        for t in self.transactions:
            d = datetime.strptime(t["date"], "%Y-%m-%d")
            if d.month == current_month and d.year == current_year and t["amount"] < 0:
                cat = t.get("category", "Uncategorized")
                icon = t.get("category_icon", "📦")
                if cat not in categories:
                    categories[cat] = {"amount": 0, "icon": icon, "count": 0}
                categories[cat]["amount"] += abs(t["amount"])
                categories[cat]["count"] += 1

        result = [{"category": k, "icon": v["icon"], "amount": v["amount"], "count": v["count"]}
                  for k, v in categories.items()]
        result.sort(key=lambda x: x["amount"], reverse=True)
        return result

    def get_portfolio_summary(self):
        """Compute investment portfolio summary."""
        total_invested = 0
        current_value = 0
        day_pnl = 0

        for inv in self.investments:
            invested = inv["quantity"] * inv["avg_price"]
            current = inv["quantity"] * inv["current_price"]
            total_invested += invested
            current_value += current
            day_pnl += current * (inv["day_change"] / 100)

        total_pnl = current_value - total_invested
        total_pnl_pct = (total_pnl / total_invested * 100) if total_invested > 0 else 0

        type_alloc = {}
        for inv in self.investments:
            current = inv["quantity"] * inv["current_price"]
            t = inv["type"]
            if t not in type_alloc:
                type_alloc[t] = 0
            type_alloc[t] += current

        sector_alloc = {}
        for inv in self.investments:
            current = inv["quantity"] * inv["current_price"]
            s = inv["sector"]
            if s not in sector_alloc:
                sector_alloc[s] = 0
            sector_alloc[s] += current

        holdings_pnl = []
        for inv in self.investments:
            invested = inv["quantity"] * inv["avg_price"]
            current = inv["quantity"] * inv["current_price"]
            pnl = current - invested
            pnl_pct = (pnl / invested * 100) if invested > 0 else 0
            holdings_pnl.append({
                "id": inv["id"],
                "name": inv["name"],
                "symbol": inv["symbol"],
                "pnl": pnl,
                "pnl_pct": round(pnl_pct, 2),
                "type": inv["type"]
            })
        holdings_pnl.sort(key=lambda x: x["pnl_pct"], reverse=True)

        sip_total_monthly = sum(s["amount"] for s in self.sips if s["status"] == "active")
        sip_total_invested = sum(s["total_invested"] for s in self.sips)
        sip_current_value = sum(s["current_value"] for s in self.sips)

        return {
            "total_invested": round(total_invested),
            "current_value": round(current_value),
            "total_pnl": round(total_pnl),
            "total_pnl_pct": round(total_pnl_pct, 2),
            "day_pnl": round(day_pnl),
            "holdings_count": len(self.investments),
            "type_allocation": [{"type": k, "value": round(v)} for k, v in type_alloc.items()],
            "sector_allocation": [{"sector": k, "value": round(v)} for k, v in sorted(sector_alloc.items(), key=lambda x: x[1], reverse=True)],
            "top_gainers": holdings_pnl[:3],
            "top_losers": list(reversed(holdings_pnl[-3:])),
            "sip_monthly": sip_total_monthly,
            "sip_total_invested": sip_total_invested,
            "sip_current_value": sip_current_value
        }

    def get_budget_status(self):
        """Compute budget usage from transactions."""
        breakdown = {c["category"]: c["amount"] for c in self.get_category_breakdown()}
        result = []
        for b in self.budgets:
            spent = breakdown.get(b["category"], 0)
            result.append({
                **b,
                "spent": spent,
                "remaining": max(0, b["limit"] - spent),
                "percentage": min(100, round((spent / b["limit"]) * 100)) if b["limit"] > 0 else 0
            })
        return result

    def get_daily_spending(self, days=30):
        """Get daily spending totals for charts."""
        now = datetime.now()
        daily = {}
        for i in range(days):
            d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            daily[d] = {"income": 0, "expenses": 0}

        for t in self.transactions:
            if t["date"] in daily:
                if t["amount"] > 0:
                    daily[t["date"]]["income"] += t["amount"]
                else:
                    daily[t["date"]]["expenses"] += abs(t["amount"])

        result = [{"date": k, **v} for k, v in sorted(daily.items())]
        return result

    def detect_duplicates(self, new_transactions):
        """Check for potential duplicate transactions."""
        duplicates = []
        for new_tx in new_transactions:
            for existing in self.transactions:
                if (existing["date"] == new_tx["date"] and
                    existing["amount"] == new_tx["amount"] and
                    existing["description"] == new_tx["description"]):
                    duplicates.append({
                        "new": new_tx,
                        "existing": existing
                    })
        return duplicates


# Global store
store = DataStore()
store.load_demo_data()  # Start with demo data


# =============================================================================
# BANK CONNECTION PROVIDER ABSTRACTION
# =============================================================================

class BankConnectionProvider:
    """Abstract base for bank connection providers."""
    def connect_account(self, bank_id, credentials=None):
        raise NotImplementedError
    def get_accounts(self):
        raise NotImplementedError
    def get_balances(self, account_id):
        raise NotImplementedError
    def get_transactions(self, account_id, from_date=None, to_date=None):
        raise NotImplementedError
    def sync_transactions(self, account_id):
        raise NotImplementedError
    def disconnect_account(self, account_id):
        raise NotImplementedError


class DemoBankProvider(BankConnectionProvider):
    """Demo provider for presentations. No real credentials used."""

    DEMO_BANKS = [
        {"id": "demo-hdfc", "name": "HDFC Bank", "logo": "🏦", "color": "#004c8f"},
        {"id": "demo-icici", "name": "ICICI Bank", "logo": "🏦", "color": "#f58220"},
        {"id": "demo-sbi", "name": "SBI", "logo": "🏦", "color": "#1a4fa0"},
        {"id": "demo-axis", "name": "Axis Bank", "logo": "🏦", "color": "#97144d"},
        {"id": "demo-kotak", "name": "Kotak Mahindra", "logo": "🏦", "color": "#ed1c24"},
    ]

    DEMO_ACCOUNTS = {
        "demo-hdfc": [
            {"id": "demo-acc-001", "name": "Savings Account", "last_four": "7823", "balance": 38450, "type": "savings"},
            {"id": "demo-acc-002", "name": "Current Account", "last_four": "9156", "balance": 125000, "type": "current"},
        ],
        "demo-icici": [
            {"id": "demo-acc-003", "name": "Savings Account", "last_four": "3491", "balance": 22100, "type": "savings"},
        ],
        "demo-sbi": [
            {"id": "demo-acc-004", "name": "Savings Account", "last_four": "6742", "balance": 55200, "type": "savings"},
        ],
        "demo-axis": [
            {"id": "demo-acc-005", "name": "Salary Account", "last_four": "1587", "balance": 67800, "type": "savings"},
        ],
        "demo-kotak": [
            {"id": "demo-acc-006", "name": "Savings Account", "last_four": "4290", "balance": 31500, "type": "savings"},
        ]
    }

    def get_available_banks(self):
        return self.DEMO_BANKS

    def get_bank_accounts(self, bank_id):
        return self.DEMO_ACCOUNTS.get(bank_id, [])

    def connect_account(self, bank_id, account_id=None):
        bank = next((b for b in self.DEMO_BANKS if b["id"] == bank_id), None)
        if not bank:
            return {"success": False, "error": "Bank not found"}
        accounts = self.DEMO_ACCOUNTS.get(bank_id, [])
        if account_id:
            accounts = [a for a in accounts if a["id"] == account_id]
        return {"success": True, "bank": bank, "accounts": accounts}

    def generate_demo_transactions(self, account_id, count=47):
        """Generate realistic demo transactions for a newly connected account."""
        now = datetime.now()
        txns = []
        descs_expense = [
            ("Zomato Order", "Food & Dining", "🍕", -random.randint(200, 800)),
            ("Amazon Purchase", "Shopping", "🛍️", -random.randint(500, 3000)),
            ("Uber Ride", "Transport", "🚗", -random.randint(100, 500)),
            ("Netflix", "Entertainment", "🎬", -649),
            ("Electricity Bill", "Bills & Utilities", "📱", -random.randint(800, 2500)),
            ("Swiggy", "Food & Dining", "🍕", -random.randint(200, 600)),
            ("Flipkart", "Shopping", "🛍️", -random.randint(300, 2000)),
            ("Ola Cab", "Transport", "🚗", -random.randint(100, 400)),
            ("Spotify", "Entertainment", "🎬", -119),
            ("Jio Recharge", "Bills & Utilities", "📱", -399),
            ("Pharmacy", "Health", "🏥", -random.randint(200, 1000)),
            ("Gym", "Health", "🏥", -1500),
            ("Petrol", "Transport", "🚗", -random.randint(500, 2000)),
            ("Grocery", "Food & Dining", "🍕", -random.randint(500, 2500)),
            ("Restaurant", "Food & Dining", "🍕", -random.randint(300, 1200)),
        ]
        descs_income = [
            ("Salary Credit", "Salary", "💼", random.randint(35000, 65000)),
            ("Freelance Payment", "Freelance", "💻", random.randint(5000, 20000)),
            ("Interest Credit", "Investment Returns", "📈", random.randint(500, 3000)),
        ]

        for i in range(count):
            days_ago = random.randint(0, 59)
            if random.random() < 0.15:  # 15% income
                desc, cat, icon, amt = random.choice(descs_income)
                tx_type = "income"
            else:
                desc, cat, icon, amt = random.choice(descs_expense)
                tx_type = "expense"
                # Re-randomize amounts for variety
                if amt != -649 and amt != -119 and amt != -399 and amt != -1500:
                    if tx_type == "expense":
                        amt = -random.randint(100, 3000)

            txns.append({
                "id": f"tx-sync-{uuid.uuid4().hex[:8]}",
                "date": (now - timedelta(days=days_ago)).strftime("%Y-%m-%d"),
                "description": desc,
                "amount": amt,
                "category": cat,
                "category_icon": icon,
                "type": tx_type,
                "source": "bank_sync",
                "account_id": account_id,
                "status": "completed",
                "tags": []
            })

        txns.sort(key=lambda t: t["date"], reverse=True)
        return txns

    def sync_transactions(self, account_id):
        return self.generate_demo_transactions(account_id, count=47)

    def disconnect_account(self, account_id):
        return {"success": True}


demo_bank_provider = DemoBankProvider()


# =============================================================================
# AI ADVISOR ENGINE (uses real application data)
# =============================================================================

class AIAdvisor:
    """AI Advisor that analyses the store's actual transaction data."""

    def analyze(self, query):
        """Process a user query against real transaction data."""
        query_lower = query.lower()
        breakdown = store.get_category_breakdown()
        summary = store.get_summary()
        budgets = store.get_budget_status()

        if not store.transactions:
            return {
                "response": "I need more transaction history to give you a reliable insight. Try connecting a bank account or importing a statement first.",
                "type": "insufficient_data",
                "data": None
            }

        # --- Where did I spend the most? ---
        if any(kw in query_lower for kw in ["spend the most", "highest spending", "most spending", "top spending", "where did i spend", "spending breakdown"]):
            if not breakdown:
                return {"response": "No spending data available for this month yet.", "type": "info", "data": None}
            top = breakdown[0]
            lines = [f"Based on your transaction data, here's your spending breakdown this month:\n"]
            for i, cat in enumerate(breakdown[:6]):
                bar = "█" * max(1, int(cat["amount"] / max(1, breakdown[0]["amount"]) * 10))
                lines.append(f"{cat['icon']} **{cat['category']}**: ₹{cat['amount']:,.0f} ({cat['count']} transactions) {bar}")
            lines.append(f"\n🔍 **Top Category**: {top['icon']} {top['category']} at ₹{top['amount']:,.0f}")
            if len(breakdown) > 1:
                total_spend = sum(c["amount"] for c in breakdown)
                pct = round(top["amount"] / total_spend * 100)
                lines.append(f"That's {pct}% of your total spending of ₹{total_spend:,.0f}")
            return {"response": "\n".join(lines), "type": "spending_analysis", "data": breakdown[:6]}

        # --- Budget status ---
        if any(kw in query_lower for kw in ["budget", "over budget", "budget status"]):
            if not budgets:
                return {"response": "You haven't set up any budgets yet. Go to Budgets to create your first budget.", "type": "info", "data": None}
            lines = ["Here's your current budget status:\n"]
            for b in budgets:
                status_icon = "🔴" if b["percentage"] >= 90 else "🟡" if b["percentage"] >= 70 else "🟢"
                lines.append(f"{status_icon} **{b['category']}**: ₹{b['spent']:,.0f} / ₹{b['limit']:,.0f} ({b['percentage']}%)")
            over = [b for b in budgets if b["percentage"] >= 90]
            if over:
                lines.append(f"\n⚠️ **Warning**: {len(over)} budget(s) are at or near their limit!")
            return {"response": "\n".join(lines), "type": "budget_analysis", "data": budgets}

        # --- Savings / goals ---
        if any(kw in query_lower for kw in ["savings", "save", "goal", "target"]):
            if not store.goals:
                return {"response": "You haven't set any savings goals yet.", "type": "info", "data": None}
            lines = ["Here's your savings goal progress:\n"]
            for g in store.goals:
                pct = round(g["current"] / g["target"] * 100)
                lines.append(f"{g['icon']} **{g['name']}**: ₹{g['current']:,.0f} / ₹{g['target']:,.0f} ({pct}%)")
            total_saved = sum(g["current"] for g in store.goals)
            total_target = sum(g["target"] for g in store.goals)
            lines.append(f"\n💰 **Total Saved**: ₹{total_saved:,.0f} of ₹{total_target:,.0f}")
            return {"response": "\n".join(lines), "type": "goal_analysis", "data": store.goals}

        # --- Income ---
        if any(kw in query_lower for kw in ["income", "earn", "salary"]):
            return {
                "response": f"Your total income this month is **₹{summary['income']:,.0f}** across your connected accounts.\n\nYour savings rate is {round(summary['savings']/max(1,summary['income'])*100)}%.",
                "type": "income_analysis",
                "data": {"income": summary["income"], "savings": summary["savings"]}
            }

        # --- Summary ---
        if any(kw in query_lower for kw in ["summary", "overview", "how am i doing", "financial health", "report"]):
            health_score = min(100, max(0, 50 + int(summary["savings"] / max(1, summary["income"]) * 100)))
            lines = [
                f"📊 **Monthly Financial Summary**\n",
                f"💰 Income: ₹{summary['income']:,.0f}",
                f"💸 Expenses: ₹{summary['expenses']:,.0f}",
                f"📈 Savings: ₹{summary['savings']:,.0f}",
                f"🏦 Balance: ₹{summary['total_balance']:,.0f}",
                f"\n🏥 **Financial Health Score**: {health_score}/100",
            ]
            if summary["savings"] > 0:
                lines.append("✅ Great job! You're spending less than you earn.")
            else:
                lines.append("⚠️ You're spending more than you earn this month. Consider reducing discretionary spending.")
            return {"response": "\n".join(lines), "type": "summary", "data": summary}

        # --- Tips ---
        if any(kw in query_lower for kw in ["tip", "advice", "suggest", "recommend", "help me"]):
            tips = []
            if breakdown:
                top = breakdown[0]
                tips.append(f"Your highest spending category is {top['icon']} {top['category']} at ₹{top['amount']:,.0f}. Consider setting a budget for this.")
            over_budgets = [b for b in budgets if b["percentage"] >= 80]
            if over_budgets:
                names = ", ".join(b["category"] for b in over_budgets)
                tips.append(f"You're close to exceeding budgets in: {names}. Try to limit spending in these areas for the rest of the month.")
            if summary["savings"] > 0:
                tips.append(f"You're saving ₹{summary['savings']:,.0f} this month. Consider allocating some to your savings goals.")
            if not tips:
                tips.append("Keep tracking your expenses consistently. The more data I have, the better advice I can give!")
            return {"response": "💡 **Smart Tips**\n\n" + "\n\n".join(f"• {t}" for t in tips), "type": "tips", "data": None}

        # --- Default: General analysis ---
        return {
            "response": f"Based on your {len(store.transactions)} transactions:\n\n"
                       f"💰 Monthly Income: ₹{summary['income']:,.0f}\n"
                       f"💸 Monthly Expenses: ₹{summary['expenses']:,.0f}\n"
                       f"📈 Net Savings: ₹{summary['savings']:,.0f}\n\n"
                       f"Ask me about your spending breakdown, budget status, savings goals, or financial health for more specific insights!",
            "type": "general",
            "data": summary
        }

    def get_insights(self):
        """Generate proactive financial insights, recurring subscription detection & anomaly alerts."""
        summary = store.get_summary()
        breakdown = store.get_category_breakdown()
        txns = store.transactions
        
        # 1. Detect Recurring Subscriptions & Fixed Expenses
        desc_counts = {}
        for t in txns:
            if t["type"] == "expense":
                key = t["description"].strip()
                if key not in desc_counts:
                    desc_counts[key] = {"count": 0, "total_amt": 0, "category": t["category"], "icon": t.get("category_icon", "💳")}
                desc_counts[key]["count"] += 1
                desc_counts[key]["total_amt"] += abs(t["amount"])
        
        subscriptions = []
        for desc, info in desc_counts.items():
            if info["count"] >= 2 or any(sub in desc.lower() for sub in ["netflix", "spotify", "swiggy", "zomato", "recharge", "sub", "subscription", "prime"]):
                avg_amt = info["total_amt"] / info["count"]
                subscriptions.append({
                    "name": desc,
                    "count": info["count"],
                    "avg_amount": round(avg_amt),
                    "total_amount": round(info["total_amt"]),
                    "category": info["category"],
                    "icon": info["icon"]
                })
        subscriptions.sort(key=lambda s: s["total_amount"], reverse=True)

        # 2. Detect Anomalies & Large Transactions
        anomalies = []
        monthly_income = max(1, summary["income"])
        for t in txns:
            if t["type"] == "expense" and abs(t["amount"]) >= (monthly_income * 0.15):
                anomalies.append({
                    "id": t["id"],
                    "description": t["description"],
                    "amount": abs(t["amount"]),
                    "date": t["date"],
                    "category": t["category"],
                    "reason": f"High value transaction ({round(abs(t['amount'])/monthly_income*100)}% of monthly income)"
                })

        # 3. Emergency Fund & Runway Calculation
        monthly_expense = max(1, summary["expenses"])
        total_balance = max(0, summary["total_balance"])
        runway_months = round(total_balance / monthly_expense, 1)

        # 4. Savings Projection (3, 6, 12 months)
        current_savings_rate = summary["savings"]
        projections = {
            "3_months": max(0, total_balance + (current_savings_rate * 3)),
            "6_months": max(0, total_balance + (current_savings_rate * 6)),
            "12_months": max(0, total_balance + (current_savings_rate * 12))
        }

        return {
            "subscriptions": subscriptions[:6],
            "subscription_monthly_total": sum(s["avg_amount"] for s in subscriptions),
            "anomalies": anomalies[:5],
            "runway_months": runway_months,
            "savings_rate_pct": round(summary["savings"] / max(1, summary["income"]) * 100),
            "projections": projections
        }

    def simulate_scenario(self, category_to_cut=None, cut_percentage=0, one_time_expense=0, additional_monthly_savings=0):
        """Simulate 'What-If' financial scenarios against real data."""
        summary = store.get_summary()
        breakdown = store.get_category_breakdown()
        
        current_income = summary["income"]
        current_expense = summary["expenses"]
        current_net_savings = summary["savings"]
        current_balance = summary["total_balance"]

        # Category cut savings
        cat_savings = 0
        target_cat_amount = 0
        if category_to_cut:
            cat_match = next((c for c in breakdown if c["category"].lower() == category_to_cut.lower()), None)
            if cat_match:
                target_cat_amount = cat_match["amount"]
                cat_savings = target_cat_amount * (float(cut_percentage) / 100.0)

        # New projected stats
        new_monthly_expense = current_expense - cat_savings
        new_monthly_savings = current_income - new_monthly_expense + float(additional_monthly_savings)
        monthly_savings_diff = new_monthly_savings - current_net_savings
        annual_impact = (monthly_savings_diff * 12) - float(one_time_expense)

        # Goal acceleration calculation
        goal_impacts = []
        for g in store.goals:
            rem = max(0, g["target"] - g["current"])
            current_months = round(rem / max(1, current_net_savings), 1) if current_net_savings > 0 else 999
            new_months = round(rem / max(1, new_monthly_savings), 1) if new_monthly_savings > 0 else 999
            months_saved = max(0, round(current_months - new_months, 1))
            goal_impacts.append({
                "name": g["name"],
                "icon": g["icon"],
                "target": g["target"],
                "current": g["current"],
                "current_months_remaining": current_months if current_months < 900 else "N/A",
                "new_months_remaining": new_months if new_months < 900 else "N/A",
                "months_saved": months_saved
            })

        # Projected Runway
        new_runway_months = round(max(0, current_balance - float(one_time_expense)) / max(1, new_monthly_expense), 1)

        return {
            "current_state": {
                "income": current_income,
                "expense": current_expense,
                "net_savings": current_net_savings,
                "total_balance": current_balance
            },
            "simulation_inputs": {
                "category_to_cut": category_to_cut,
                "cut_percentage": cut_percentage,
                "one_time_expense": one_time_expense,
                "additional_monthly_savings": additional_monthly_savings
            },
            "projected_state": {
                "monthly_category_savings": round(cat_savings),
                "new_monthly_expense": round(new_monthly_expense),
                "new_monthly_savings": round(new_monthly_savings),
                "monthly_savings_diff": round(monthly_savings_diff),
                "annual_impact": round(annual_impact),
                "new_runway_months": new_runway_months
            },
            "goal_projections": goal_impacts
        }


ai_advisor = AIAdvisor()



# =============================================================================
# MONTHLY REPORT GENERATOR
# =============================================================================

def generate_monthly_report():
    """Generate a comprehensive monthly financial report."""
    summary = store.get_summary()
    breakdown = store.get_category_breakdown()
    budgets = store.get_budget_status()
    daily = store.get_daily_spending(30)

    health_score = min(100, max(0, 50 + int(summary["savings"] / max(1, summary["income"]) * 100)))

    report = {
        "title": f"FinMate Monthly Report",
        "period": datetime.now().strftime("%B %Y"),
        "generated_at": datetime.now().isoformat(),
        "summary": summary,
        "health_score": health_score,
        "category_breakdown": breakdown,
        "budget_status": budgets,
        "daily_spending": daily,
        "goals": store.goals,
        "insights": [],
        "recommendations": []
    }

    # Generate insights
    if breakdown:
        report["insights"].append(f"Top spending category: {breakdown[0]['icon']} {breakdown[0]['category']} at ₹{breakdown[0]['amount']:,.0f}")
    if summary["savings"] > 0:
        rate = round(summary["savings"] / max(1, summary["income"]) * 100)
        report["insights"].append(f"Savings rate: {rate}% — {'Excellent!' if rate > 30 else 'Good' if rate > 15 else 'Could be improved'}")

    over = [b for b in budgets if b["percentage"] >= 90]
    if over:
        report["insights"].append(f"{len(over)} budget(s) exceeded or near limit")

    # Recommendations
    if summary["savings"] <= 0:
        report["recommendations"].append("Consider reducing discretionary spending to build savings.")
    if not store.goals:
        report["recommendations"].append("Set up savings goals to build financial discipline.")
    if len(store.accounts) == 0:
        report["recommendations"].append("Connect your bank account for automatic tracking.")
    if summary["savings"] > 0 and store.goals:
        unfunded = [g for g in store.goals if g["current"] < g["target"]]
        if unfunded:
            report["recommendations"].append(f"Allocate surplus savings to your {len(unfunded)} active goal(s).")

    return report


# =============================================================================
# ROUTES - Pages
# =============================================================================

@app.route('/')
def index():
    return render_template('index.html')


# =============================================================================
# ROUTES - API
# =============================================================================

# --- Dashboard ---
@app.route('/api/dashboard')
def api_dashboard():
    return jsonify({
        "summary": store.get_summary(),
        "accounts": store.accounts,
        "recent_transactions": store.transactions[:10],
        "category_breakdown": store.get_category_breakdown(),
        "daily_spending": store.get_daily_spending(30),
        "budget_status": store.get_budget_status(),
        "goals": store.goals,
        "notifications": [n for n in store.notifications if not n["read"]]
    })


# --- Transactions ---
@app.route('/api/transactions')
def api_transactions():
    source = request.args.get('source')
    category = request.args.get('category')
    search = request.args.get('search', '').lower()

    txns = store.transactions
    if source:
        txns = [t for t in txns if t["source"] == source]
    if category:
        txns = [t for t in txns if t["category"] == category]
    if search:
        txns = [t for t in txns if search in t["description"].lower() or search in t["category"].lower()]

    return jsonify({"transactions": txns, "total": len(txns)})


@app.route('/api/transactions', methods=['POST'])
def api_add_transaction():
    data = request.json
    tx = {
        "id": f"tx-{uuid.uuid4().hex[:8]}",
        "date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
        "description": data["description"],
        "amount": -abs(float(data["amount"])) if data.get("type") == "expense" else abs(float(data["amount"])),
        "category": data.get("category", "Uncategorized"),
        "category_icon": data.get("category_icon", "📦"),
        "type": data.get("type", "expense"),
        "source": "manual",
        "account_id": data.get("account_id"),
        "status": "completed",
        "tags": data.get("tags", [])
    }
    store.transactions.insert(0, tx)
    store.transactions.sort(key=lambda t: t["date"], reverse=True)

    # Add notification
    store.notifications.insert(0, {
        "id": f"notif-{uuid.uuid4().hex[:6]}",
        "type": "transaction",
        "title": "Transaction Added",
        "message": f"{'Expense' if tx['type'] == 'expense' else 'Income'} of ₹{abs(tx['amount']):,.0f} added manually.",
        "icon": "➕",
        "read": False,
        "timestamp": datetime.now().isoformat(),
        "action": "transactions"
    })

    return jsonify({"success": True, "transaction": tx})


@app.route('/api/transactions/<tx_id>', methods=['DELETE'])
def api_delete_transaction(tx_id):
    store.transactions = [t for t in store.transactions if t["id"] != tx_id]
    return jsonify({"success": True})


# --- Accounts ---
@app.route('/api/accounts')
def api_accounts():
    return jsonify({"accounts": store.accounts})

@app.route('/api/accounts', methods=['POST'])
def api_add_account():
    data = request.json
    acc = {
        "id": f"acc-manual-{uuid.uuid4().hex[:6]}",
        "bank": data.get("bank", "Manual Account"),
        "name": data["name"],
        "type": data.get("type", "savings"),
        "last_four": data.get("last_four", "0000")[-4:],
        "balance": float(data.get("balance", 0)),
        "status": "manual",
        "provider": "manual",
        "last_synced": datetime.now().isoformat(),
        "color": data.get("color", "#6366f1")
    }
    store.accounts.append(acc)
    return jsonify({"success": True, "account": acc})


# --- Bank Connection ---
@app.route('/api/banks/available')
def api_available_banks():
    return jsonify({"banks": demo_bank_provider.get_available_banks()})


@app.route('/api/banks/<bank_id>/accounts')
def api_bank_accounts(bank_id):
    accounts = demo_bank_provider.get_bank_accounts(bank_id)
    return jsonify({"accounts": accounts})


@app.route('/api/banks/connect', methods=['POST'])
def api_connect_bank():
    data = request.json
    bank_id = data.get("bank_id")
    account_id = data.get("account_id")

    result = demo_bank_provider.connect_account(bank_id, account_id)
    if not result["success"]:
        return jsonify(result), 400

    # Add accounts to store
    for acc in result["accounts"]:
        existing = next((a for a in store.accounts if a["last_four"] == acc["last_four"]), None)
        if not existing:
            store.accounts.append({
                "id": acc["id"],
                "bank": result["bank"]["name"],
                "name": acc["name"],
                "type": acc["type"],
                "last_four": acc["last_four"],
                "balance": acc["balance"],
                "status": "demo_connected",
                "provider": "demo",
                "last_synced": datetime.now().isoformat(),
                "color": result["bank"]["color"]
            })

    return jsonify({"success": True, "accounts": result["accounts"]})


@app.route('/api/banks/sync', methods=['POST'])
def api_sync_bank():
    data = request.json
    account_id = data.get("account_id")

    new_txns = demo_bank_provider.sync_transactions(account_id)
    duplicates = store.detect_duplicates(new_txns)

    # Remove duplicates from new transactions
    dup_ids = {d["new"]["id"] for d in duplicates}
    unique_txns = [t for t in new_txns if t["id"] not in dup_ids]

    return jsonify({
        "success": True,
        "new_transactions": unique_txns,
        "duplicates": duplicates,
        "total_found": len(new_txns),
        "duplicate_count": len(duplicates)
    })


@app.route('/api/banks/import', methods=['POST'])
def api_import_transactions():
    """Import transactions after sync/statement review."""
    data = request.json
    transactions = data.get("transactions", [])
    source = data.get("source", "bank_sync")

    imported = 0
    for tx in transactions:
        tx["source"] = source
        tx["status"] = "completed"
        if "id" not in tx:
            tx["id"] = f"tx-{uuid.uuid4().hex[:8]}"
        store.transactions.append(tx)
        imported += 1

    store.transactions.sort(key=lambda t: t["date"], reverse=True)

    # Notification
    store.notifications.insert(0, {
        "id": f"notif-{uuid.uuid4().hex[:6]}",
        "type": "sync",
        "title": "Transactions Imported",
        "message": f"{imported} transactions imported via {source.replace('_', ' ')}.",
        "icon": "✅",
        "read": False,
        "timestamp": datetime.now().isoformat(),
        "action": "transactions"
    })

    return jsonify({"success": True, "imported": imported})


@app.route('/api/banks/disconnect', methods=['POST'])
def api_disconnect_bank():
    data = request.json
    account_id = data.get("account_id")
    store.accounts = [a for a in store.accounts if a["id"] != account_id]
    return jsonify({"success": True})


# --- PDF Statement Import ---
@app.route('/api/statement/parse', methods=['POST'])
def api_parse_statement():
    """Simulate parsing a PDF statement. In production, would use a real parser."""
    # Generate demo parsed transactions
    now = datetime.now()
    parsed = []
    items = [
        ("UPI/Zomato/Payment", "Food & Dining", "🍕", -random.randint(200, 800)),
        ("NEFT/Salary/Company", "Salary", "💼", random.randint(30000, 60000)),
        ("POS/Amazon/Purchase", "Shopping", "🛍️", -random.randint(500, 3000)),
        ("UPI/Uber/Ride", "Transport", "🚗", -random.randint(100, 400)),
        ("NACH/Netflix/Sub", "Entertainment", "🎬", -649),
        ("UPI/Swiggy/Food", "Food & Dining", "🍕", -random.randint(200, 600)),
        ("ATM/Cash/Withdrawal", "Cash", "💵", -random.randint(1000, 5000)),
        ("IMPS/FreeProject/Pmt", "Freelance", "💻", random.randint(5000, 15000)),
        ("POS/Reliance/Store", "Shopping", "🛍️", -random.randint(500, 2000)),
        ("UPI/PhonePe/Transfer", "Transfer", "🔄", -random.randint(500, 3000)),
        ("NEFT/FD/Interest", "Investment Returns", "📈", random.randint(500, 2000)),
        ("POS/Apollo/Pharmacy", "Health", "🏥", -random.randint(200, 800)),
        ("UPI/Jio/Recharge", "Bills & Utilities", "📱", -399),
        ("UPI/Electricity/Bill", "Bills & Utilities", "📱", -random.randint(800, 2000)),
        ("POS/Croma/Electronics", "Shopping", "🛍️", -random.randint(1000, 5000)),
        ("UPI/DMart/Grocery", "Food & Dining", "🍕", -random.randint(1000, 3000)),
        ("POS/BookMyShow/Tkts", "Entertainment", "🎬", -random.randint(300, 800)),
        ("UPI/Ola/Ride", "Transport", "🚗", -random.randint(100, 500)),
    ]

    for i, (desc, cat, icon, amt) in enumerate(items):
        days_ago = random.randint(1, 30)
        parsed.append({
            "id": f"tx-stmt-{uuid.uuid4().hex[:8]}",
            "date": (now - timedelta(days=days_ago)).strftime("%Y-%m-%d"),
            "description": desc,
            "amount": amt,
            "category": cat,
            "category_icon": icon,
            "type": "income" if amt > 0 else "expense",
            "source": "statement_import",
            "account_id": None,
            "status": "pending_review",
            "tags": [],
            "confidence": random.randint(75, 99)
        })

    parsed.sort(key=lambda t: t["date"], reverse=True)
    duplicates = store.detect_duplicates(parsed)

    return jsonify({
        "success": True,
        "transactions": parsed,
        "duplicates": [{"description": d["new"]["description"], "date": d["new"]["date"], "amount": d["new"]["amount"]} for d in duplicates],
        "duplicate_count": len(duplicates),
        "statement_info": {
            "bank": "HDFC Bank",
            "account": "Savings Account ****4582",
            "period": f"{(now - timedelta(days=30)).strftime('%d %b %Y')} - {now.strftime('%d %b %Y')}",
            "total_transactions": len(parsed)
        }
    })


# --- Analytics ---
@app.route('/api/analytics')
def api_analytics():
    return jsonify({
        "category_breakdown": store.get_category_breakdown(),
        "daily_spending": store.get_daily_spending(30),
        "summary": store.get_summary(),
        "monthly_trend": store.get_daily_spending(90)
    })


# --- Budgets ---
@app.route('/api/budgets')
def api_budgets():
    return jsonify({"budgets": store.get_budget_status()})


@app.route('/api/budgets', methods=['POST'])
def api_add_budget():
    data = request.json
    budget = {
        "id": f"bud-{uuid.uuid4().hex[:6]}",
        "category": data["category"],
        "icon": data.get("icon", "📦"),
        "limit": float(data["limit"]),
        "period": data.get("period", "monthly"),
        "color": data.get("color", "#42a5f5")
    }
    store.budgets.append(budget)
    return jsonify({"success": True, "budget": budget})


@app.route('/api/budgets/<budget_id>', methods=['DELETE'])
def api_delete_budget(budget_id):
    store.budgets = [b for b in store.budgets if b["id"] != budget_id]
    return jsonify({"success": True})


# --- Goals ---
@app.route('/api/goals')
def api_goals():
    return jsonify({"goals": store.goals})


@app.route('/api/goals', methods=['POST'])
def api_add_goal():
    data = request.json
    goal = {
        "id": f"goal-{uuid.uuid4().hex[:6]}",
        "name": data["name"],
        "icon": data.get("icon", "🎯"),
        "target": float(data["target"]),
        "current": float(data.get("current", 0)),
        "deadline": data.get("deadline", (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d")),
        "color": data.get("color", "#1a73e8"),
        "monthly_contribution": float(data.get("monthly_contribution", 0))
    }
    store.goals.append(goal)
    return jsonify({"success": True, "goal": goal})


@app.route('/api/goals/<goal_id>', methods=['PUT'])
def api_update_goal(goal_id):
    data = request.json
    for g in store.goals:
        if g["id"] == goal_id:
            g.update({k: v for k, v in data.items() if k != "id"})
            return jsonify({"success": True, "goal": g})
    return jsonify({"success": False, "error": "Goal not found"}), 404


@app.route('/api/goals/<goal_id>', methods=['DELETE'])
def api_delete_goal(goal_id):
    store.goals = [g for g in store.goals if g["id"] != goal_id]
    return jsonify({"success": True})


# --- AI Advisor ---
@app.route('/api/ai/chat', methods=['POST'])
def api_ai_chat():
    data = request.json
    query = data.get("message", "")
    result = ai_advisor.analyze(query)

    store.ai_chat_history.append({"role": "user", "message": query, "timestamp": datetime.now().isoformat()})
    store.ai_chat_history.append({"role": "assistant", "message": result["response"], "timestamp": datetime.now().isoformat(), "type": result["type"]})

    return jsonify({
        "success": True,
        "response": result["response"],
        "type": result["type"],
        "data": result["data"]
    })


@app.route('/api/ai/chat/history')
def api_ai_chat_history():
    return jsonify({"history": store.ai_chat_history})


@app.route('/api/ai/insights')
def api_ai_insights():
    return jsonify({
        "success": True,
        "insights": ai_advisor.get_insights()
    })


@app.route('/api/ai/simulate', methods=['POST'])
def api_ai_simulate():
    data = request.json or {}
    simulation = ai_advisor.simulate_scenario(
        category_to_cut=data.get("category_to_cut"),
        cut_percentage=float(data.get("cut_percentage", 0)),
        one_time_expense=float(data.get("one_time_expense", 0)),
        additional_monthly_savings=float(data.get("additional_monthly_savings", 0))
    )
    return jsonify({
        "success": True,
        "simulation": simulation
    })



# --- Monthly Report ---
@app.route('/api/report')
def api_monthly_report():
    report = generate_monthly_report()
    return jsonify(report)


# --- Notifications ---
@app.route('/api/notifications')
def api_notifications():
    return jsonify({"notifications": store.notifications})


@app.route('/api/notifications/<notif_id>/read', methods=['POST'])
def api_mark_notification_read(notif_id):
    for n in store.notifications:
        if n["id"] == notif_id:
            n["read"] = True
    return jsonify({"success": True})


@app.route('/api/notifications/read-all', methods=['POST'])
def api_mark_all_read():
    for n in store.notifications:
        n["read"] = True
    return jsonify({"success": True})


# --- Settings ---
@app.route('/api/settings')
def api_settings():
    return jsonify({"settings": store.settings})


@app.route('/api/settings', methods=['PUT'])
def api_update_settings():
    data = request.json
    store.settings.update(data)
    return jsonify({"success": True, "settings": store.settings})


# --- Presentation Mode ---
@app.route('/api/presentation/start', methods=['POST'])
def api_start_presentation():
    store.load_demo_data()
    return jsonify({"success": True, "message": "Presentation mode activated with sample data."})


@app.route('/api/presentation/reset', methods=['POST'])
def api_reset_presentation():
    store.clear()
    store.settings["presentation_mode"] = False
    return jsonify({"success": True, "message": "Data cleared."})


# --- Duplicate Check ---
@app.route('/api/duplicates/check', methods=['POST'])
def api_check_duplicates():
    data = request.json
    transactions = data.get("transactions", [])
    duplicates = store.detect_duplicates(transactions)
    return jsonify({
        "duplicates": duplicates,
        "count": len(duplicates)
    })


# =============================================================================
# ROUTES - Investment Portfolio
# =============================================================================

@app.route('/api/investments')
def api_investments():
    return jsonify({
        "investments": store.investments,
        "summary": store.get_portfolio_summary()
    })


@app.route('/api/investments', methods=['POST'])
def api_add_investment():
    data = request.json
    inv = {
        "id": f"inv-{uuid.uuid4().hex[:6]}",
        "name": data["name"],
        "symbol": data.get("symbol", data["name"][:4].upper()),
        "type": data.get("type", "stock"),
        "exchange": data.get("exchange", "NSE"),
        "quantity": float(data["quantity"]),
        "avg_price": float(data["avg_price"]),
        "current_price": float(data.get("current_price", data["avg_price"])),
        "day_change": float(data.get("day_change", 0)),
        "sector": data.get("sector", "Other"),
        "color": data.get("color", "#6366f1"),
        "icon": data.get("icon", "📈"),
        "history": []
    }
    store.investments.append(inv)
    return jsonify({"success": True, "investment": inv})


@app.route('/api/investments/<inv_id>', methods=['PUT'])
def api_update_investment(inv_id):
    data = request.json
    for inv in store.investments:
        if inv["id"] == inv_id:
            for k, v in data.items():
                if k != "id":
                    inv[k] = v
            return jsonify({"success": True, "investment": inv})
    return jsonify({"success": False, "error": "Investment not found"}), 404


@app.route('/api/investments/<inv_id>', methods=['DELETE'])
def api_delete_investment(inv_id):
    store.investments = [i for i in store.investments if i["id"] != inv_id]
    return jsonify({"success": True})


@app.route('/api/sips')
def api_sips():
    return jsonify({"sips": store.sips})


@app.route('/api/sips', methods=['POST'])
def api_add_sip():
    data = request.json
    sip = {
        "id": f"sip-{uuid.uuid4().hex[:6]}",
        "investment_id": data.get("investment_id"),
        "name": data["name"],
        "amount": float(data["amount"]),
        "frequency": data.get("frequency", "monthly"),
        "date": int(data.get("date", 1)),
        "status": "active",
        "start_date": datetime.now().strftime("%Y-%m-%d"),
        "total_invested": 0,
        "current_value": 0,
        "icon": data.get("icon", "📊")
    }
    store.sips.append(sip)
    return jsonify({"success": True, "sip": sip})


@app.route('/api/sips/<sip_id>', methods=['DELETE'])
def api_delete_sip(sip_id):
    store.sips = [s for s in store.sips if s["id"] != sip_id]
    return jsonify({"success": True})


@app.route('/api/sips/<sip_id>/toggle', methods=['POST'])
def api_toggle_sip(sip_id):
    for s in store.sips:
        if s["id"] == sip_id:
            s["status"] = "paused" if s["status"] == "active" else "active"
            return jsonify({"success": True, "sip": s})
    return jsonify({"success": False}), 404


@app.route('/api/investments/sip-calculator', methods=['POST'])
def api_sip_calculator():
    """Calculate SIP returns projection."""
    data = request.json
    monthly_amount = float(data.get("monthly_amount", 5000))
    duration_years = int(data.get("duration_years", 10))
    expected_return = float(data.get("expected_return", 12))  # Annual return %
    step_up_pct = float(data.get("step_up_pct", 0))  # Annual increase in SIP amount

    monthly_rate = expected_return / 12 / 100
    total_months = duration_years * 12

    total_invested = 0
    future_value = 0
    yearly_data = []
    current_sip = monthly_amount

    for year in range(1, duration_years + 1):
        for month in range(12):
            total_invested += current_sip
            future_value = (future_value + current_sip) * (1 + monthly_rate)

        yearly_data.append({
            "year": year,
            "invested": round(total_invested),
            "value": round(future_value),
            "wealth_gain": round(future_value - total_invested)
        })

        # Step-up SIP
        if step_up_pct > 0:
            current_sip = current_sip * (1 + step_up_pct / 100)

    return jsonify({
        "success": True,
        "total_invested": round(total_invested),
        "future_value": round(future_value),
        "wealth_gain": round(future_value - total_invested),
        "absolute_return_pct": round((future_value - total_invested) / total_invested * 100, 1) if total_invested > 0 else 0,
        "yearly_data": yearly_data
    })


@app.route('/api/investments/watchlist')
def api_watchlist():
    return jsonify({"watchlist": store.watchlist})


@app.route('/api/investments/watchlist', methods=['POST'])
def api_add_to_watchlist():
    data = request.json
    item = {
        "id": f"watch-{uuid.uuid4().hex[:6]}",
        "name": data["name"],
        "symbol": data.get("symbol", data["name"][:4].upper()),
        "current_price": float(data.get("current_price", 0)),
        "day_change": float(data.get("day_change", 0)),
        "sector": data.get("sector", "Other"),
        "icon": data.get("icon", "📈")
    }
    store.watchlist.append(item)
    return jsonify({"success": True, "item": item})


@app.route('/api/investments/watchlist/<item_id>', methods=['DELETE'])
def api_remove_from_watchlist(item_id):
    store.watchlist = [w for w in store.watchlist if w["id"] != item_id]
    return jsonify({"success": True})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
