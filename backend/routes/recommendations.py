"""
routes/recommendations.py — Investment recommendation endpoints
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.utils.deps import get_current_user_id, get_supabase, get_current_user
from backend.ml.recommender import get_recommendations

logger = logging.getLogger("zenvest.recommendations")
router = APIRouter()

# ============================================================
# Schemas
# ============================================================
class ProfilePayload(BaseModel):
    age_group:       int = Field(default=1, ge=0, le=3)
    income_range:    int = Field(default=1, ge=0, le=3)
    savings_level:   int = Field(default=1, ge=0, le=2)
    risk_tolerance:  int = Field(default=3, ge=1, le=5)
    investment_goal: int = Field(default=1, ge=0, le=2)

# ============================================================
# Endpoints
# ============================================================
@router.get("")
async def list_recommendations(
    user_id:  str = Depends(get_current_user_id),
    supabase      = Depends(get_supabase),
):
    """
    Get investment recommendations for the authenticated user.
    Uses stored profile or defaults to balanced (risk_tolerance=3).
    """
    # Fetch user's stored profile
    resp = (
        supabase.table("user_profiles")
        .select("*")
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    profile = resp.data or {}

    # Check premium status for limit
    user_resp = (
        supabase.table("users")
        .select("is_premium")
        .eq("id", user_id)
        .single()
        .execute()
    )
    is_premium = user_resp.data and user_resp.data.get("is_premium", False)
    limit      = 8 if is_premium else 3

    recs = get_recommendations(profile, limit=limit)
    return recs

@router.post("")
async def generate_recommendations(
    payload:  ProfilePayload,
    user_id:  str = Depends(get_current_user_id),
    supabase      = Depends(get_supabase),
):
    """
    Generate fresh recommendations from a user profile payload.
    Also saves/updates the user profile in the database.
    """
    profile_data = payload.model_dump()

    # Upsert user profile
    supabase.table("user_profiles").upsert({
        "user_id":        user_id,
        **profile_data,
    }).execute()

    # Check premium status
    user_resp = (
        supabase.table("users")
        .select("is_premium")
        .eq("id", user_id)
        .single()
        .execute()
    )
    is_premium = user_resp.data and user_resp.data.get("is_premium", False)
    limit      = 8 if is_premium else 3

    recs = get_recommendations(profile_data, limit=limit)
    return {"recommendations": recs, "profile": profile_data}
