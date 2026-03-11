"""Funding Plans API router.

Endpoints:
  POST   /api/v1/funding-plans                   -- create funding plan
  GET    /api/v1/funding-plans?project_id={id}    -- list plans for project
  GET    /api/v1/funding-plans/{id}               -- get single plan
  PUT    /api/v1/funding-plans/{id}               -- update plan
  DELETE /api/v1/funding-plans/{id}               -- delete plan
"""

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.core.auth import CurrentUser
from app.core.db import get_supabase
from app.models.funding_plans import (
    FundingPlanCreate,
    FundingPlanListResponse,
    FundingPlanResponse,
    FundingPlanUpdate,
)
from app.services.funding_plan_service import (
    create_funding_plan,
    delete_funding_plan,
    get_funding_plan,
    get_funding_plans_for_project,
    update_funding_plan,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/funding-plans", tags=["funding-plans"])


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("", response_model=FundingPlanResponse, status_code=status.HTTP_201_CREATED)
def create_new_funding_plan(payload: FundingPlanCreate, user: CurrentUser) -> dict[str, Any]:
    """Create a new funding plan for a project."""
    client = get_supabase()

    result = create_funding_plan(
        client,
        user_id=user.sub,
        project_id=payload.project_id,
        funding_source_id=payload.funding_source_id,
        plan_type=payload.plan_type.value,
        amount=payload.amount,
        currency=payload.currency,
        frequency=payload.frequency.value if payload.frequency else None,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of the target project",
        )

    return result


@router.get("", response_model=FundingPlanListResponse)
def list_funding_plans(
    user: CurrentUser,
    project_id: UUID = Query(..., description="Filter by project ID"),
) -> dict[str, Any]:
    """List all funding plans for a project."""
    client = get_supabase()

    items = get_funding_plans_for_project(client, project_id=str(project_id), user_id=user.sub)

    if items is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of the target project",
        )

    return {"items": items, "count": len(items)}


@router.get("/{plan_id}", response_model=FundingPlanResponse)
def get_funding_plan_detail(plan_id: UUID, user: CurrentUser) -> dict[str, Any]:
    """Get a single funding plan by ID."""
    client = get_supabase()

    result = get_funding_plan(client, plan_id=str(plan_id), user_id=user.sub)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funding plan not found or access denied",
        )

    return result


@router.put("/{plan_id}", response_model=FundingPlanResponse)
def update_existing_funding_plan(
    plan_id: UUID, payload: FundingPlanUpdate, user: CurrentUser
) -> dict[str, Any]:
    """Update a funding plan. Only the plan owner can update."""
    client = get_supabase()

    result = update_funding_plan(
        client,
        plan_id=str(plan_id),
        user_id=user.sub,
        funding_source_id=payload.funding_source_id,
        amount=payload.amount,
        frequency=payload.frequency.value if payload.frequency else None,
        is_active=payload.is_active,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funding plan not found or not the owner",
        )

    return result


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_funding_plan(plan_id: UUID, user: CurrentUser) -> None:
    """Delete a funding plan. Only the plan owner can delete."""
    client = get_supabase()

    deleted = delete_funding_plan(client, plan_id=str(plan_id), user_id=user.sub)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Funding plan not found or not the owner",
        )
