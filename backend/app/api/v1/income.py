"""Income API router.

Endpoints:
  GET    /api/v1/income/summary      — income overview for a given month
  POST   /api/v1/income/link         — link a transaction to an expected income
  DELETE /api/v1/income/link/{id}    — unlink a transaction
  GET    /api/v1/income/unmatched    — list unmatched income transactions
  POST   /api/v1/income/generate     — auto-generate expected income entries
"""

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.core.auth import CurrentUser
from app.core.db import get_supabase
from app.models.income import (
    ExpectedIncomeResponse,
    IncomeSummaryResponse,
    LinkTransactionRequest,
    UnmatchedTransactionsResponse,
)
from app.services import income_service

router = APIRouter(prefix="/income", tags=["income"])


@router.get("/summary", response_model=IncomeSummaryResponse)
def get_income_summary(
    user: CurrentUser,
    month: str | None = Query(
        None,
        description="Target month as YYYY-MM (default: current month)",
    ),
) -> dict[str, Any]:
    """Return the income summary for the authenticated user."""
    client = get_supabase()
    return income_service.get_income_summary(client, user_id=user.sub, month=month)


@router.post("/link", response_model=ExpectedIncomeResponse)
def link_transaction(
    payload: LinkTransactionRequest,
    user: CurrentUser,
) -> dict[str, Any]:
    """Link a transaction to an expected income entry."""
    client = get_supabase()
    try:
        return income_service.link_transaction(
            client,
            user_id=user.sub,
            expected_income_id=payload.expected_income_id,
            transaction_id=payload.transaction_id,
            amount_cents=payload.amount_cents,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/link/{link_id}", status_code=204)
def unlink_transaction(
    link_id: str,
    user: CurrentUser,
) -> None:
    """Unlink a transaction from an expected income entry."""
    client = get_supabase()
    removed = income_service.unlink_transaction(client, user_id=user.sub, link_id=link_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Link not found")


@router.get("/unmatched", response_model=UnmatchedTransactionsResponse)
def get_unmatched_transactions(
    user: CurrentUser,
    month: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
) -> dict[str, Any]:
    """List recent income transactions not linked to any expected income."""
    client = get_supabase()
    return income_service.get_unmatched_transactions(
        client, user_id=user.sub, month=month, limit=limit
    )


@router.post("/generate", response_model=list[ExpectedIncomeResponse])
def generate_expected_incomes(
    user: CurrentUser,
    month: str | None = Query(None),
) -> list[dict[str, Any]]:
    """Auto-generate expected income entries for active clients."""
    client = get_supabase()
    return income_service.generate_expected_incomes(client, user_id=user.sub, month=month)
