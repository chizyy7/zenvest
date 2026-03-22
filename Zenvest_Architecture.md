# Zenvest 💎
## System Architecture Document
**Version 1.0 | March 2026**

---

## 1. Architecture Overview

Zenvest uses a modern full-stack architecture split into three layers:

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Browser)                    │
│         HTML + CSS + Vanilla JS — GitHub Pages           │
│                                                          │
│  Dashboard │ Tracker │ Goals │ Net Worth │ AI Chat       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/REST API calls
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 BACKEND (Python FastAPI)                  │
│                  Hosted on Railway                        │
│                                                          │
│  /auth  │ /transactions │ /recommendations │ /insights   │
│  /goals │ /networth     │ /reports         │ /webhook    │
│                                                          │
│         ML Model (scikit-learn)                          │
│         OpenAI API calls                                 │
│         Paystack webhook handler                         │
└──────┬──────────────┬──────────────────┬────────────────┘
       │              │                  │
       ▼              ▼                  ▼
┌──────────┐  ┌──────────────┐  ┌──────────────┐
│ Supabase │  │  OpenAI API  │  │   Paystack   │
│ Database │  │  GPT-4o      │  │  Payments    │
│ Auth     │  └──────────────┘  └──────────────┘
└──────────┘
       │
       ▼
┌──────────────────────────────┐
│         n8n Cloud            │
│  Weekly email automation     │
│  Price alerts                │
│  Goal completion emails      │
└──────────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | HTML, CSS, Vanilla JS | You know it, no build step, GitHub Pages |
| Backend | Python FastAPI | Fast, modern, perfect for ML integration |
| ML Model | scikit-learn | Investment recommendation engine |
| AI Insights | OpenAI GPT-4o API | Natural language financial insights |
| Database | Supabase (PostgreSQL) | Free tier, real-time, built-in auth |
| Auth | Supabase Auth | JWT tokens, email/password, Google OAuth |
| Payments | Paystack | Best for global + African payments |
| Automation | n8n Cloud | Weekly emails, alerts (you already know!) |
| Charts | Chart.js | Beautiful, lightweight, free |
| Hosting (FE) | GitHub Pages | Free, you already use it |
| Hosting (BE) | Railway | Free tier, easy Python deployment |
| Stock Prices | Alpha Vantage API | Free tier for stock data |
| Crypto Prices | CoinGecko API | Free, no API key needed |

---

## 3. Project File Structure

```
zenvest/
├── frontend/                   # GitHub Pages site
│   ├── index.html              # Landing page
│   ├── app.html                # Main dashboard (protected)
│   ├── login.html              # Login / signup page
│   ├── onboarding.html         # Risk profile quiz
│   ├── premium.html            # Upgrade page
│   └── assets/
│       ├── css/
│       │   ├── style.css       # Design tokens, global styles
│       │   ├── dashboard.css   # Dashboard layout
│       │   ├── components.css  # Cards, charts, modals
│       │   └── responsive.css  # Mobile breakpoints
│       ├── js/
│       │   ├── app.js          # Init, routing, auth check
│       │   ├── auth.js         # Supabase login/signup/logout
│       │   ├── tracker.js      # Transaction CRUD
│       │   ├── charts.js       # Chart.js visualizations
│       │   ├── goals.js        # Goal progress tracking
│       │   ├── networth.js     # Net worth dashboard
│       │   ├── ai.js           # AI insights chat interface
│       │   ├── investments.js  # Recommendations display
│       │   ├── premium.js      # Paystack payment integration
│       │   └── reports.js      # PDF generation
│       └── images/
│           └── logo.svg
│
└── backend/                    # Python FastAPI — Railway
    ├── main.py                 # FastAPI app entry point
    ├── requirements.txt        # Python dependencies
    ├── .env                    # Environment variables
    ├── routes/
    │   ├── auth.py             # Auth validation endpoints
    │   ├── transactions.py     # CRUD for transactions
    │   ├── recommendations.py  # ML recommendation engine
    │   ├── insights.py         # OpenAI API integration
    │   ├── goals.py            # Goals CRUD
    │   ├── networth.py         # Net worth calculations
    │   ├── reports.py          # PDF generation
    │   └── webhook.py          # Paystack webhook handler
    ├── ml/
    │   ├── model.py            # scikit-learn model
    │   ├── train.py            # Model training script
    │   └── investment_data.py  # Training data
    └── utils/
        ├── supabase_client.py  # Supabase connection
        └── openai_client.py    # OpenAI connection
```

---

## 4. Database Schema (Supabase)

### users table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_since TIMESTAMP,
  risk_score INTEGER,           -- 1-10 from quiz
  monthly_income DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### transactions table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  type TEXT CHECK (type IN ('income', 'expense')),
  amount DECIMAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### goals table
```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  target_amount DECIMAL NOT NULL,
  current_amount DECIMAL DEFAULT 0,
  deadline DATE,
  category TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### net_worth_snapshots table
```sql
CREATE TABLE net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  total_assets DECIMAL DEFAULT 0,
  total_liabilities DECIMAL DEFAULT 0,
  net_worth DECIMAL GENERATED ALWAYS AS 
    (total_assets - total_liabilities) STORED,
  snapshot_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### recommendations table
```sql
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  asset_type TEXT,              -- Stock, ETF, Crypto, Bond
  asset_name TEXT,
  risk_level TEXT,              -- Low, Medium, High
  expected_return TEXT,         -- "8-12% annually"
  reason TEXT,
  month_year TEXT,              -- "2026-03"
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. ML Investment Recommendation Engine

### How It Works

```python
# ml/model.py

from sklearn.ensemble import RandomForestClassifier
import numpy as np

# Features used for prediction:
# - age_group (0=18-25, 1=26-35, 2=36-45, 3=46+)
# - monthly_income_range (0=<1k, 1=1-3k, 2=3-7k, 3=7k+)
# - existing_savings (0=none, 1=<6months, 2=>6months)
# - risk_tolerance (1-5 scale)
# - investment_goal (0=safety, 1=growth, 2=aggressive)
# - spending_ratio (expenses/income from transaction data)

# Output: recommended portfolio allocation
# [bonds%, index_funds%, stocks%, crypto%]

class ZenvestRecommender:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100)
    
    def predict(self, user_profile):
        features = self.extract_features(user_profile)
        allocation = self.model.predict([features])[0]
        return self.format_recommendations(allocation)
    
    def format_recommendations(self, allocation):
        return [
            {
                "asset": "Index Funds (S&P 500 ETF)",
                "allocation": f"{allocation[1]}%",
                "risk": "Low-Medium",
                "expected_return": "8-12% annually",
                "why": "Diversified, proven long-term growth"
            },
            # ... more recommendations
        ]
```

### Training Data
The model is trained on synthetic financial profiles mapped to optimal portfolio allocations based on Modern Portfolio Theory. In v2, real market performance data is used.

---

## 6. OpenAI Integration

```python
# routes/insights.py

from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def get_spending_insights(user_id: str, transactions: list):
    
    # Summarize transactions for the prompt
    summary = summarize_transactions(transactions)
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": """You are Zen, a calm and insightful 
                financial advisor. Give short, clear, actionable 
                insights about the user's spending. Be encouraging, 
                never judgmental. Keep responses under 100 words."""
            },
            {
                "role": "user", 
                "content": f"Here is my spending this week: {summary}. 
                What insights do you have for me?"
            }
        ],
        max_tokens=200
    )
    
    return response.choices[0].message.content
```

---

## 7. Paystack Integration

### Frontend (premium.js)
```javascript
// Initialize Paystack payment
function initializePayment(userEmail) {
  const handler = PaystackPop.setup({
    key: 'pk_live_YOUR_PUBLIC_KEY',
    email: userEmail,
    amount: 799 * 100,  // $7.99 in cents
    currency: 'USD',
    ref: `zenvest_${Date.now()}`,
    callback: function(response) {
      // Verify payment on backend
      verifyPayment(response.reference);
    },
    onClose: function() {
      console.log('Payment window closed');
    }
  });
  handler.openIframe();
}

async function verifyPayment(reference) {
  const res = await fetch(`${API_URL}/webhook/verify`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({ reference })
  });
  
  if (res.ok) {
    // Update UI to show premium features
    unlockPremiumFeatures();
  }
}
```

### Backend (webhook.py)
```python
@app.post("/webhook/verify")
async def verify_payment(reference: str, user_id: str):
    # Verify with Paystack API
    response = requests.get(
        f"https://api.paystack.co/transaction/verify/{reference}",
        headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"}
    )
    
    if response.json()["data"]["status"] == "success":
        # Update user to premium in Supabase
        supabase.table("users").update({
            "is_premium": True,
            "premium_since": datetime.now().isoformat()
        }).eq("id", user_id).execute()
        
        return {"success": True}
```

---

## 8. n8n Automation Workflows

### Workflow 1: Weekly Financial Report

```
Schedule Trigger (Every Monday 8AM)
        ↓
Supabase Node — Get all active users
        ↓
Loop over each user
        ↓
Supabase Node — Get user's weekly transactions
        ↓
Function Node — Calculate weekly summary
        ↓
OpenAI Node — Generate personalized tip
        ↓
Gmail Node — Send personalized report email
        ↓
Wait 1 second (rate limiting)
        ↓
Next user...
```

### Workflow 2: Goal Completion Alert

```
Supabase Trigger — On goal updated
        ↓
IF current_amount >= target_amount
        ↓
Gmail Node — Send congratulations email
Subject: "🎉 You hit your goal! [Goal Name]"
        ↓
Supabase Node — Mark goal as completed
```

### Workflow 3: Price Alert (Premium)

```
Schedule Trigger (Every hour)
        ↓
HTTP Request — CoinGecko/Alpha Vantage prices
        ↓
Supabase Node — Get user price alerts
        ↓
IF current price >= alert price
        ↓
Gmail Node — Send price alert email
```

---

## 9. API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /auth/validate | JWT | Validate Supabase token |
| GET | /transactions | JWT | Get user transactions |
| POST | /transactions | JWT | Add transaction |
| PUT | /transactions/:id | JWT | Update transaction |
| DELETE | /transactions/:id | JWT | Delete transaction |
| GET | /recommendations | JWT | Get ML recommendations |
| POST | /insights | JWT + Premium | Get AI insights |
| GET | /goals | JWT + Premium | Get user goals |
| POST | /goals | JWT + Premium | Create goal |
| PUT | /goals/:id | JWT + Premium | Update goal progress |
| GET | /networth | JWT + Premium | Get net worth history |
| POST | /networth | JWT + Premium | Add net worth snapshot |
| POST | /reports/pdf | JWT + Premium | Generate PDF report |
| POST | /webhook/verify | JWT | Verify Paystack payment |

---

## 10. Deployment

### Frontend — GitHub Pages
```
Repository: chizyy7/zenvest
Branch: main
URL: chizyy7.github.io/zenvest
```

### Backend — Railway
```bash
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
```

### Environment Variables (Railway)
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
OPENAI_API_KEY=your_openai_key
PAYSTACK_SECRET_KEY=your_paystack_secret
N8N_WEBHOOK_URL=your_n8n_webhook_url
```

---

## 11. Weekend Build Plan

| Weekend | Focus | Deliverable |
|---|---|---|
| 1 | Frontend UI + Landing page | Beautiful dark dashboard shell |
| 2 | Supabase auth + transaction tracker | Working login + add transactions |
| 3 | Charts + Python backend setup | Visual spending breakdown |
| 4 | ML model + recommendations | AI investment suggestions |
| 5 | Premium features (net worth + goals) | Paystack integration |
| 6 | OpenAI insights + n8n emails | Full automation live |
