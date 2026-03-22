"""
Shared utilities: Supabase client, JWT auth, and response helpers.
"""

import os
import logging
from functools import lru_cache
from typing import Optional

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from supabase import create_client, Client

logger = logging.getLogger("zenvest.deps")

# ============================================================
# Supabase Client
# ============================================================

@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Return a cached Supabase client instance."""
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    return create_client(url, key)

# ============================================================
# JWT Authentication
# ============================================================
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")

bearer_scheme = HTTPBearer()

def verify_jwt(token: str) -> dict:
    """
    Decode and verify a Supabase JWT token.

    :param token: JWT access token string
    :returns: Decoded payload dict
    :raises HTTPException 401: if token is invalid or expired
    """
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="JWT secret not configured")
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as e:
        logger.warning(f"JWT verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    FastAPI dependency that validates the Bearer token and returns the user payload.

    :raises HTTPException 401: if not authenticated
    """
    return verify_jwt(credentials.credentials)

async def get_current_user_id(
    user: dict = Depends(get_current_user),
) -> str:
    """
    FastAPI dependency that returns just the user's UUID string.
    """
    uid = user.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="Could not identify user")
    return uid

# ============================================================
# Premium check dependency
# ============================================================
async def require_premium(
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
) -> str:
    """
    FastAPI dependency that verifies the user has an active premium subscription.

    :raises HTTPException 403: if user is not premium
    """
    resp = (
        supabase.table("users")
        .select("is_premium")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not resp.data or not resp.data.get("is_premium"):
        raise HTTPException(
            status_code=403,
            detail="This feature requires a Premium subscription",
        )
    return user_id

# ============================================================
# Pagination helper
# ============================================================
def paginate(data: list, limit: int = 50, offset: int = 0) -> dict:
    """
    Paginate a list of items.

    :param data: Full list
    :param limit: Page size
    :param offset: Start index
    :returns: Dict with items, total, limit, offset
    """
    total = len(data)
    page  = data[offset : offset + limit]
    return {
        "items":  page,
        "total":  total,
        "limit":  limit,
        "offset": offset,
        "has_more": (offset + limit) < total,
    }

# ============================================================
# Error helpers
# ============================================================
def not_found(detail: str = "Resource not found"):
    raise HTTPException(status_code=404, detail=detail)

def bad_request(detail: str = "Bad request"):
    raise HTTPException(status_code=400, detail=detail)

def forbidden(detail: str = "Forbidden"):
    raise HTTPException(status_code=403, detail=detail)
