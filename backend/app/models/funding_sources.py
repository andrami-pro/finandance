"""Pydantic models for the funding_sources table.

Funding sources are discovered accounts/wallets from integrations
(Wise Jars, Kraken balances, Ledger/blockchain addresses).
"""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class FundingSource(BaseModel):
    """Full funding source record as returned from the database."""

    id: UUID
    integration_id: UUID
    user_id: UUID
    external_source_id: str
    name: str
    asset_type: str
    currency: str
    current_balance: Decimal
    balance_in_base_currency: Decimal | None = None
    updated_at: datetime
    provider_name: str | None = None
    """Enriched from the parent integration row (not stored on this table)."""

    model_config = {"from_attributes": True}


class FundingSourceCreate(BaseModel):
    """Payload for inserting or upserting a funding source row."""

    integration_id: UUID
    user_id: UUID
    external_source_id: str
    name: str
    asset_type: str
    currency: str
    current_balance: Decimal
    balance_in_base_currency: Decimal | None = None
