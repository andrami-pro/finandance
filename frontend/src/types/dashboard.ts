// ---------------------------------------------------------------------------
// Dashboard summary types — matches GET /api/v1/dashboard/summary
// ---------------------------------------------------------------------------

export interface IntegrationSummary {
  provider_name: string;
  status: "PENDING" | "ACTIVE" | "ERROR";
  last_synced_at: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  progress_percent: number;
  target_currency: string;
}

export interface DashboardSummary {
  net_worth: number;
  net_worth_currency: string;
  active_projects: ProjectSummary[];
  integrations: IntegrationSummary[];
  total_projects: number;
  average_progress: number;
}

// ---------------------------------------------------------------------------
// Compatible sources — matches GET /api/v1/dashboard/compatible-sources
// ---------------------------------------------------------------------------

export interface CompatibleSource {
  id: string;
  name: string;
  currency: string;
  current_balance: number;
  asset_type: string;
  integration_id: string;
  provider_name: string | null;
}
