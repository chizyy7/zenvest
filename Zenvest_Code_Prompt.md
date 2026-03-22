# Zenvest 💎
## GitHub Copilot Build Prompt
**"Invest with clarity. Grow with confidence."**
**Version 1.0 | March 2026**

---

## Global Rules

- Frontend: Pure HTML, CSS, Vanilla JS — no frameworks, no npm, no build step
- Backend: Python FastAPI — clean, well commented, production ready
- All JS uses ES Modules (type="module")
- CSS uses custom properties (variables) for everything
- Every function has a JSDoc or docstring comment
- No placeholder content — everything must be real and complete
- Commit all frontend files to main branch of chizyy7/zenvest repo

---

## PHASE 1: Project Scaffold

Create this exact folder structure:

```
zenvest/
├── frontend/
│   ├── index.html
│   ├── app.html
│   ├── login.html
│   ├── onboarding.html
│   ├── premium.html
│   └── assets/
│       ├── css/
│       │   ├── style.css
│       │   ├── dashboard.css
│       │   ├── components.css
│       │   └── responsive.css
│       ├── js/
│       │   ├── app.js
│       │   ├── auth.js
│       │   ├── tracker.js
│       │   ├── charts.js
│       │   ├── goals.js
│       │   ├── networth.js
│       │   ├── ai.js
│       │   ├── investments.js
│       │   ├── premium.js
│       │   └── reports.js
│       └── images/
└── backend/
    ├── main.py
    ├── requirements.txt
    ├── .env.example
    ├── routes/
    │   ├── __init__.py
    │   ├── transactions.py
    │   ├── recommendations.py
    │   ├── insights.py
    │   ├── goals.py
    │   ├── networth.py
    │   └── webhook.py
    ├── ml/
    │   ├── __init__.py
    │   ├── model.py
    │   └── train.py
    └── utils/
        ├── __init__.py
        ├── supabase_client.py
        └── openai_client.py
```

---

## PHASE 2: Design System (style.css)

Generate the complete CSS design system:

```css
:root {
  /* Backgrounds */
  --bg-primary:    #080B14;
  --bg-surface:    #0D1117;
  --bg-card:       #111827;
  --bg-card-hover: #1A2332;
  --bg-input:      #161D2B;

  /* Brand Colors */
  --color-zen:     #7FFFD4;    /* Aquamarine — calm, money */
  --color-zen-dim: rgba(127, 255, 212, 0.1);
  --color-gold:    #F5C842;    /* Wealth, premium */
  --color-profit:  #00D98B;    /* Green — gains */
  --color-loss:    #FF4D6D;    /* Red — losses */
  --color-purple:  #8B5CF6;    /* Premium indicator */

  /* Text */
  --text-primary:  #F0F4F8;
  --text-secondary:#8896A7;
  --text-muted:    #4B5563;

  /* Borders */
  --border:        rgba(255,255,255,0.06);
  --border-zen:    rgba(127, 255, 212, 0.2);

  /* Shadows */
  --shadow-card:   0 4px 24px rgba(0,0,0,0.4);
  --shadow-zen:    0 0 30px rgba(127,255,212,0.1);
  --shadow-gold:   0 0 30px rgba(245,200,66,0.15);

  /* Spacing */
  --radius-sm:  8px;
  --radius-md:  14px;
  --radius-lg:  20px;
  --radius-xl:  28px;

  /* Typography */
  --font-sans:    'Inter', system-ui, sans-serif;
  --font-display: 'Syne', 'Inter', sans-serif;

  /* Transitions */
  --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

Import from Google Fonts:
- Inter (400, 500, 600, 700)
- Syne (700, 800)

Write global styles for:
- Body reset, box-sizing, scrollbar styling (dark, thin)
- Button variants: .btn-zen (aquamarine), .btn-gold (gold), .btn-ghost (transparent)
- Input styles: dark background, zen border on focus
- Card base: .card class with bg-card, border, border-radius, shadow
- Loading skeleton shimmer animation
- Toast notification system (success/error/info)
- Badge styles: .badge-free, .badge-premium (purple glow)

---

## PHASE 3: Landing Page (index.html)

Generate a stunning, complete landing page.

### Hero Section
- Full viewport height
- Background: radial gradient from --bg-primary with subtle grid lines
- Floating animated orbs: 4 blurred circles, aquamarine and purple, CSS animation
- Navigation: Zenvest logo left, "Login" and "Get Started Free" buttons right
- Hero headline (font: Syne, huge):
  Line 1: "Invest with"
  Line 2: "clarity." (aquamarine gradient text)
  Line 3: "Grow with confidence."
- Subheadline: "AI-powered budgeting, smart investment recommendations, and weekly financial insights — all in one calm dashboard."
- Two CTA buttons: "Start Free" and "See How It Works"
- Below buttons: "No credit card required · Free forever plan · Premium from $7.99/month"
- Hero visual: a mockup of the dashboard — CSS-generated dark card with fake chart lines and numbers

### Features Section
Three feature cards in a row:

Card 1: 💰 Budget Tracker
"Track every dollar. See exactly where your money goes with beautiful visual breakdowns."

Card 2: 🤖 AI Investment Recommendations  
"Our ML model analyzes your financial profile and suggests the perfect portfolio allocation for your goals."

Card 3: 📈 Net Worth Dashboard (Premium)
"One calm number. Your complete financial picture at a glance. Watch it grow month by month."

### Pricing Section
Two pricing cards side by side:

FREE card:
- Price: $0/month
- Features: Budget tracking, 3 AI recommendations/month, Weekly email reports, Basic charts
- CTA: "Start Free"

PREMIUM card (highlighted with zen glow):
- Price: $7.99/month or $59.99/year
- Badge: "MOST POPULAR"
- Features: Everything in Free, Net Worth Dashboard, Goal Progress Tracking, Unlimited AI Recommendations, Stock & Crypto Tracker, OpenAI Chat Insights, PDF Financial Reports
- CTA: "Go Premium"

### How It Works Section
4 steps with icons and numbers:
1. Sign up free in 30 seconds
2. Complete your financial profile quiz
3. Add your income and expenses
4. Get personalized AI insights and investment recommendations

### Footer
Dark, minimal. Logo + tagline + links + copyright

---

## PHASE 4: Auth Pages

### login.html
- Split layout: left side dark with Zenvest branding, right side login form
- Form fields: Email, Password
- Buttons: "Sign In" (primary), "Sign up" (link)
- Google Sign In button (uses Supabase OAuth)
- "Forgot password?" link
- On successful login: redirect to app.html

### onboarding.html
- Full screen step-by-step quiz
- Progress bar at top (5 steps)
- One question per screen with smooth transitions

Step 1: "What's your age range?"
Options: 18-25 | 26-35 | 36-45 | 46+

Step 2: "What's your monthly income?"
Options: Under $1,000 | $1,000-$3,000 | $3,000-$7,000 | $7,000+

Step 3: "How much savings do you have?"
Options: None yet | Less than 6 months expenses | More than 6 months expenses

Step 4: "What's your risk tolerance?"
Slider from 1 (Very Safe) to 5 (High Risk) with emoji indicators 🛡️ → 🚀

Step 5: "What's your main investment goal?"
Options: Capital Safety | Steady Growth | Aggressive Growth

On completion: POST to backend /recommendations, redirect to app.html

---

## PHASE 5: Main Dashboard (app.html)

The dashboard is a single page app with sidebar navigation.

### Layout
- Fixed sidebar (240px) on left
- Main content area (flex-1) on right
- Mobile: sidebar becomes bottom tab bar

### Sidebar
- Zenvest logo at top
- Navigation links with icons:
  - 📊 Dashboard (home)
  - 💸 Transactions
  - 🤖 AI Insights (premium badge)
  - 🎯 Goals (premium badge)
  - 💎 Net Worth (premium badge)
  - 📈 Investments
  - ⚙️ Settings
- User avatar and name at bottom
- "Upgrade to Premium" CTA if user is free

### Dashboard Home View
Show these sections:

1. WELCOME HEADER
"Good morning, Chizy 👋" (personalized)
Subtext: "Here's your financial snapshot"

2. STATS ROW (4 cards)
- Total Balance this month
- Total Income this month (green)
- Total Expenses this month (red)
- Savings Rate % (zen color)

3. SPENDING CHART
Donut chart (Chart.js) showing spending by category
Categories with colors:
- Food & Drink: #FF6B6B
- Transport: #4ECDC4
- Entertainment: #45B7D1
- Bills: #96CEB4
- Health: #FFEAA7
- Shopping: #DDA0DD
- Other: #98D8C8

4. RECENT TRANSACTIONS
Last 5 transactions as a clean list
Each row: category icon | description | date | amount (green/red)
"View all transactions" link

5. INVESTMENT RECOMMENDATION CARD
One featured recommendation from the ML model
Asset name, risk level, expected return, brief reason
"See all recommendations" button

### Transactions View
- Filter bar: All | Income | Expense, date range, category
- "Add Transaction" button (opens modal)
- Transactions list grouped by date
- Each transaction: icon, name, category, amount, actions (edit/delete)

Add Transaction Modal:
- Type: Income / Expense toggle
- Amount input
- Category dropdown
- Description input
- Date picker
- "Save Transaction" button

### AI Insights View (Premium)
- Chat interface style
- Message bubbles showing AI insights
- Input at bottom: "Ask Zen anything about your finances..."
- Suggested questions as chips:
  "How can I save more?" | "Am I on track?" | "Best investment for me?" | "Analyze my spending"
- Lock overlay for free users with upgrade prompt

### Goals View (Premium)
- "Add Goal" button top right
- Goals grid: 2 columns
- Each goal card:
  - Goal name and category icon
  - Large progress bar (animated, zen color)
  - "45% complete" text
  - Current amount / Target amount
  - Days remaining
  - Quick add amount button
- Completion celebration animation (CSS confetti)
- Lock overlay for free users

### Net Worth View (Premium)
- Huge centered number: "$12,450.00"
- Trend: "↑ +$234 this month" (green)
- Line chart showing net worth history (Chart.js)
- Two sections below:
  - Assets breakdown (savings, investments, property)
  - Liabilities breakdown (loans, credit cards)
- "Update Net Worth" button
- Lock overlay for free users

### Investments View
- Risk profile summary card (from onboarding)
- Recommendations grid
- Each card: asset name, type, risk badge, expected return, "Learn More" link
- "Refresh Recommendations" button
- Free users see 3, premium users see unlimited

---

## PHASE 6: Python Backend (FastAPI)

### main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import transactions, recommendations, insights, goals, networth, webhook

app = FastAPI(title="Zenvest API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://chizyy7.github.io", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router, prefix="/transactions")
app.include_router(recommendations.router, prefix="/recommendations")
app.include_router(insights.router, prefix="/insights")
app.include_router(goals.router, prefix="/goals")
app.include_router(networth.router, prefix="/networth")
app.include_router(webhook.router, prefix="/webhook")

@app.get("/health")
async def health():
    return {"status": "Zenvest API is running 🚀"}
```

### requirements.txt
```
fastapi==0.109.0
uvicorn==0.27.0
supabase==2.3.0
openai==1.10.0
scikit-learn==1.4.0
numpy==1.26.3
pandas==2.1.4
python-dotenv==1.0.0
requests==2.31.0
reportlab==4.0.9
python-multipart==0.0.6
```

### ML Model (ml/model.py)
Build a RandomForestClassifier that:
- Takes user profile features as input:
  - age_group (0-3)
  - income_range (0-3)
  - savings_level (0-2)
  - risk_tolerance (1-5)
  - investment_goal (0-2)
  - spending_ratio (calculated from transactions)
- Outputs portfolio allocation recommendations
- Returns top 3 investment options with:
  - asset_type
  - asset_name
  - allocation_percentage
  - risk_level
  - expected_return
  - reasoning

Generate 200 synthetic training samples covering all profile combinations.
Train the model on startup and cache it in memory.

### routes/insights.py
OpenAI integration:
- System prompt: Zen financial advisor, calm, encouraging, concise
- Takes user's weekly transaction summary
- Returns 3 bullet point insights
- Maximum 150 words per response
- Also handles chat messages from the AI chat interface

### routes/webhook.py
Paystack payment verification:
- Verify payment reference with Paystack API
- Update user is_premium = true in Supabase
- Return success/failure

---

## PHASE 7: n8n Automation (instructions only — implement in n8n.cloud)

### Workflow 1: Weekly Report Email
Trigger: Schedule — Every Monday 8:00 AM UTC

Nodes:
1. Schedule Trigger
2. Supabase — Get all users where created_at is not null
3. Loop Over Items
4. Supabase — Get transactions for user (last 7 days)
5. Code Node — Calculate: total_spent, top_category, vs_last_week
6. HTTP Request — POST to /insights for one AI tip
7. Gmail — Send weekly report email with template:

Subject: "Your Zenvest Weekly Report 📊"
Body (HTML):
```
Hi {{ name }},

Here's your weekly financial snapshot:

💰 Total Spent: ${{ total_spent }}
📊 Top Category: {{ top_category }}
📈 vs Last Week: {{ trend }}

🤖 Zen's Tip: {{ ai_tip }}

Keep growing! 🌱
The Zenvest Team
```

### Workflow 2: Goal Achievement
Trigger: Supabase — On goals table update
Condition: current_amount >= target_amount
Action: Gmail — Send congratulations email with confetti emoji

### Workflow 3: Premium Welcome
Trigger: Supabase — On users table update (is_premium = true)
Action: Gmail — Send premium welcome email with feature list

---

## PHASE 8: Validation Checklist

| # | Check | How to Test |
|---|---|---|
| 1 | Landing page loads fast | Chrome Lighthouse > 90 |
| 2 | Sign up creates Supabase user | Check Supabase dashboard |
| 3 | Login redirects to dashboard | Sign in and check redirect |
| 4 | Add transaction saves to DB | Add transaction, refresh page |
| 5 | Chart updates with new transaction | Add expense, check donut chart |
| 6 | ML recommendations return data | Check /recommendations endpoint |
| 7 | Premium lock works for free users | Try accessing premium feature |
| 8 | Paystack payment completes | Use test card |
| 9 | Premium unlocks after payment | Check user record in Supabase |
| 10 | n8n sends weekly email | Trigger workflow manually |
| 11 | Mobile layout at 375px | Chrome DevTools device mode |
| 12 | API has CORS headers | Test from GitHub Pages domain |

---

## PHASE 9: README.md

Generate complete README with:
- # 💎 Zenvest — AI-Powered Personal Finance
- Badges: Live Demo, Python, FastAPI, Supabase
- One paragraph description
- Screenshot placeholder
- Features list (free vs premium)
- Tech stack table
- Local development setup
- Backend deployment (Railway)
- Frontend deployment (GitHub Pages)
- Environment variables reference
- Contributing guide
- License

---

## Generate Files In This Order:

1. frontend/assets/css/style.css
2. frontend/assets/css/dashboard.css
3. frontend/assets/css/components.css
4. frontend/assets/css/responsive.css
5. frontend/index.html
6. frontend/login.html
7. frontend/onboarding.html
8. frontend/app.html
9. frontend/premium.html
10. frontend/assets/js/auth.js
11. frontend/assets/js/tracker.js
12. frontend/assets/js/charts.js
13. frontend/assets/js/goals.js
14. frontend/assets/js/networth.js
15. frontend/assets/js/ai.js
16. frontend/assets/js/investments.js
17. frontend/assets/js/premium.js
18. frontend/assets/js/app.js
19. backend/main.py
20. backend/requirements.txt
21. backend/ml/model.py
22. backend/routes/transactions.py
23. backend/routes/recommendations.py
24. backend/routes/insights.py
25. backend/routes/goals.py
26. backend/routes/networth.py
27. backend/routes/webhook.py
28. backend/utils/supabase_client.py
29. backend/utils/openai_client.py
30. README.md

Generate each file fully and completely.
No placeholders. No "add your code here" comments.
Every file must be production-ready.
