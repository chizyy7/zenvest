"""
routes/goals.py — Financial goals CRUD endpoints
"""

import logging
from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, field_validator

from backend.utils.deps import get_current_user_id, get_supabase, not_found, bad_request

logger = logging.getLogger("zenvest.goals")
router = APIRouter()

# ============================================================
# Schemas
# ============================================================
VALID_CATEGORIES = {
    "Emergency Fund", "House Deposit", "Travel",
    "Education", "Retirement", "Custom"
}

class GoalCreate(BaseModel):
    name:           str   = Field(..., min_length=1, max_length=100)
    category:       str   = "Custom"
    target_amount:  float = Field(..., gt=0)
    current_amount: float = Field(default=0, ge=0)
    deadline:       Optional[str] = None

    @field_validator("deadline", mode="before")
    @classmethod
    def validate_deadline(cls, v):
        if v and v != "":
            try:
                date.fromisoformat(v)
            except ValueError:
                raise ValueError("deadline must be in YYYY-MM-DD format")
        return v or None

class GoalUpdate(BaseModel):
    name:           Optional[str]   = Field(default=None, max_length=100)
    category:       Optional[str]   = None
    target_amount:  Optional[float] = Field(default=None, gt=0)
    current_amount: Optional[float] = Field(default=None, ge=0)
    deadline:       Optional[str]   = None
    is_completed:   Optional[bool]  = None

# ============================================================
# Endpoints
# ============================================================
@router.get("")
async def list_goals(
    user_id:  str = Depends(get_current_user_id),
    supabase      = Depends(get_supabase),
):
    """List all financial goals for the authenticated user."""
    resp = (
        supabase.table("goals")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []

@router.post("", status_code=201)
async def create_goal(
    payload: GoalCreate,
    user_id: str = Depends(get_current_user_id),
    supabase     = Depends(get_supabase),
):
    """Create a new financial goal (max 10 for free, unlimited for premium)."""
    # Count existing goals
    existing = (
        supabase.table("goals")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    goal_count = existing.count or 0

    # Check premium for >3 goals
    if goal_count >= 3:
        user_resp = (
            supabase.table("users")
            .select("is_premium")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if not user_resp.data or not user_resp.data.get("is_premium"):
            from utils.deps import forbidden
            forbidden("Free plan allows up to 3 goals. Upgrade for unlimited goals.")

    is_completed = payload.current_amount >= payload.target_amount

    resp = supabase.table("goals").insert({
        "user_id":        user_id,
        "name":           payload.name,
        "category":       payload.category,
        "target_amount":  round(float(payload.target_amount), 2),
        "current_amount": round(float(payload.current_amount), 2),
        "deadline":       payload.deadline,
        "is_completed":   is_completed,
    }).execute()

    if not resp.data:
        bad_request("Failed to create goal")

    return resp.data[0]

@router.put("/{goal_id}")
async def update_goal(
    goal_id: str,
    payload: GoalUpdate,
    user_id: str = Depends(get_current_user_id),
    supabase     = Depends(get_supabase),
):
    """Update a goal owned by the current user."""
    existing = (
        supabase.table("goals")
        .select("*")
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not existing.data:
        not_found("Goal not found")

    update_data = payload.model_dump(exclude_none=True)

    # Auto-complete if current >= target
    current = update_data.get("current_amount", existing.data["current_amount"])
    target  = update_data.get("target_amount",  existing.data["target_amount"])
    update_data["is_completed"] = float(current) >= float(target)

    resp = (
        supabase.table("goals")
        .update(update_data)
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .execute()
    )
    return resp.data[0] if resp.data else {}

@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase     = Depends(get_supabase),
):
    """Delete a goal owned by the current user."""
    resp = (
        supabase.table("goals")
        .delete()
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not resp.data:
        not_found("Goal not found")
    return None
