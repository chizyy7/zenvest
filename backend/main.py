"""
Zenvest FastAPI Backend — main.py
Entry point: configures the app, registers routers, and handles middleware.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
from contextlib import asynccontextmanager

from backend.routes.transactions import router as transactions_router
from backend.routes.goals import router as goals_router
from backend.routes.networth import router as networth_router
from backend.routes.recommendations import router as recommendations_router
from backend.routes.insights import router as insights_router
from backend.routes.reports import router as reports_router
from backend.routes.webhook import router as webhook_router
from backend.routes.auth import router as auth_router

# ============================================================
# Logging
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("zenvest")

# ============================================================
# Lifespan
# ============================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup and shutdown tasks."""
    logger.info("🚀 Zenvest API starting up")
    yield
    logger.info("🛑 Zenvest API shutting down")

# ============================================================
# App Factory
# ============================================================
app = FastAPI(
    title="Zenvest API",
    description="AI-powered personal finance and investment backend",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
)

# ============================================================
# CORS
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Global Exception Handler
# ============================================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},
    )

# ============================================================
# Health Check
# ============================================================
@app.get("/", tags=["health"])
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Zenvest API",
        "version": "1.0.0",
    }

@app.get("/health", tags=["health"])
async def health():
    """Detailed health check."""
    return {
        "status": "ok",
        "database": "supabase",
        "ml_model": "loaded",
    }

# ============================================================
# Routers
# ============================================================
app.include_router(auth_router,            prefix="/auth",            tags=["Authentication"])
app.include_router(transactions_router,    prefix="/transactions",    tags=["Transactions"])
app.include_router(goals_router,           prefix="/goals",           tags=["Goals"])
app.include_router(networth_router,        prefix="/networth",        tags=["Net Worth"])
app.include_router(recommendations_router, prefix="/recommendations", tags=["Recommendations"])
app.include_router(insights_router,        prefix="/insights",        tags=["AI Insights"])
app.include_router(reports_router,         prefix="/reports",         tags=["Reports"])
app.include_router(webhook_router,         prefix="/webhook",         tags=["Webhooks"])

# ============================================================
# Entrypoint (for local dev)
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENVIRONMENT") != "production",
    )
