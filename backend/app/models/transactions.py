"""Pydantic models for the transactions API.

Defines response schemas for transaction listing with enriched metadata
(funding source name, provider name) and pagination + summary aggregates.
"""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class TransactionItem(BaseModel):
    """Single transaction row enriched with source/provider context."""

    id: UUID
    funding_source_id: UUID
    external_transaction_id: str | None = None
    amount: Decimal
    currency: str
    direction: str | None = None  # "IN" or "OUT"
    description: str | None = None
    category: str | None = None
    notes: str | None = None
    transaction_date: datetime
    is_split: bool = False
    split_with_user_id: UUID | None = None
    split_amount: Decimal | None = None

    # Enriched fields (joined from funding_sources + integrations)
    source_name: str
    provider_name: str  # "WISE", "KRAKEN", "LEDGER"

    # Income linking (optional, populated when client_id is set)
    client_id: str | None = None
    client_name: str | None = None

    model_config = {"from_attributes": True}


class TransactionUpdate(BaseModel):
    """Partial update payload for a transaction."""

    category: str | None = None
    notes: str | None = None


class TransactionSummary(BaseModel):
    """Aggregate inflow/outflow totals across all user transactions."""

    total_inflows: Decimal
    total_outflows: Decimal
    net_cashflow: Decimal
    currency: str


class TransactionsResponse(BaseModel):
    """Paginated response wrapper for the transactions list endpoint."""

    items: list[TransactionItem]
    summary: TransactionSummary
    page: int
    limit: int
    total: int
