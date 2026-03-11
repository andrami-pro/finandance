// ---------------------------------------------------------------------------
// Project types — shared across wizard, hooks, and API layer
// ---------------------------------------------------------------------------

export type ProjectCategory = "travel" | "home" | "auto" | "family" | "emergency";

export type MemberRole = "OWNER" | "MEMBER" | "PENDING_INVITE";

export type Provider = "WISE" | "KRAKEN" | "LEDGER" | "REVOLUT";

// ---------------------------------------------------------------------------
// Wizard step data
// ---------------------------------------------------------------------------

export type ProjectCurrency = "EUR" | "USD" | "BTC";

export type FundingStrategy = "fiat" | "crypto";

export interface ProjectDetails {
  name: string;
  targetAmount: number | null;
  targetCurrency: ProjectCurrency;
  targetDate: string; // ISO 'YYYY-MM-DD' or ''
  category: ProjectCategory | null;
}

export interface ProjectMember {
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: MemberRole;
  userId?: string;
}

export interface FundingSourceOption {
  id: string;
  provider: Provider;
  name: string;
  currency: string;
  currentBalance: number;
  /** Balance converted to EUR via exchange rates. Null if no rate available. */
  balanceInBaseCurrency: number | null;
  ownerName: string;
  ownerAvatarUrl?: string;
  selected: boolean;
}

// ---------------------------------------------------------------------------
// Full wizard state
// ---------------------------------------------------------------------------

export interface CreateProjectWizardData {
  details: ProjectDetails;
  members: ProjectMember[];
  selectedFundingSources: string[]; // funding source IDs
  invitedEmails: string[];
}

// ---------------------------------------------------------------------------
// Funding plan types
// ---------------------------------------------------------------------------

export type PlanType = "dca" | "lump_sum";

export type PlanFrequency = "weekly" | "biweekly" | "monthly";

export interface FundingPlanResponse {
  id: string;
  project_id: string;
  user_id: string;
  funding_source_id: string | null;
  plan_type: PlanType;
  amount: number;
  currency: string;
  frequency: PlanFrequency | null;
  next_reminder_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

export interface ProjectResponse {
  id: string;
  name: string;
  target_amount: number;
  target_currency: string;
  target_date: string | null;
  category: ProjectCategory | null;
  funding_strategy: FundingStrategy | null;
  created_by: string;
  current_amount: number;
  members: Array<{
    user_id: string;
    role: MemberRole;
    full_name?: string;
    avatar_url?: string;
    email?: string;
  }>;
  funding_sources: Array<{
    funding_source_id: string;
    allocated_amount: number | null;
  }>;
  funding_plans: FundingPlanResponse[];
  created_at: string;
  updated_at: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  target_amount: number;
  target_currency: string;
  target_date: string | null;
  category: ProjectCategory | null;
  funding_strategy: FundingStrategy | null;
  current_amount: number;
  progress_percent: number;
  member_count: number;
  funding_sources_count: number;
}
