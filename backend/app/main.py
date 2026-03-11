"""Finandance FastAPI application.

Entry point: run with
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings

import logging

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

settings = get_settings()

app = FastAPI(
    title="Finandance API",
    version="0.1.0",
    description="Premium personal finance platform — backend API",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

logger = logging.getLogger("finandance")
logger.setLevel(logging.INFO)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print(f"CORS allowlist initialized: {settings.cors_origins_list}")

# ---------------------------------------------------------------------------
# Standard error shape helpers
# ---------------------------------------------------------------------------


def _error_body(
    code: str,
    message: str,
    details: Any = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return body


# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(
            code=f"HTTP_{exc.status_code}",
            message=str(exc.detail),
        ),
    )


def _sanitize_errors(errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Make Pydantic v2 error dicts JSON-serializable.

    Pydantic v2's ``exc.errors()`` may include ``ctx.error`` containing an
    Exception instance, which is not JSON-serializable. Convert those to
    their string representation.
    """
    sanitized: list[dict[str, Any]] = []
    for err in errors:
        err_copy: dict[str, Any] = {**err}
        if isinstance(err_copy.get("ctx"), dict):
            ctx: dict[str, Any] = {**err_copy["ctx"]}
            if isinstance(ctx.get("error"), Exception):
                ctx["error"] = str(ctx["error"])
            err_copy["ctx"] = ctx
        # Drop the url field (verbose, not needed in API responses)
        err_copy.pop("url", None)
        sanitized.append(err_copy)
    return sanitized


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_body(
            code="VALIDATION_ERROR",
            message="Request validation failed",
            details=_sanitize_errors(exc.errors()),
        ),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # In production, do NOT expose internal error details.
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_body(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected error occurred",
        ),
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/", tags=["meta"])
async def root() -> dict[str, Any]:
    return {
        "message": "Welcome to Finandance API",
        "docs": "/docs",
        "health": "/health",
        "version": "0.1.0",
    }


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# API routers — Phase 3: US1 (integrations, jobs, funding sources)
# ---------------------------------------------------------------------------

from app.api.v1 import (
    budget,
    clients,
    dashboard,
    email_config,
    funding_plans,
    funding_sources,
    income,
    integrations,
    jobs,
    projects,
    transactions,
    webhooks,
)

app.include_router(integrations.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(funding_sources.router, prefix="/api/v1")
app.include_router(transactions.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(funding_plans.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(budget.router, prefix="/api/v1")
app.include_router(clients.router, prefix="/api/v1")
app.include_router(income.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(email_config.router, prefix="/api/v1")
