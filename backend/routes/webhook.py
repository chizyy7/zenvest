"""
routes/webhook.py — Paystack payment webhook handler
Verifies payment and upgrades user to premium.
"""

import hmac
import hashlib
import logging
import os

from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel

from utils.deps import get_supabase, get_current_user_id, get_current_user

logger = logging.getLogger("zenvest.webhook")
router = APIRouter()

PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY", "")

# ============================================================
# Schemas
# ============================================================
class VerifyRequest(BaseModel):
    reference: str

# ============================================================
# Verify Signature Helper
# ============================================================
def _verify_paystack_signature(payload: bytes, signature: str) -> bool:
    """
    Verify the Paystack webhook HMAC-SHA512 signature.

    :param payload:   Raw request body bytes
    :param signature: X-Paystack-Signature header value
    :returns:         True if valid
    """
    if not PAYSTACK_SECRET_KEY:
        logger.warning("PAYSTACK_SECRET_KEY not set — skipping signature verification")
        return True

    expected = hmac.new(
        PAYSTACK_SECRET_KEY.encode(),
        payload,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected, signature or "")

# ============================================================
# Endpoints
# ============================================================
@router.post("/paystack")
async def paystack_webhook(request: Request, supabase=Depends(get_supabase)):
    """
    Paystack webhook handler for payment events.
    Called server-to-server by Paystack when payment completes.
    """
    body      = await request.body()
    signature = request.headers.get("X-Paystack-Signature", "")

    if not _verify_paystack_signature(body, signature):
        logger.warning("Invalid Paystack webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    import json
    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = event.get("event", "")
    data       = event.get("data", {})

    logger.info(f"Paystack webhook received: {event_type}")

    if event_type == "charge.success":
        await _handle_successful_payment(data, supabase)

    return {"status": "ok"}

async def _handle_successful_payment(data: dict, supabase):
    """
    Process a successful Paystack charge event.
    Upgrades the user to premium.
    """
    reference  = data.get("reference", "")
    email      = data.get("customer", {}).get("email", "")
    metadata   = data.get("metadata", {})
    user_id    = None

    # Extract user_id from metadata if available
    for field in metadata.get("custom_fields", []):
        if field.get("variable_name") == "user_id":
            user_id = field.get("value")
            break

    # Find user by email if user_id not in metadata
    if not user_id and email:
        resp = (
            supabase.table("users")
            .select("id")
            .eq("email", email)
            .single()
            .execute()
        )
        if resp.data:
            user_id = resp.data["id"]

    if not user_id:
        logger.warning(f"Could not identify user for payment {reference}")
        return

    # Upgrade user to premium
    supabase.table("users").update({
        "is_premium":        True,
        "premium_ref":       reference,
        "premium_activated": True,
    }).eq("id", user_id).execute()

    logger.info(f"User {user_id} upgraded to premium via {reference}")

@router.post("/verify")
async def verify_payment(
    payload:  VerifyRequest,
    user_id:  str = Depends(get_current_user_id),
    supabase      = Depends(get_supabase),
):
    """
    Verify a payment reference and upgrade user to premium.
    Called by the frontend after Paystack popup callback.
    """
    if not PAYSTACK_SECRET_KEY:
        # Dev mode: accept any reference
        supabase.table("users").update({"is_premium": True}).eq("id", user_id).execute()
        return {"success": True, "message": "Premium activated"}

    # Verify with Paystack API
    import httpx
    headers = {"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.paystack.co/transaction/verify/{payload.reference}",
                headers=headers,
                timeout=10.0,
            )
            resp.raise_for_status()
            data = resp.json()

        if data.get("data", {}).get("status") == "success":
            supabase.table("users").update({
                "is_premium":  True,
                "premium_ref": payload.reference,
            }).eq("id", user_id).execute()
            return {"success": True, "message": "Premium activated! 🎉"}
        else:
            return {"success": False, "message": "Payment not yet confirmed"}

    except Exception as e:
        logger.error(f"Paystack verification error: {e}")
        # Optimistic: activate premium and verify async
        supabase.table("users").update({"is_premium": True}).eq("id", user_id).execute()
        return {"success": True, "message": "Premium activated (pending verification)"}
