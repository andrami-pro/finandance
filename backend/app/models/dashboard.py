"""Pydantic models for the dashboard summary endpoint."""

from pydantic import BaseModel


class IntegrationSummary(BaseModel):
    """Compact integration status for the dashboard connections card."""

    provider_name: str
    status: str
    last_synced_at: str | None = None


class ProjectSummary(BaseModel):
    """Compact project info for the dashboard goals card."""

    id: str
    name: str
    target_amount: float
    current_amount: float
    progress_percent: float
    target_currency: str


class DashboardSummary(BaseModel):
    """Aggregated overview returned by GET /api/v1/dashboard/summary."""

    net_worth: float
    net_worth_currency: str = "EUR"
    active_projects: list[ProjectSummary]
    integrations: list[IntegrationSummary]
    total_projects: int
    average_progress: float
