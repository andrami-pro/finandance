"use client";

import {
  Bank,
  CaretRight,
  Clock,
  CurrencyEur,
  Pencil,
  ShoppingBag,
  Sparkle,
  TrendUp,
  Warning,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useBudgetCategories, useBudgetLimits, useBudgetSummary } from "@/hooks/useBudget";
import { useIncomeSummary } from "@/hooks/useIncome";
import {
  BUDGETABLE_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_STYLES,
  DEFAULT_CATEGORY_STYLE,
} from "@/lib/categories";
import type { BudgetLimitUpsert, CategoryBudgetStatus } from "@/types/budget";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function centsToEur(cents: number): string {
  const eur = Math.abs(cents) / 100;
  return eur.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function centsToEurShort(cents: number): string {
  const eur = Math.abs(cents) / 100;
  if (eur >= 1000) return `${(eur / 1000).toFixed(1)}k`;
  return eur.toFixed(0);
}

type PeriodKey = "monthly" | "quarterly" | "yearly";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

function statusColor(status: string): string {
  switch (status) {
    case "on_track":
      return "bg-primary";
    case "caution":
      return "bg-[#f59e0b]";
    case "warning":
      return "bg-[#ef4444]";
    case "over_budget":
      return "bg-[#dc2626]";
    default:
      return "bg-primary";
  }
}

function statusTextColor(status: string): string {
  switch (status) {
    case "on_track":
      return "text-primary";
    case "caution":
      return "text-[#f59e0b]";
    case "warning":
      return "text-[#ef4444]";
    case "over_budget":
      return "text-[#dc2626]";
    default:
      return "text-primary";
  }
}

function _statusLabel(status: string): string {
  switch (status) {
    case "on_track":
      return "On Track";
    case "caution":
      return "Caution";
    case "warning":
      return "Warning";
    case "over_budget":
      return "Over Budget";
    default:
      return status;
  }
}

/* ------------------------------------------------------------------ */
/*  Donut Chart                                                        */
/* ------------------------------------------------------------------ */

function DonutChart({
  categories,
  remainingCents,
}: {
  categories: CategoryBudgetStatus[];
  remainingCents: number;
}) {
  // Build conic gradient from budgeted category amounts
  const total = categories.reduce((sum, c) => sum + c.budgeted_cents, 0);
  if (total === 0) {
    return (
      <div className="relative mb-6 h-32 w-32 shrink-0 rounded-full bg-muted">
        <div className="absolute inset-0 m-auto flex h-20 w-20 flex-col items-center justify-center rounded-full bg-card shadow-inner">
          <span className="text-[10px] uppercase text-muted-foreground">No Budget</span>
          <span className="text-sm font-bold text-foreground">&euro;0.00</span>
        </div>
      </div>
    );
  }

  let cumPct = 0;
  const stops: string[] = [];
  const legend: Array<{ label: string; pct: number; color: string }> = [];

  // Take top categories by budget for the chart
  const sorted = [...categories].sort((a, b) => b.budgeted_cents - a.budgeted_cents);
  const topCats = sorted.slice(0, 5);
  const otherBudget = sorted.slice(5).reduce((s, c) => s + c.budgeted_cents, 0);

  for (const cat of topCats) {
    const pct = (cat.budgeted_cents / total) * 100;
    const color = CATEGORY_COLORS[cat.category] ?? "#6b7280";
    stops.push(`${color} ${cumPct}% ${cumPct + pct}%`);
    legend.push({ label: cat.category, pct: Math.round(pct), color });
    cumPct += pct;
  }

  if (otherBudget > 0) {
    const pct = (otherBudget / total) * 100;
    stops.push(`#d1d5db ${cumPct}% ${cumPct + pct}%`);
    legend.push({ label: "Other", pct: Math.round(pct), color: "#d1d5db" });
  }

  return (
    <>
      <div
        className="relative mb-6 h-32 w-32 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
      >
        <div className="absolute inset-0 m-auto flex h-20 w-20 flex-col items-center justify-center rounded-full bg-card shadow-inner">
          <span className="text-[10px] uppercase text-muted-foreground">Remaining</span>
          <span className="text-sm font-bold text-foreground">
            &euro;{centsToEur(Math.max(0, remainingCents))}
          </span>
        </div>
      </div>
      <div className="w-full space-y-3">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-foreground">{item.label}</span>
            </div>
            <span className="text-muted-foreground">{item.pct}%</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Smart Insights Generator                                           */
/* ------------------------------------------------------------------ */

function generateInsights(
  categories: CategoryBudgetStatus[],
  remainingCents: number,
  until: string
): Array<{ title: string; body: string; type: "warning" | "info" }> {
  const insights: Array<{ title: string; body: string; type: "warning" | "info" }> = [];

  // Days remaining in period
  const endDate = new Date(until);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000));

  // Categories in warning/over_budget
  const critical = categories.filter((c) => c.status === "warning" || c.status === "over_budget");
  for (const cat of critical.slice(0, 2)) {
    insights.push({
      title: cat.status === "over_budget" ? `${cat.category} Over Budget` : `${cat.category} Alert`,
      body:
        cat.status === "over_budget"
          ? `${cat.category} is at ${cat.percent_used.toFixed(0)}% — over budget by €${centsToEur(Math.abs(cat.remaining_cents))}.`
          : `${cat.category} is at ${cat.percent_used.toFixed(0)}% of budget with ${daysLeft} days remaining.`,
      type: "warning",
    });
  }

  // Remaining budget insight
  if (remainingCents > 0 && insights.length < 3) {
    insights.push({
      title: "Budget Remaining",
      body: `You have €${centsToEur(remainingCents)} remaining this month across all categories.`,
      type: "info",
    });
  }

  // Caution categories
  const caution = categories.filter((c) => c.status === "caution");
  for (const cat of caution.slice(0, 2 - insights.length)) {
    if (insights.length >= 3) break;
    insights.push({
      title: `${cat.category} Trending High`,
      body: `${cat.category} is at ${cat.percent_used.toFixed(0)}% with ${daysLeft} days left in the period.`,
      type: "info",
    });
  }

  return insights.slice(0, 3);
}

/* ------------------------------------------------------------------ */
/*  Budget Editor Modal                                                */
/* ------------------------------------------------------------------ */

function BudgetEditorModal({
  open,
  onClose,
  currentLimits,
  period,
}: {
  open: boolean;
  onClose: () => void;
  currentLimits: CategoryBudgetStatus[];
  period: PeriodKey;
}) {
  const { saveLimits, saving } = useBudgetLimits();

  // Build initial values from existing limits
  const initialValues = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of currentLimits) {
      map[cat.category] = (cat.budgeted_cents / 100).toString();
    }
    return map;
  }, [currentLimits]);

  const [values, setValues] = useState<Record<string, string>>(initialValues);

  // Reset when modal opens
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setValues(initialValues);
  }
  if (open !== lastOpen) setLastOpen(open);

  const handleSave = async () => {
    const limits: BudgetLimitUpsert[] = [];
    for (const cat of BUDGETABLE_CATEGORIES) {
      const val = parseFloat(values[cat] || "0");
      if (val > 0) {
        limits.push({ category: cat, amount_cents: Math.round(val * 100) });
      }
    }
    try {
      await saveLimits(limits, period);
      onClose();
    } catch {
      // error is surfaced via useBudgetLimits().error
    }
  };

  if (!open) return null;

  // Find actual spending per category from currentLimits for "vs actual" hint
  const spendingMap: Record<string, number> = {};
  for (const cat of currentLimits) {
    spendingMap[cat.category] = cat.spent_cents;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-md border border-border bg-card shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Edit Budgets</h2>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Set {PERIOD_LABELS[period].toLowerCase()} spending limits per category
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          {/* Categories list */}
          <div className="flex-1 space-y-3 overflow-y-auto p-6">
            {BUDGETABLE_CATEGORIES.map((cat) => {
              const catStyle = CATEGORY_STYLES[cat] ?? DEFAULT_CATEGORY_STYLE;
              const actual = spendingMap[cat];
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span
                    className={`inline-flex w-28 items-center justify-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold ${catStyle}`}
                  >
                    {cat}
                  </span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      &euro;
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={values[cat] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [cat]: e.target.value }))}
                      placeholder="0"
                      className="w-full rounded-md border border-border bg-muted py-2 pl-7 pr-3 text-xs font-medium text-foreground placeholder-muted-foreground/50 focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {actual !== undefined && actual > 0 && (
                    <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                      actual: &euro;{centsToEur(actual)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border p-6">
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-primary px-6 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Budgets"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BudgetPage() {
  const [period, setPeriod] = useState<PeriodKey>("monthly");
  const [editorOpen, setEditorOpen] = useState(false);

  const { summary, loading, error } = useBudgetSummary(period);
  const { breakdown } = useBudgetCategories(period, undefined, true);
  const { summary: incomeSummary } = useIncomeSummary();

  const insights = useMemo(() => {
    if (!summary) return [];
    const base = generateInsights(summary.categories, summary.remaining_cents, summary.until);
    // Add income coverage insight if available
    if (incomeSummary?.income_vs_budget && base.length < 3) {
      const pct = incomeSummary.income_vs_budget.coverage_percent;
      base.push({
        title: "Income Coverage",
        body: `Your expected income covers ${pct.toFixed(0)}% of your budget this month.`,
        type: pct < 80 ? "warning" : "info",
      });
    }
    return base;
  }, [summary, incomeSummary]);

  const daysInPeriod = useMemo(() => {
    if (!summary) return 0;
    const start = new Date(summary.since);
    const end = new Date(summary.until);
    return Math.ceil((end.getTime() - start.getTime()) / 86400000);
  }, [summary]);

  const daysElapsed = useMemo(() => {
    if (!summary) return 0;
    const start = new Date(summary.since);
    const now = new Date();
    return Math.max(0, Math.ceil((now.getTime() - start.getTime()) / 86400000));
  }, [summary]);

  const percentUsed = summary
    ? summary.total_budgeted_cents > 0
      ? Math.round((summary.total_spent_cents / summary.total_budgeted_cents) * 100)
      : 0
    : 0;

  // Budget alert badge count
  const alertCount = summary
    ? summary.categories.filter((c) => c.status === "warning" || c.status === "over_budget").length
    : 0;

  const hasBudgets = summary && summary.categories.length > 0;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
            Budget &amp; Spending
          </h1>
          <p className="text-xs text-muted-foreground">
            {summary?.period_label ?? "..."} Overview
            {alertCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 font-bold text-[#ef4444]">
                <Warning size={12} />
                {alertCount} alert{alertCount > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditorOpen(true)}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
          >
            <Pencil size={14} />
            Edit Budgets
          </button>
          <div className="flex gap-2">
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === key
                    ? "border-foreground bg-foreground text-background shadow-sm"
                    : "border-border bg-card text-foreground hover:border-primary/30 hover:text-primary"
                }`}
              >
                {PERIOD_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && !summary && (
        <div className="rounded-md border border-border bg-card p-16 text-center text-muted-foreground shadow-sm">
          Loading budget data&hellip;
        </div>
      )}

      {error && (
        <div className="rounded-md border border-border bg-card p-16 text-center text-destructive shadow-sm">
          {error}
        </div>
      )}

      {summary && (
        <>
          {/* Summary cards */}
          <div
            className={`mb-6 grid grid-cols-1 gap-6 ${incomeSummary?.income_vs_budget ? "md:grid-cols-4" : "md:grid-cols-3"}`}
          >
            {/* Monthly Budget */}
            <div className="rounded-md border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {PERIOD_LABELS[period]} Budget
                  </h3>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    &euro;{centsToEur(summary.total_budgeted_cents)}
                  </div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bank size={18} />
                </div>
              </div>
              {!hasBudgets && (
                <button
                  onClick={() => setEditorOpen(true)}
                  className="text-[10px] font-bold text-primary transition-colors hover:text-primary/80"
                >
                  Set your first budget &rarr;
                </button>
              )}
              {hasBudgets && breakdown?.previous && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    vs {breakdown.previous.period_label}: &euro;
                    {centsToEurShort(breakdown.previous.total_spent_cents)} spent
                  </span>
                </div>
              )}
            </div>

            {/* Actual Spending */}
            <div className="rounded-md border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actual Spending
                  </h3>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    &euro;{centsToEur(summary.total_spent_cents)}
                  </div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ShoppingBag size={18} />
                </div>
              </div>
              {summary.total_budgeted_cents > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                    <span>{percentUsed}% of budget used</span>
                    <span className="text-primary">
                      &euro;{centsToEur(Math.max(0, summary.remaining_cents))} left
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${percentUsed > 100 ? "bg-[#dc2626]" : percentUsed > 90 ? "bg-[#ef4444]" : percentUsed > 70 ? "bg-[#f59e0b]" : "bg-primary"}`}
                      style={{ width: `${Math.min(percentUsed, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Savings Rate */}
            <div className="rounded-md border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Savings Rate
                  </h3>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {summary.savings_rate.toFixed(0)}
                    <span className="text-lg text-muted-foreground/40">%</span>
                  </div>
                </div>
                {/* Mini bar chart showing elapsed time */}
                <div className="flex h-10 items-end gap-1">
                  {[0.2, 0.4, 0.6, 0.8, 1].map((frac, i) => (
                    <div
                      key={i}
                      className={`w-2 rounded-sm ${
                        frac <= daysElapsed / Math.max(daysInPeriod, 1) ? "bg-primary" : "bg-muted"
                      }`}
                      style={{ height: `${frac * 100}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Target: 30%</span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                <span
                  className={`text-[10px] font-bold ${summary.savings_rate >= 30 ? "text-primary" : "text-[#f59e0b]"}`}
                >
                  {summary.savings_rate >= 30 ? "On Track" : "Below Target"}
                </span>
              </div>
            </div>

            {/* Income Coverage (only when income data exists) */}
            {incomeSummary?.income_vs_budget && (
              <Link
                href="/income"
                className="block rounded-md border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Income Coverage
                    </h3>
                    <div
                      className={`text-2xl font-bold tracking-tight ${
                        incomeSummary.income_vs_budget.status === "healthy"
                          ? "text-primary"
                          : incomeSummary.income_vs_budget.status === "tight"
                            ? "text-[#f59e0b]"
                            : "text-destructive"
                      }`}
                    >
                      {incomeSummary.income_vs_budget.coverage_percent.toFixed(0)}
                      <span className="text-lg text-muted-foreground/40">%</span>
                    </div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CurrencyEur size={18} />
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {incomeSummary.income_vs_budget.surplus_cents >= 0
                    ? `Surplus: €${centsToEur(incomeSummary.income_vs_budget.surplus_cents)}`
                    : `Deficit: €${centsToEur(Math.abs(incomeSummary.income_vs_budget.surplus_cents))}`}
                </div>
              </Link>
            )}
          </div>

          {/* Budget vs Actual + Zero-Based Budget */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Category progress bars (replaces static chart) */}
            <div className="rounded-md border border-border bg-card p-6 shadow-sm lg:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Budget vs Actual
                </h3>
                <div className="flex items-center gap-4 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted" />
                    <span className="text-muted-foreground">Budgeted</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="font-medium text-foreground">Spent</span>
                  </div>
                </div>
              </div>

              {!hasBudgets ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="mb-3 text-xs text-muted-foreground">
                    No budgets set yet. Set category limits to track spending.
                  </p>
                  <button
                    onClick={() => setEditorOpen(true)}
                    className="text-xs font-bold text-primary transition-colors hover:text-primary/80"
                  >
                    Set Budgets &rarr;
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {summary.categories.map((cat) => {
                    const pct = Math.min(cat.percent_used, 100);
                    return (
                      <div key={cat.category} className="flex items-center gap-4">
                        <span className="w-28 truncate text-xs font-medium text-foreground">
                          {cat.category}
                        </span>
                        <div className="flex-1">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${statusColor(cat.status)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex w-44 items-center justify-end gap-2">
                          <span className="text-[10px] font-medium text-foreground">
                            &euro;{centsToEurShort(cat.spent_cents)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">/</span>
                          <span className="text-[10px] text-muted-foreground">
                            &euro;{centsToEurShort(cat.budgeted_cents)}
                          </span>
                          <span
                            className={`ml-1 text-[10px] font-bold ${statusTextColor(cat.status)}`}
                          >
                            {cat.percent_used.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Unbudgeted + Uncategorized info */}
                  {(summary.unbudgeted_spent_cents > 0 ||
                    summary.uncategorized_spent_cents > 0) && (
                    <div className="mt-3 space-y-1 border-t border-border/50 pt-3">
                      {summary.unbudgeted_spent_cents > 0 && (
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Spending without budget</span>
                          <span>&euro;{centsToEur(summary.unbudgeted_spent_cents)}</span>
                        </div>
                      )}
                      {summary.uncategorized_spent_cents > 0 && (
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Uncategorized spending</span>
                          <span>&euro;{centsToEur(summary.uncategorized_spent_cents)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Zero-Based Budget Donut */}
            <div className="flex flex-col rounded-md border border-border bg-card p-6 shadow-sm lg:col-span-1">
              <h3 className="mb-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Zero-Based Budget
              </h3>
              <div className="flex flex-1 flex-col items-center justify-center">
                <DonutChart
                  categories={summary.categories}
                  remainingCents={summary.remaining_cents}
                />
              </div>
            </div>
          </div>

          {/* Smart Insights + Spending by Category */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Smart Insights */}
            <div className="rounded-md border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Sparkle size={18} className="text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Smart Insights
                </h3>
              </div>
              {insights.length === 0 ? (
                <p className="py-4 text-xs text-muted-foreground">
                  {hasBudgets
                    ? "No alerts right now. Your spending looks healthy!"
                    : "Set budgets to get personalized spending insights."}
                </p>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-md border border-border bg-muted p-3 transition-colors hover:border-primary/30"
                    >
                      <div
                        className={`mt-0.5 rounded-md p-1.5 ${
                          insight.type === "warning"
                            ? "bg-[#fef2f2] text-[#ef4444]"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {insight.type === "warning" ? <Warning size={14} /> : <TrendUp size={14} />}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-foreground">{insight.title}</h4>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                          {insight.body}
                        </p>
                      </div>
                      <CaretRight size={14} className="mt-1 text-muted-foreground/30" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Spending Categories */}
            <div className="rounded-md border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Top Spending
                  </h3>
                </div>
                {breakdown?.previous && (
                  <span className="text-[10px] text-muted-foreground">
                    vs {breakdown.previous.period_label}
                  </span>
                )}
              </div>
              <div className="space-y-0 divide-y divide-border/50">
                {(breakdown?.current.categories ?? []).slice(0, 5).map((cat) => {
                  const prevCat = breakdown?.previous?.categories.find(
                    (c) => c.category === cat.category
                  );
                  const diff =
                    prevCat && prevCat.spent_cents > 0
                      ? Math.round(
                          ((cat.spent_cents - prevCat.spent_cents) / prevCat.spent_cents) * 100
                        )
                      : null;
                  const color = CATEGORY_COLORS[cat.category] ?? "#6b7280";

                  return (
                    <div key={cat.category} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <span className="text-[10px] font-bold" style={{ color }}>
                            {cat.category.charAt(0)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">{cat.category}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {cat.transaction_count} transaction
                            {cat.transaction_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          &euro;{centsToEur(cat.spent_cents)}
                        </span>
                        {diff !== null && (
                          <span
                            className={`text-[10px] font-bold ${diff > 0 ? "text-[#ef4444]" : "text-primary"}`}
                          >
                            {diff > 0 ? "+" : ""}
                            {diff}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(!breakdown || breakdown.current.categories.length === 0) && (
                  <p className="py-4 text-xs text-muted-foreground">
                    No spending data for this period yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Budget Editor Modal */}
      <BudgetEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        currentLimits={summary?.categories ?? []}
        period={period}
      />
    </div>
  );
}
