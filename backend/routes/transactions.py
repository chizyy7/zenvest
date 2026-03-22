"""
routes/transactions.py — Transaction CRUD endpoints
"""

import logging
from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, field_validator

from utils.deps import get_current_user_id, get_supabase, not_found, bad_request

logger = logging.getLogger("zenvest.transactions")
router = APIRouter()

# ============================================================
# Schemas
# ============================================================
VALID_TYPES  = {"income", "expense"}
VALID_CATS   = {
    "Food & Drink", "Transport", "Entertainment",
    "Bills", "Health", "Shopping", "Income", "Other"
}

class TransactionCreate(BaseModel):
    type:        str   = Field(..., description="'income' or 'expense'")
    amount:      float = Field(..., gt=0, description="Positive amount")
    category:    str   = Field(..., description="Spending category")
    description: str   = Field(default="", max_length=200)
    date:        str   = Field(..., description="ISO date string YYYY-MM-DD")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in VALID_TYPES:
            raise ValueError(f"type must be one of {VALID_TYPES}")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in VALID_CATS:
            raise ValueError(f"category must be one of {VALID_CATS}")
        return v

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError("date must be in YYYY-MM-DD format")
        return v

class TransactionUpdate(BaseModel):
    type:        Optional[str]   = None
    amount:      Optional[float] = Field(default=None, gt=0)
    category:    Optional[str]   = None
    description: Optional[str]   = Field(default=None, max_length=200)
    date:        Optional[str]   = None

# ============================================================
# Endpoints
# ============================================================
@router.get("")
async def list_transactions(
    type:     Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    month:    Optional[str] = Query(default=None, description="YYYY-MM"),
    limit:    int           = Query(default=100, le=500),
    offset:   int           = Query(default=0, ge=0),
    user_id:  str           = Depends(get_current_user_id),
    supabase                = Depends(get_supabase),
):
    """List all transactions for the authenticated user."""
    query = (
        supabase.table("transactions")
        .select("*")
        .eq("user_id", user_id)
        .order("date", desc=True)
        .limit(limit)
        .offset(offset)
    )

    if type and type in VALID_TYPES:
        query = query.eq("type", type)
    if category and category in VALID_CATS:
        query = query.eq("category", category)
    if month:
        try:
            year, mon = month.split("-")
            start = f"{year}-{mon}-01"
            # Calculate end of month
            from calendar import monthrange
            last_day = monthrange(int(year), int(mon))[1]
            end = f"{year}-{mon}-{last_day:02d}"
            query = query.gte("date", start).lte("date", end)
        except (ValueError, AttributeError):
            pass

    resp = query.execute()
    return resp.data or []

@router.post("", status_code=201)
async def create_transaction(
    payload: TransactionCreate,
    user_id: str = Depends(get_current_user_id),
    supabase     = Depends(get_supabase),
):
    """Create a new transaction."""
    resp = supabase.table("transactions").insert({
        "user_id":     user_id,
        "type":        payload.type,
        "amount":      round(float(payload.amount), 2),
        "category":    payload.category,
        "description": payload.description,
        "date":        payload.date,
    }).execute()

    if not resp.data:
        bad_request("Failed to create transaction")

    return resp.data[0]

@router.put("/{tx_id}")
async def update_transaction(
    tx_id:   str,
    payload: TransactionUpdate,
    user_id: str = Depends(get_current_user_id),
    supabase     = Depends(get_supabase),
):
    """Update a transaction owned by the current user."""
    # Verify ownership
    existing = (
        supabase.table("transactions")
        .select("id")
        .eq("id", tx_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not existing.data:
        not_found("Transaction not found")

    update_data = payload.model_dump(exclude_none=True)
    if "amount" in update_data:
        update_data["amount"] = round(float(update_data["amount"]), 2)

    resp = (
        supabase.table("transactions")
        .update(update_data)
        .eq("id", tx_id)
        .eq("user_id", user_id)
        .execute()
    )
    return resp.data[0] if resp.data else {}

@router.delete("/{tx_id}", status_code=204)
async def delete_transaction(
    tx_id:   str,
    user_id: str = Depends(get_current_user_id),
    supabase     = Depends(get_supabase),
):
    """Delete a transaction owned by the current user."""
    resp = (
        supabase.table("transactions")
        .delete()
        .eq("id", tx_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not resp.data:
        not_found("Transaction not found")
    return None
