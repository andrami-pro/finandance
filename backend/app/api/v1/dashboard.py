"""Dashboard API endpoints.

Provides aggregated views for the main dashboard:
- GET /dashboard/summary — net worth, projects, integrations
- GET /dashboard/compatible-sources — sources matching a target currency
"""

from typing import Any

from fastapi import APIRouter, Query

from app.core.auth import CurrentUser
from app.core.db import get_supabase
from app.models.dashboard import DashboardSummary
from app.services.dashboard_service import get_compatible_sources, get_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(user: CurrentUser) -> dict[str, Any]:
    """Return aggregated dashboard data: net worth, goals, connections."""
    client = get_supabase()
    return get_dashboard_summary(client, user_id=user.sub)


@router.get("/compatible-sources")
def compatible_sources(
    user: CurrentUser,
    target_currency: str = Query(..., description="Project target currency (e.g. BTC, EUR)"),
) -> list[dict[str, Any]]:
    """Return funding sources compatible with a project's target currency."""
    client = get_supabase()
    return get_compatible_sources(client, user_id=user.sub, target_currency=target_currency)
