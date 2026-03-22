# Zenvest 💎
## Product Requirements Document (PRD)
**"Invest with clarity. Grow with confidence."**
**Version 1.0 | March 2026**

---

## 1. Product Overview

Zenvest is a premium AI-powered personal finance and investment web application. It helps users track budgets, get intelligent investment recommendations, monitor their net worth, and set financial goals — all wrapped in a calm, dark, premium UI that feels like Robinhood meets Zen philosophy.

The app runs on a modern full-stack architecture: HTML/CSS/JS frontend, Python (FastAPI) backend, real ML models, OpenAI API for AI insights, Supabase for auth and database, Paystack for subscriptions, and n8n for automated weekly email reports.

### 1.1 Tagline
> **"Invest with clarity. Grow with confidence."**

### 1.2 Target Users

| User Segment | Characteristics | Primary Goal |
|---|---|---|
| Young Professionals | 20-35, first salary, no financial plan | Track spending, start investing |
| Students | Limited income, need to budget | Save money, learn about investing |
| Freelancers | Irregular income, no employer benefits | Manage cash flow, build emergency fund |
| Side Hustlers | Multiple income streams | Track all income, grow net worth |

---

## 2. Goals & Success Metrics

### 2.1 Business Goals
- Launch a working MVP in 6 weekends
- Acquire first 100 free users within 30 days of launch
- Convert 10% to premium ($7.99/month)
- Generate $799/month recurring revenue from 100 premium users
- Build to 500 premium users = $3,995/month

### 2.2 Success Metrics

| Metric | Target (MVP) | Measurement |
|---|---|---|
| Free signups | 100 in first 30 days | Supabase auth logs |
| Premium conversion | 10% of free users | Paystack dashboard |
| Weekly email open rate | > 40% | n8n execution logs |
| Daily active users | 30% of signups | Supabase analytics |
| AI insight usage | > 60% of users | Feature click tracking |
| Goal completion rate | > 25% | Database query |

---

## 3. Feature Requirements

### 3.1 Free Tier Features

#### Budget & Expense Tracker
- Add income and expenses manually
- Categorize transactions: Food, Transport, Entertainment, Bills, Health, Shopping, Other
- Monthly overview — total in vs total out
- Visual donut chart showing spending by category (Chart.js)
- Last 10 transactions list with category icons
- Edit and delete transactions

#### Investment Recommendations (Limited)
- User fills a quick 5-question risk profile quiz on signup
- Questions: age, monthly income, existing savings, risk tolerance, investment goal
- ML model (Python scikit-learn) analyzes profile
- Returns 3 investment recommendations per month (free tier limit)
- Each recommendation: asset type, risk level, expected return, why it suits the user
- Recommendations refresh monthly

#### Weekly Email Reports (n8n)
- Every Monday at 8AM — automated email sent to all users
- Email contains: weekly spending summary, budget vs actual, one AI tip
- Powered by n8n cloud workflow
- Personalized with user's name and actual data from Supabase

---

### 3.2 Premium Tier Features ($7.99/month)

#### 💎 Net Worth Dashboard
- Single large calm number: **Your Net Worth**
- Calculated as: Total Assets − Total Liabilities
- Assets: savings, investments, crypto, property value
- Liabilities: loans, credit card debt, other debts
- User inputs these values manually (MVP) — auto-sync in v2
- Beautiful animated number that counts up on load
- Net worth history chart — line graph showing growth over time
- Trend indicator: ↑ +$234 this month (green) or ↓ -$50 (red)
- Fits the Zen branding — one number, total clarity

#### 🎯 Goal Progress Tracker
- Create up to 10 financial goals
- Each goal: name, target amount, current amount, deadline, category
- Categories: Emergency Fund, House Deposit, Travel, Education, Retirement, Custom
- Beautiful animated progress bars for each goal
- Percentage complete + amount remaining shown
- Days remaining countdown
- Motivational AI message when goal reaches 25%, 50%, 75%, 100%
- Confetti animation when a goal is completed! 🎉

#### 🤖 Full AI Spending Insights (OpenAI)
- After each week of transactions, OpenAI GPT-4o analyzes spending
- Returns personalized insights like:
  - "You spent 34% more on food this week — try meal prepping"
  - "Your entertainment spending is under budget — great discipline!"
  - "Based on your patterns, you could save an extra $180/month"
- Chat-style interface — user can ask questions about their finances
- Suggested questions: "How can I save more?", "Am I on track for my goals?"

#### 📈 Unlimited Investment Recommendations
- No monthly limit — get recommendations anytime
- More detailed ML analysis using full transaction history
- Stock picks, ETF suggestions, crypto allocation (educational, not financial advice)
- Risk-adjusted portfolio suggestion based on actual spending patterns

#### 📊 Stock & Crypto Tracker
- Add stocks and crypto to a watchlist
- Live prices via free APIs (Alpha Vantage for stocks, CoinGecko for crypto)
- Portfolio value tracker — enter how many shares/coins you hold
- Simple P&L display: bought at X, now worth Y, gain/loss Z
- Price alerts — get email (via n8n) when asset hits target price

#### 📄 PDF Financial Reports
- Generate a beautiful PDF report of any month
- Includes: spending breakdown, net worth, goal progress, AI insights
- Download or email to yourself
- Professional enough to share with a financial advisor

---

## 4. User Flows

### 4.1 Onboarding Flow
```
Landing page
    ↓
Sign up (email + password via Supabase Auth)
    ↓
Risk Profile Quiz (5 questions — 2 minutes)
    ↓
Dashboard loads with empty state
    ↓
Prompt to add first transaction
    ↓
First investment recommendation shown
    ↓
Prompt to upgrade to Premium (after 3 days)
```

### 4.2 Premium Upgrade Flow
```
User hits free tier limit
    ↓
Upgrade prompt with feature list
    ↓
Paystack payment modal
    ↓
Card/bank payment ($7.99/month)
    ↓
Supabase user record updated to premium: true
    ↓
Premium features unlock instantly
    ↓
Welcome email via n8n
```

### 4.3 Weekly Report Flow (n8n)
```
Every Monday 8AM — n8n schedule trigger
    ↓
Fetch all active users from Supabase
    ↓
For each user — fetch their weekly transactions
    ↓
Calculate: total spent, top category, vs last week
    ↓
Generate personalized email content
    ↓
Send via Gmail node
    ↓
Log execution in n8n
```

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Dashboard loads in under 2 seconds
- API responses under 500ms
- Charts render smoothly (60fps)
- Works on 3G mobile connections

### 5.2 Security
- All API calls authenticated with Supabase JWT tokens
- OpenAI API key never exposed to frontend — always called from Python backend
- Paystack webhook verified with signature
- User data encrypted at rest (Supabase handles this)

### 5.3 Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigable
- Screen reader friendly
- Color contrast ratio > 4.5:1

### 5.4 Responsive Design
- Mobile first — works perfectly on 375px width
- Tablet optimized at 768px
- Full desktop experience at 1280px+

---

## 6. Out of Scope (MVP)

- Automatic bank account sync (Plaid integration — v2)
- Real stock trading execution
- Tax calculation features
- Multi-currency support
- Mobile app (iOS/Android)
- Social features (compare with friends)
- Robo-advisor with automated investing

---

## 7. Monetization Strategy

| Revenue Stream | Details | Monthly Potential |
|---|---|---|
| Premium subscriptions | $7.99/month per user | $799 at 100 users |
| Affiliate commissions | Link to brokers (earn 20-30% of their fee) | $200-500 |
| Premium annual plan | $59.99/year (save 37%) | Additional conversions |

**Break-even:** 13 premium users covers basic running costs (domain, APIs)
**Profitable:** From user 14 onwards — pure profit!
