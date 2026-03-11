/** Budget API response types. */

export interface CategoryBudgetStatus {
  category: string;
  budgeted_cents: number;
  spent_cents: number;
  remaining_cents: number;
  percent_used: number;
  transaction_count: number;
  status: "on_track" | "caution" | "warning" | "over_budget";
}

export interface BudgetSummary {
  period: string;
  period_label: string;
  since: string;
  until: string;
  total_budgeted_cents: number;
  total_spent_cents: number;
  remaining_cents: number;
  savings_rate: number;
  currency: string;
  categories: CategoryBudgetStatus[];
  unbudgeted_spent_cents: number;
  uncategorized_spent_cents: number;
}

export interface CategoryBreakdownItem {
  category: string;
  spent_cents: number;
  percent_of_total: number;
  transaction_count: number;
}

export interface PeriodBreakdown {
  period_label: string;
  categories: CategoryBreakdownItem[];
  total_spent_cents: number;
}

export interface CategoryBreakdownResponse {
  current: PeriodBreakdown;
  previous: PeriodBreakdown | null;
}

export interface BudgetLimitItem {
  id: string;
  category: string;
  amount_cents: number;
  currency: string;
  period: string;
  is_active: boolean;
}

export interface BudgetLimitUpsert {
  category: string;
  amount_cents: number;
}
