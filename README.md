# 💎 Zenvest — AI-Powered Personal Finance Platform

**Invest with clarity. Grow with confidence.**

Zenvest is a full-stack personal finance and investment platform featuring:
- AI-powered investment recommendations (ML + GPT-4o)
- Budget tracking with visual charts
- Net worth dashboard
- Financial goal tracker
- AI chat advisor ("Zen")
- Premium subscription via Paystack
- Weekly email reports via n8n

---

## 🗂️ Project Structure

```
zenvest/
├── frontend/               # Static HTML/CSS/JS (GitHub Pages)
│   ├── index.html          # Landing page
│   ├── login.html          # Auth page (login + signup)
│   ├── onboarding.html     # Financial profile quiz
│   ├── app.html            # Main dashboard
│   ├── premium.html        # Premium upgrade page
│   └── assets/
│       ├── css/
│       │   ├── style.css        # Design system + tokens
│       │   ├── dashboard.css    # App layout
│       │   ├── components.css   # UI components
│       │   └── responsive.css   # Mobile breakpoints
│       └── js/
│           ├── app.js           # Main orchestrator
│           ├── auth.js          # Supabase auth
│           ├── tracker.js       # Transaction CRUD
│           ├── charts.js        # Chart.js visualizations
│           ├── goals.js         # Goals CRUD
│           ├── networth.js      # Net worth tracker
│           ├── ai.js            # AI chat interface
│           ├── investments.js   # Recommendations
│           ├── premium.js       # Paystack integration
│           └── reports.js       # PDF reports
└── backend/                # Python FastAPI (Railway)
    ├── main.py             # App entry point
    ├── requirements.txt    # Python dependencies
    ├── schema.sql          # Supabase database schema
    ├── .env.example        # Environment variables template
    ├── routes/
    │   ├── auth.py         # Auth & profile endpoints
    │   ├── transactions.py # Transaction CRUD
    │   ├── goals.py        # Goals CRUD
    │   ├── networth.py     # Net worth snapshots
    │   ├── recommendations.py  # ML recommendations
    │   ├── insights.py     # GPT-4o AI chat
    │   ├── reports.py      # PDF generation
    │   └── webhook.py      # Paystack webhook
    ├── ml/
    │   └── recommender.py  # Investment recommendation engine
    └── utils/
        └── deps.py         # Auth, Supabase, shared dependencies
```

---

## 🚀 Quick Start

### Frontend (GitHub Pages)

The frontend is pure static HTML/CSS/JS — no build step needed.

1. Configure your Supabase credentials in `frontend/assets/js/auth.js`:
   ```js
   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   ```

2. Set your API URL in `frontend/assets/js/app.js`:
   ```js
   const API_URL = 'https://zenvest-api.railway.app';
   ```

3. Deploy to GitHub Pages (auto-deploys from `main` branch).

### Backend (Railway / Local Dev)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Run locally
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `/docs`.

---

## 🗄️ Database Setup (Supabase)

1. Create a new Supabase project
2. Go to **SQL Editor** and run `backend/schema.sql`
3. Enable Google OAuth in **Authentication → Providers**
4. Copy your project URL, anon key, service key, and JWT secret to `.env`

---

## ⚙️ Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `SUPABASE_JWT_SECRET` | JWT signing secret from Supabase |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o chat |
| `PAYSTACK_SECRET_KEY` | Paystack secret key |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key |

---

## 💎 Features

### Free Plan
- ✅ Budget & expense tracking
- ✅ Spending donut charts
- ✅ 3 AI investment recommendations
- ✅ Weekly email reports

### Premium ($7.99/month or $59.99/year)
- ⭐ All Free features
- ⭐ Net worth dashboard + history chart
- ⭐ Financial goals tracker (up to 10 goals)
- ⭐ Unlimited AI recommendations
- ⭐ AI chat with Zen (GPT-4o)
- ⭐ Stock & crypto portfolio tracker
- ⭐ Monthly PDF financial reports
- ⭐ Price alerts via email

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JS (ES Modules) |
| Charts | Chart.js 4.x |
| Auth | Supabase Auth (email + Google OAuth) |
| Database | Supabase (PostgreSQL) |
| Backend | Python FastAPI |
| ML | scikit-learn + NumPy |
| AI Chat | OpenAI GPT-4o-mini |
| PDF | ReportLab |
| Payments | Paystack |
| Hosting | GitHub Pages (frontend) + Railway (backend) |
| Automation | n8n (email reports) |

---

## 📄 License

MIT License — © 2026 Zenvest
