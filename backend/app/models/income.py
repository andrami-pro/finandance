"""Pydantic models for the freelance income tracker API.

Defines request/response schemas for clients, expected incomes,
transaction linking, and income summaries.
"""

from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class ClientCreate(BaseModel):
    """Create a new freelance client."""

    name: str = Field(..., min_length=1, max_length=200)
    expected_amount_cents: int = Field(0, ge=0, description="Expected monthly income in EUR cents")
    currency: str = Field("EUR", max_length=10)
    payment_frequency: Literal["monthly", "biweekly", "weekly", "one_time"] = "monthly"
    expected_day: int = Field(1, ge=1, le=31, description="Expected payment day of month")
    notes: str | None = None


class ClientUpdate(BaseModel):
    """Update an existing client (all fields optional)."""

    name: str | None = Field(None, min_length=1, max_length=200)
    expected_amount_cents: int | None = Field(None, ge=0)
    currency: str | None = Field(None, max_length=10)
    payment_frequency: Literal["monthly", "biweekly", "weekly", "one_time"] | None = None
    expected_day: int | None = Field(None, ge=1, le=31)
    notes: str | None = None
    is_active: bool | None = None


class LinkTransactionRequest(BaseModel):
    """Link a transaction to an expected income entry."""

    expected_income_id: str = Field(..., description="UUID of the expected income entry")
    transaction_id: str = Field(..., description="UUID of the transaction to link")
    amount_cents: int = Field(..., gt=0, description="Amount being linked in cents")


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class ClientResponse(BaseModel):
    """A single client record."""

    id: str
    name: str
    expected_amount_cents: int
    currency: str
    payment_frequency: str
    expected_day: int
    notes: str | None = None
    is_active: bool
    created_at: str
    updated_at: str


class LinkedTransaction(BaseModel):
    """A transaction linked to an expected income entry."""

    link_id: str
    transaction_id: str
    amount_cents: int
    description: str | None = None
    transaction_date: str | None = None


class ClientIncomeSummary(BaseModel):
    """Per-client income status within a period summary."""

    expected_income_id: str
    client_id: str
    client_name: str
    expected_amount_cents: int
    received_amount_cents: int
    status: str  # pending | partial | received | overdue
    expected_day: int
    confirmed_at: str | None = None
    linked_transactions: list[LinkedTransaction] = []


class IncomeVsBudget(BaseModel):
    """Cross-reference of expected income vs budgeted spending."""

    total_budgeted_cents: int
    coverage_percent: float
    surplus_cents: int
    status: str  # healthy | tight | deficit


class IncomeSummaryResponse(BaseModel):
    """Response for GET /income/summary."""

    period_label: str
    since: str
    until: str
    total_expected_cents: int
    total_received_cents: int
    total_pending_cents: int
    total_overdue_cents: int
    currency: str
    income_vs_budget: IncomeVsBudget | None = None
    clients: list[ClientIncomeSummary]
    unlinked_income_count: int
    unlinked_income_cents: int


class UnmatchedTransaction(BaseModel):
    """An income transaction not linked to any expected income."""

    id: str
    amount_cents: int
    currency: str
    description: str | None = None
    transaction_date: str | None = None
    source_name: str | None = None
    provider_name: str | None = None
    category: str | None = None


class UnmatchedTransactionsResponse(BaseModel):
    """Response for GET /income/unmatched."""

    transactions: list[UnmatchedTransaction]
    total: int


class ExpectedIncomeResponse(BaseModel):
    """A single expected income entry."""

    id: str
    client_id: str
    period_start: str
    expected_amount_cents: int
    received_amount_cents: int
    currency: str
    status: str
    confirmed_at: str | None = None
    created_at: str
    updated_at: str
