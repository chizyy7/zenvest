"""
routes/insights.py — AI spending insights and chat endpoint (GPT-4o)
Premium feature only.
"""

import logging
import os
from typing import List, Dict, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.utils.deps import get_current_user_id, get_supabase, require_premium

logger = logging.getLogger("zenvest.insights")
router = APIRouter()

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# ============================================================
# Schemas
# ============================================================
class ChatMessage(BaseModel):
    role:    str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., max_length=2000)

class ChatRequest(BaseModel):
    message:      str              = Field(..., min_length=1, max_length=1000)
    history:      List[ChatMessage] = Field(default_factory=list)
    transactions: List[Dict]        = Field(default_factory=list)

# ============================================================
# Helpers
# ============================================================
def _build_system_prompt(transactions: list) -> str:
    """Build Zen's system prompt with user financial context."""
    tx_summary = ""
    if transactions:
        # Calculate quick stats from recent transactions
        income   = sum(float(t.get("amount", 0)) for t in transactions if t.get("type") == "income")
        expenses = sum(float(t.get("amount", 0)) for t in transactions if t.get("type") == "expense")
        balance  = income - expenses

        # Category breakdown
        cats: dict = {}
        for t in transactions:
            if t.get("type") == "expense":
                cat = t.get("category", "Other")
                cats[cat] = cats.get(cat, 0) + float(t.get("amount", 0))

        top_cats = sorted(cats.items(), key=lambda x: x[1], reverse=True)[:3]

        tx_summary = f"""
User's recent financial data:
- Income: ${income:,.2f}
- Expenses: ${expenses:,.2f}
- Balance: ${balance:,.2f}
- Top spending categories: {', '.join(f"{c}: ${a:,.2f}" for c, a in top_cats)}
"""

    return f"""You are Zen, an empathetic and knowledgeable AI financial advisor for the Zenvest platform.

Your personality:
- Calm, clear, and encouraging — like a wise friend who knows finance
- Practical: give actionable advice, not just theory
- Brief: 2-4 paragraphs maximum per response
- Use emojis sparingly but meaningfully (1-2 per response)
- Always frame advice positively — about building wealth, not just cutting spending

Your expertise:
- Personal budgeting and cash flow management
- Investment strategy (ETFs, index funds, bonds, crypto allocation)
- Emergency fund and savings goals
- Nigerian and global financial context (the user may be in Nigeria)
- Paystack, Flutterwave, and local payment ecosystem knowledge

{tx_summary}

Important guidelines:
- You are NOT a licensed financial advisor. Always recommend consulting a professional for major decisions.
- Never provide specific stock picks with buy/sell recommendations
- Do not discuss politics, religion, or unrelated topics
- If asked about illegal financial activities, decline politely"""

# ============================================================
# Endpoint
# ============================================================
@router.post("/chat")
async def chat_with_zen(
    payload:  ChatRequest,
    user_id:  str = Depends(require_premium),
    supabase      = Depends(get_supabase),
):
    """
    Chat with Zen AI financial advisor.
    Requires Premium subscription.
    """
    if not OPENAI_API_KEY:
        # Return a rule-based fallback if OpenAI is not configured
        return {
            "response": _rule_based_response(payload.message),
            "model":    "rule-based-fallback"
        }

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)

        # Build message list
        messages = [
            {"role": "system", "content": _build_system_prompt(payload.transactions)}
        ]

        # Add chat history (last 10 messages)
        for msg in payload.history[-10:]:
            role = "assistant" if msg.role == "ai" else "user"
            messages.append({"role": role, "content": msg.content})

        # Add current message
        messages.append({"role": "user", "content": payload.message})

        response = await client.chat.completions.create(
            model="gpt-4o-mini",  # Cost-efficient, great quality
            messages=messages,
            max_tokens=600,
            temperature=0.7,
        )

        ai_text = response.choices[0].message.content.strip()

        # Log chat for analytics (non-blocking)
        try:
            supabase.table("ai_chat_logs").insert({
                "user_id":  user_id,
                "message":  payload.message[:500],
                "response": ai_text[:500],
            }).execute()
        except Exception:
            pass

        return {
            "response": ai_text,
            "model":    "gpt-4o-mini"
        }

    except ImportError:
        return {
            "response": _rule_based_response(payload.message),
            "model":    "rule-based-fallback"
        }
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        return {
            "response": "I'm having a moment — let me gather my thoughts. Please try again in a few seconds. 🧘",
            "model":    "error-fallback"
        }

def _rule_based_response(message: str) -> str:
    """Simple rule-based response when OpenAI is unavailable."""
    lower = message.lower()

    if any(w in lower for w in ["save", "saving", "savings"]):
        return (
            "Great habit to focus on saving! 🌱 A solid starting point:\n\n"
            "• **50/30/20 rule**: 50% needs, 30% wants, 20% savings\n"
            "• Automate transfers to savings the day you get paid\n"
            "• Review subscriptions monthly — cancel what you don't use\n\n"
            "Even ₦5,000–₦10,000/month compounds meaningfully over 5+ years."
        )
    if any(w in lower for w in ["invest", "investment", "portfolio"]):
        return (
            "For most people, index funds are the gold standard. 📈\n\n"
            "A simple portfolio: 60% global equities ETF + 30% bonds + 10% cash reserve. "
            "Rebalance annually. Time in the market consistently beats timing the market."
        )
    if any(w in lower for w in ["budget", "spending", "expense"]):
        return (
            "Track every naira/dollar for 30 days — most people are shocked by what they find. 💰\n\n"
            "Your Zenvest transactions dashboard already does this for you. "
            "Check your spending breakdown chart to identify your #1 leak category."
        )
    if any(w in lower for w in ["goal", "target", "dream"]):
        return (
            "SMART goals work best: Specific, Measurable, Achievable, Relevant, Time-bound. 🎯\n\n"
            "Break your goal into monthly targets. For example: "
            "₦500,000 emergency fund in 12 months = ₦41,667/month. "
            "Use the Goals tracker to stay motivated!"
        )

    return (
        "Great question! As your AI financial advisor, I'm here to help you think clearly about money. 🌱\n\n"
        "Try asking me about: saving strategies, investment basics, "
        "budget optimization, or goal planning.\n\n"
        "What specific financial challenge can I help you tackle today?"
    )
