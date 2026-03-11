/** Freelance Income Tracker API response types. */

export type IncomeStatus = "pending" | "partial" | "received" | "overdue";
export type PaymentFrequency = "monthly" | "biweekly" | "weekly" | "one_time";
export type CoverageStatus = "healthy" | "tight" | "deficit";

export interface Client {
  id: string;
  name: string;
  expected_amount_cents: number;
  currency: string;
  payment_frequency: PaymentFrequency;
  expected_day: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientCreate {
  name: string;
  expected_amount_cents: number;
  currency?: string;
  payment_frequency?: PaymentFrequency;
  expected_day?: number;
  notes?: string | null;
}

export interface ClientUpdate {
  name?: string;
  expected_amount_cents?: number;
  currency?: string;
  payment_frequency?: PaymentFrequency;
  expected_day?: number;
  notes?: string | null;
  is_active?: boolean;
}

export interface LinkedTransaction {
  link_id: string;
  transaction_id: string;
  amount_cents: number;
  description: string | null;
  transaction_date: string | null;
}

export interface ClientIncomeSummary {
  expected_income_id: string;
  client_id: string;
  client_name: string;
  expected_amount_cents: number;
  received_amount_cents: number;
  status: IncomeStatus;
  expected_day: number;
  confirmed_at: string | null;
  linked_transactions: LinkedTransaction[];
}

export interface IncomeVsBudget {
  total_budgeted_cents: number;
  coverage_percent: number;
  surplus_cents: number;
  status: CoverageStatus;
}

export interface IncomeSummary {
  period_label: string;
  since: string;
  until: string;
  total_expected_cents: number;
  total_received_cents: number;
  total_pending_cents: number;
  total_overdue_cents: number;
  currency: string;
  income_vs_budget: IncomeVsBudget | null;
  clients: ClientIncomeSummary[];
  unlinked_income_count: number;
  unlinked_income_cents: number;
}

export interface UnmatchedTransaction {
  id: string;
  amount_cents: number;
  currency: string;
  description: string | null;
  transaction_date: string | null;
  source_name: string | null;
  provider_name: string | null;
  category: string | null;
}

export interface UnmatchedTransactionsResponse {
  transactions: UnmatchedTransaction[];
  total: number;
}

export interface ExpectedIncome {
  id: string;
  client_id: string;
  period_start: string;
  expected_amount_cents: number;
  received_amount_cents: number;
  currency: string;
  status: IncomeStatus;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}
