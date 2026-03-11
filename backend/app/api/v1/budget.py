"""Budget API router.

Endpoints:
  GET  /api/v1/budget/summary          — budget overview with per-category status
  GET  /api/v1/budget/categories        — category spending breakdown for charts
  PUT  /api/v1/budget/limits            — bulk upsert budget limits
  DELETE /api/v1/budget/limits/{category} — remove a single category budget
"""

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.core.auth import CurrentUser
from app.core.db import get_supabase
from app.models.budget import (
    BudgetLimitsRequest,
    BudgetSummaryResponse,
    CategoryBreakdownResponse,
)
from app.services import budget_service

router = APIRouter(prefix="/budget", tags=["budget"])


@router.get("/summary", response_model=BudgetSummaryResponse)
def get_budget_summary(
    user: CurrentUser,
    period: str = Query("monthly", pattern=r"^(monthly|quarterly|yearly)$"),
    month: str | None = Query(
        None,
        description="Target month as YYYY-MM (default: current month)",
    ),
) -> dict[str, Any]:
    """Return the budget summary for the authenticated user."""
    client = get_supabase()
    return budget_service.get_budget_summary(client, user_id=user.sub, period=period, month=month)


@router.get("/categories", response_model=CategoryBreakdownResponse)
def get_budget_categories(
    user: CurrentUser,
    period: str = Query("monthly", pattern=r"^(monthly|quarterly|yearly)$"),
    month: str | None = Query(None),
    compare: bool = Query(False, description="Include previous period for comparison"),
) -> dict[str, Any]:
    """Return category spending breakdown for charts."""
    client = get_supabase()
    return budget_service.get_category_breakdown(
        client,
        user_id=user.sub,
        period=period,
        month=month,
        compare=compare,
    )


@router.put("/limits")
def upsert_budget_limits(
    payload: BudgetLimitsRequest,
    user: CurrentUser,
) -> list[dict[str, Any]]:
    """Create or update budget limits (bulk upsert)."""
    client = get_supabase()
    limits = [lim.model_dump() for lim in payload.limits]
    return budget_service.upsert_budget_limits(
        client, user_id=user.sub, limits=limits, period=payload.period
    )


@router.delete("/limits/{category}", status_code=204)
def delete_budget_limit(
    category: str,
    user: CurrentUser,
    period: str = Query("monthly", pattern=r"^(monthly|quarterly|yearly)$"),
) -> None:
    """Remove a single category budget limit."""
    client = get_supabase()
    deleted = budget_service.delete_budget_limit(
        client, user_id=user.sub, category=category, period=period
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Budget limit not found")
