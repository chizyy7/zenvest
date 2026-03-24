"""
routes/networth.py — Net worth snapshot CRUD endpoints
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.utils.deps import get_current_user_id, get_supabase, not_found, bad_request

logger = logging.getLogger("zenvest.networth")
router = APIRouter()

# ============================================================
# Schemas
# ============================================================
class NetWorthSnapshot(BaseModel):
    savings:          float = Field(default=0, ge=0)
    investments:      float = Field(default=0, ge=0)
    crypto:           float = Field(default=0, ge=0)
    property:         float = Field(default=0, ge=0)
    loans:            float = Field(default=0, ge=0)
    credit_cards:     float = Field(default=0, ge=0)
    other_debt:       float = Field(default=0, ge=0)
    total_assets:     Optional[float] = None
    total_liabilities:Optional[float] = None

# ============================================================
# Endpoints
# ============================================================
@router.get("")
async def list_snapshots(
    user_id:  str = Depends(get_current_user_id),
    supabase      = Depends(get_supabase),
):
    """Get all net worth snapshots for the authenticated user."""
    resp = (
        supabase.table("net_worth_snapshots")
        .select("*")
        .eq("user_id", user_id)
        .order("snapshot_date", desc=False)
        .execute()
    )
    return resp.data or []

@router.post("", status_code=201)
async def create_snapshot(
    payload: NetWorthSnapshot,
    user_id: str = Depends(get_current_user_id),
    supabase     = Depends(get_supabase),
):
    """Save a new net worth snapshot for the current date."""
    assets = (
        payload.savings + payload.investments +
        payload.crypto  + payload.property
    )
    liabilities = payload.loans + payload.credit_cards + payload.other_debt
    net_worth   = assets - liabilities

    from datetime import date
    today = date.today().isoformat()

    resp = supabase.table("net_worth_snapshots").insert({
        "user_id":          user_id,
        "snapshot_date":    today,
        "savings":          round(payload.savings, 2),
        "investments":      round(payload.investments, 2),
        "crypto":           round(payload.crypto, 2),
        "property":         round(payload.property, 2),
        "loans":            round(payload.loans, 2),
        "credit_cards":     round(payload.credit_cards, 2),
        "other_debt":       round(payload.other_debt, 2),
        "total_assets":     round(assets, 2),
        "total_liabilities":round(liabilities, 2),
        "net_worth":        round(net_worth, 2),
    }).execute()

    if not resp.data:
        bad_request("Failed to save snapshot")

    return resp.data[0]
