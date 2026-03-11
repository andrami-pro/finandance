"""Pydantic models for the budget API.

Defines request/response schemas for category-based budget limits,
spending summaries, and category breakdowns.
"""

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class BudgetLimitUpsert(BaseModel):
    """Single category limit in a bulk upsert request."""

    category: str
    amount_cents: int = Field(..., gt=0, description="Budget limit in EUR cents")


class BudgetLimitsRequest(BaseModel):
    """Bulk upsert payload for PUT /budget/limits."""

    period: str = Field("monthly", pattern=r"^(monthly|quarterly|yearly)$")
    limits: list[BudgetLimitUpsert]


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class BudgetLimitItem(BaseModel):
    """A single persisted budget limit row."""

    id: str
    category: str
    amount_cents: int
    currency: str
    period: str
    is_active: bool


class CategoryBudgetStatus(BaseModel):
    """Per-category budget status within a summary."""

    category: str
    budgeted_cents: int
    spent_cents: int
    remaining_cents: int
    percent_used: float
    transaction_count: int
    status: str  # on_track | caution | warning | over_budget


class BudgetSummaryResponse(BaseModel):
    """Response for GET /budget/summary."""

    period: str
    period_label: str
    since: str
    until: str
    total_budgeted_cents: int
    total_spent_cents: int
    remaining_cents: int
    savings_rate: float
    currency: str
    categories: list[CategoryBudgetStatus]
    unbudgeted_spent_cents: int
    uncategorized_spent_cents: int


class CategoryBreakdownItem(BaseModel):
    """Per-category spending for charts."""

    category: str
    spent_cents: int
    percent_of_total: float
    transaction_count: int


class PeriodBreakdown(BaseModel):
    """Category spending breakdown for a single period."""

    period_label: str
    categories: list[CategoryBreakdownItem]
    total_spent_cents: int


class CategoryBreakdownResponse(BaseModel):
    """Response for GET /budget/categories."""

    current: PeriodBreakdown
    previous: PeriodBreakdown | None = None
