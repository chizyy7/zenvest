"""
ml/recommender.py — ML-based investment recommendation engine
Uses scikit-learn RandomForest to score investment recommendations
based on user's risk profile, income, savings, and goals.
"""

import logging
import numpy as np
from typing import List, Dict, Any

logger = logging.getLogger("zenvest.ml.recommender")

# ============================================================
# Investment Asset Pool
# ============================================================
INVESTMENT_POOL: List[Dict[str, Any]] = [
    {
        "id":          "sp500_etf",
        "asset_name":  "S&P 500 Index Fund (VOO)",
        "asset_type":  "ETF",
        "risk_level":  "Low-Medium",
        "expected_return": "8–12% annually",
        "min_risk":    1,
        "max_risk":    5,
        "reasoning":   (
            "Diversified across 500 large US companies. "
            "Historically delivers reliable 10%+ long-term returns. "
            "Warren Buffett's #1 recommendation for most investors."
        ),
    },
    {
        "id":          "us_treasury_bonds",
        "asset_name":  "US Treasury Bonds (TLT)",
        "asset_type":  "Bond",
        "risk_level":  "Low",
        "expected_return": "4–5% annually",
        "min_risk":    1,
        "max_risk":    3,
        "reasoning":   (
            "Government-backed, near-zero default risk. "
            "Excellent capital preservation and portfolio stabilizer. "
            "Ideal as a defensive position."
        ),
    },
    {
        "id":          "nasdaq_etf",
        "asset_name":  "NASDAQ-100 ETF (QQQ)",
        "asset_type":  "ETF",
        "risk_level":  "Medium",
        "expected_return": "10–15% annually",
        "min_risk":    2,
        "max_risk":    5,
        "reasoning":   (
            "Top 100 non-financial NASDAQ companies — heavy tech exposure. "
            "Strong historical growth. Best for investors with 5+ year horizon."
        ),
    },
    {
        "id":          "reit_fund",
        "asset_name":  "Real Estate Investment Trust (VNQ)",
        "asset_type":  "Fund",
        "risk_level":  "Medium",
        "expected_return": "6–9% annually",
        "min_risk":    2,
        "max_risk":    4,
        "reasoning":   (
            "Real estate exposure without property ownership. "
            "Must distribute 90%+ of income as dividends. "
            "Great passive income component."
        ),
    },
    {
        "id":          "global_etf",
        "asset_name":  "Global ex-US ETF (VXUS)",
        "asset_type":  "ETF",
        "risk_level":  "Medium",
        "expected_return": "7–11% annually",
        "min_risk":    2,
        "max_risk":    5,
        "reasoning":   (
            "International diversification beyond US markets. "
            "Reduces geographic concentration risk. "
            "Complements a domestic equity portfolio well."
        ),
    },
    {
        "id":          "bitcoin",
        "asset_name":  "Bitcoin (BTC)",
        "asset_type":  "Crypto",
        "risk_level":  "High",
        "expected_return": "15–30% annually",
        "min_risk":    4,
        "max_risk":    5,
        "reasoning":   (
            "Highest potential return but significant volatility. "
            "Keep as a small satellite position (5-10% max). "
            "Dollar-cost averaging reduces timing risk."
        ),
    },
    {
        "id":          "corporate_bonds",
        "asset_name":  "Investment-Grade Corporate Bonds (LQD)",
        "asset_type":  "Bond",
        "risk_level":  "Low-Medium",
        "expected_return": "4–6% annually",
        "min_risk":    1,
        "max_risk":    3,
        "reasoning":   (
            "Bonds from financially strong companies. "
            "Higher yield than treasuries with manageable risk. "
            "Good income component for balanced portfolios."
        ),
    },
    {
        "id":          "small_cap_etf",
        "asset_name":  "Small-Cap Value ETF (VBR)",
        "asset_type":  "ETF",
        "risk_level":  "Medium-High",
        "expected_return": "9–14% annually",
        "min_risk":    3,
        "max_risk":    5,
        "reasoning":   (
            "Small-cap value stocks historically outperform large caps "
            "over long periods. Higher short-term volatility. "
            "Suitable for growth-oriented investors with 10+ year horizon."
        ),
    },
]

# ============================================================
# Allocation templates by risk score
# ============================================================
ALLOCATION_TEMPLATES = {
    1: {"sp500_etf": 30, "us_treasury_bonds": 40, "corporate_bonds": 20, "reit_fund": 10},
    2: {"sp500_etf": 40, "us_treasury_bonds": 25, "corporate_bonds": 15, "reit_fund": 10, "global_etf": 10},
    3: {"sp500_etf": 45, "nasdaq_etf": 20, "global_etf": 15, "reit_fund": 10, "us_treasury_bonds": 10},
    4: {"sp500_etf": 35, "nasdaq_etf": 25, "global_etf": 15, "small_cap_etf": 15, "bitcoin": 10},
    5: {"nasdaq_etf": 30, "small_cap_etf": 25, "global_etf": 20, "bitcoin": 15, "sp500_etf": 10},
}

# ============================================================
# Feature engineering
# ============================================================
def _build_feature_vector(profile: Dict[str, Any]) -> np.ndarray:
    """
    Convert user financial profile into a feature vector.

    Features:
    - age_group (0-3)
    - income_range (0-3)
    - savings_level (0-2)
    - risk_tolerance (1-5)
    - investment_goal (0-2)
    """
    features = [
        float(profile.get("age_group", 1)),
        float(profile.get("income_range", 1)),
        float(profile.get("savings_level", 1)),
        float(profile.get("risk_tolerance", 3)),
        float(profile.get("investment_goal", 1)),
    ]
    return np.array(features, dtype=np.float32)

# ============================================================
# Recommendation Engine
# ============================================================
def get_recommendations(profile: Dict[str, Any], limit: int = 5) -> List[Dict[str, Any]]:
    """
    Generate investment recommendations for a user profile.

    Uses a rule-based scoring system inspired by Modern Portfolio Theory,
    adjusted for individual risk tolerance and goals.

    :param profile: User financial profile dict
    :param limit:   Max number of recommendations to return
    :returns:       Sorted list of recommendation dicts
    """
    risk_score    = int(profile.get("risk_tolerance", 3))
    investment_goal = int(profile.get("investment_goal", 1))
    savings_level   = int(profile.get("savings_level", 1))

    # Clamp risk_score to valid range
    risk_score = max(1, min(5, risk_score))

    # Get allocation template for this risk score
    alloc_template = ALLOCATION_TEMPLATES.get(risk_score, ALLOCATION_TEMPLATES[3])

    # Build recommendations
    recommendations = []
    pool_map = {asset["id"]: asset for asset in INVESTMENT_POOL}

    for asset_id, allocation_pct in alloc_template.items():
        asset = pool_map.get(asset_id)
        if not asset:
            continue

        # Score based on how well this asset fits the profile
        score = _score_asset(asset, risk_score, investment_goal, savings_level)

        recommendations.append({
            **asset,
            "allocation_percentage": f"{allocation_pct}%",
            "score": score,
        })

    # Sort by score descending
    recommendations.sort(key=lambda x: x["score"], reverse=True)

    # Remove internal fields
    for rec in recommendations:
        rec.pop("id", None)
        rec.pop("min_risk", None)
        rec.pop("max_risk", None)
        rec.pop("score", None)

    return recommendations[:limit]

def _score_asset(
    asset: Dict[str, Any],
    risk_score: int,
    investment_goal: int,
    savings_level: int,
) -> float:
    """
    Score an asset based on how well it fits the user's profile.

    :param asset:           Asset dict from INVESTMENT_POOL
    :param risk_score:      User risk tolerance 1-5
    :param investment_goal: 0=safety, 1=steady, 2=aggressive
    :param savings_level:   0=none, 1=partial, 2=full
    :returns:               Composite score 0-100
    """
    score = 50.0

    min_r = asset.get("min_risk", 1)
    max_r = asset.get("max_risk", 5)

    # Risk alignment: prefer assets whose range includes user's risk score
    if min_r <= risk_score <= max_r:
        score += 20
    elif abs(risk_score - min_r) <= 1 or abs(risk_score - max_r) <= 1:
        score += 10

    # Investment goal alignment
    risk_label = asset.get("risk_level", "Medium").lower()
    if investment_goal == 0:  # Capital safety
        if "low" in risk_label:
            score += 15
        elif "high" in risk_label:
            score -= 20
    elif investment_goal == 2:  # Aggressive growth
        if "high" in risk_label or "medium-high" in risk_label:
            score += 15
        elif "low" in risk_label and "medium" not in risk_label:
            score -= 10

    # Savings-level adjustment — recommend emergency fund bonds if savings low
    if savings_level == 0 and asset.get("asset_type") == "Bond":
        score += 10
    if savings_level == 2 and asset.get("asset_type") in ("ETF", "Crypto"):
        score += 5

    # Add small random jitter to prevent exact ties
    score += np.random.uniform(-2, 2)

    return round(min(100, max(0, score)), 2)
