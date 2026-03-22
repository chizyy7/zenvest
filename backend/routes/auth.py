"""
routes/auth.py — Authentication and user profile endpoints
"""

import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from utils.deps import get_current_user, get_current_user_id, get_supabase

logger = logging.getLogger("zenvest.auth")
router = APIRouter()

# ============================================================
# Schemas
# ============================================================
class UserProfileUpdate(BaseModel):
    name: str | None = None
    email_reports: bool = True

# ============================================================
# Endpoints
# ============================================================
@router.get("/validate")
async def validate_token(
    user: dict = Depends(get_current_user),
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_supabase),
):
    """Validate a JWT token and return user premium status."""
    resp = (
        supabase.table("users")
        .select("id, email, is_premium, name, created_at")
        .eq("id", user_id)
        .single()
        .execute()
    )

    is_premium = False
    if resp.data:
        is_premium = resp.data.get("is_premium", False)
    else:
        # Upsert user record
        supabase.table("users").upsert({
            "id":         user_id,
            "email":      user.get("email", ""),
            "is_premium": False,
        }).execute()

    return {
        "user_id":    user_id,
        "email":      user.get("email", ""),
        "is_premium": is_premium,
        "valid":      True,
    }

@router.put("/profile")
async def update_profile(
    payload: UserProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    supabase=Depends(get_supabase),
):
    """Update user profile settings."""
    update_data = {}
    if payload.name is not None:
        update_data["name"] = payload.name
    update_data["email_reports"] = payload.email_reports

    supabase.table("users").update(update_data).eq("id", user_id).execute()
    return {"message": "Profile updated"}
