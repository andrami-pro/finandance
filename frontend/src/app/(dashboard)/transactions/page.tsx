"use client";

import {
  ArrowDown,
  ArrowUp,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  Download,
  EyeSlash,
  Funnel,
  Hourglass,
  MagnifyingGlass,
  Receipt,
  TrendUp,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { CATEGORIES, CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "@/lib/categories";

/* ------------------------------------------------------------------ */
/*  Types (matches backend TransactionsResponse)                       */
/* ------------------------------------------------------------------ */

interface TransactionItem {
  id: string;
  funding_source_id: string;
  external_transaction_id: string | null;
  amount: string;
  currency: string;
  direction: "IN" | "OUT" | null;
  description: string | null;
  category: string | null;
  notes: string | null;
  transaction_date: string;
  is_split: boolean;
  split_with_user_id: string | null;
  split_amount: string | null;
  source_name: string;
  provider_name: "WISE" | "KRAKEN" | "LEDGER" | string;
  client_id: string | null;
  client_name: string | null;
}

interface TransactionSummary {
  total_inflows: string;
  total_outflows: string;
  net_cashflow: string;
  currency: string;
}

interface TransactionsResponse {
  items: TransactionItem[];
  summary: TransactionSummary;
  page: number;
  limit: number;
  total: number;
}

/* ------------------------------------------------------------------ */
/*  Period helpers                                                      */
/* ------------------------------------------------------------------ */

type PeriodKey = "this_month" | "last_month" | "quarter" | "last_year" | "custom";

interface PeriodDef {
  label: string;
  key: PeriodKey;
}

const PERIODS: PeriodDef[] = [
  { label: "This Month", key: "this_month" },
  { label: "Last Month", key: "last_month" },
  { label: "Quarter", key: "quarter" },
  { label: "Last Year", key: "last_year" },
  { label: "Custom", key: "custom" },
];

function getDateRange(key: PeriodKey): { since: string; until: string } | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  switch (key) {
    case "this_month": {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59);
      return { since: start.toISOString(), until: end.toISOString() };
    }
    case "last_month": {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);
      return { since: start.toISOString(), until: end.toISOString() };
    }
    case "quarter": {
      const qStart = m - (m % 3);
      const start = new Date(y, qStart, 1);
      const end = new Date(y, qStart + 3, 0, 23, 59, 59);
      return { since: start.toISOString(), until: end.toISOString() };
    }
    case "last_year": {
      const start = new Date(y - 1, 0, 1);
      const end = new Date(y - 1, 11, 31, 23, 59, 59);
      return { since: start.toISOString(), until: end.toISOString() };
    }
    case "custom":
      return null; // handled by custom inputs
  }
}

function formatPeriodLabel(key: PeriodKey): string {
  const now = new Date();
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  switch (key) {
    case "this_month":
      return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    case "last_month": {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `${monthNames[prev.getMonth()]} ${prev.getFullYear()}`;
    }
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3) + 1;
      return `Q${q} ${now.getFullYear()}`;
    }
    case "last_year":
      return `${now.getFullYear() - 1}`;
    case "custom":
      return "Custom Range";
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const PROVIDER_STYLE: Record<string, { bg: string; color: string; letter: string }> = {
  WISE: { bg: "bg-[#9fe870]", color: "text-[#163300]", letter: "W" },
  KRAKEN: { bg: "bg-[#5741d9]", color: "text-white", letter: "K" },
  LEDGER: { bg: "bg-[#1c1c1c]", color: "text-white", letter: "L" },
};

function formatEur(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "\u20AC0.00";
  const abs = Math.abs(num);
  return abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAmount(amount: string, currency: string, direction: "IN" | "OUT" | null): string {
  const symbol = currency === "EUR" ? "\u20AC" : `${currency} `;
  // Use direction column as primary signal; fall back to amount sign
  const isInflow = direction ? direction === "IN" : parseFloat(amount) >= 0;
  const sign = isInflow ? "+" : "-";
  return `${sign}${symbol}${formatEur(amount)}`;
}

function txIsIncome(tx: TransactionItem): boolean {
  // Use direction column as primary signal; fall back to amount sign
  if (tx.direction) return tx.direction === "IN";
  return parseFloat(tx.amount) >= 0;
}

/* ------------------------------------------------------------------ */
/*  Detail panel                                                       */
/* ------------------------------------------------------------------ */

function TransactionDetailPanel({
  tx,
  onClose,
  onUpdated,
}: {
  tx: TransactionItem;
  onClose: () => void;
  onUpdated: (updated: TransactionItem) => void;
}) {
  const provStyle = PROVIDER_STYLE[tx.provider_name] ?? PROVIDER_STYLE.WISE;
  const income = txIsIncome(tx);

  const [category, setCategory] = useState(tx.category || "Uncategorized");
  const [notes, setNotes] = useState(tx.notes || "");
  const [catOpen, setCatOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset local state when tx changes
  useEffect(() => {
    setCategory(tx.category || "Uncategorized");
    setNotes(tx.notes || "");
    setCatOpen(false);
  }, [tx.id, tx.category, tx.notes]);

  const hasChanges = category !== (tx.category || "Uncategorized") || notes !== (tx.notes || "");

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const catValue = category === "Uncategorized" ? null : category;
      const updated = await api.patch<TransactionItem>(`/api/v1/transactions/${tx.id}`, {
        category: catValue,
        notes: notes || null,
      });
      onUpdated(updated);
    } catch {
      // TODO: toast error
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-[30%] min-w-[400px] flex-col border-l border-border bg-card shadow-sm">
        {/* Close button */}
        <div className="flex justify-end p-6">
          <button
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {/* Provider icon + description */}
          <div className="mb-8 flex flex-col items-center gap-4">
            <div
              className={`h-16 w-16 rounded-full ${provStyle.bg} flex items-center justify-center shadow-sm`}
            >
              <span className={`text-xl font-bold ${provStyle.color}`}>{provStyle.letter}</span>
            </div>
            <h2 className="text-center text-lg font-bold tracking-tight text-foreground">
              {tx.description || "No description"}
            </h2>
          </div>

          {/* Amount + date */}
          <div className="mb-10 flex flex-col items-center gap-1 border-b border-border/50 pb-8">
            <span
              className={`text-4xl font-bold tracking-tight ${income ? "text-primary" : "text-foreground"}`}
            >
              {formatAmount(tx.amount, tx.currency, tx.direction)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {new Date(tx.transaction_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Details grid */}
          <div className="mb-8 flex flex-col gap-6">
            {/* Status */}
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </span>
              <div className="flex">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-bold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Cleared
                </span>
              </div>
            </div>

            {/* Source */}
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Source
              </span>
              <span className="text-sm font-medium text-foreground">{tx.source_name}</span>
            </div>

            {/* Category dropdown */}
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Category
              </span>
              <div className="relative">
                <button
                  onClick={() => setCatOpen(!catOpen)}
                  className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-xs font-medium shadow-sm transition-colors hover:border-primary/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    {category}
                  </div>
                  <CaretDown
                    size={14}
                    className={`text-muted-foreground transition-transform ${catOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {catOpen && (
                  <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-border bg-card shadow-sm">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setCategory(cat);
                          setCatOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted ${
                          category === cat ? "bg-primary/5 text-primary" : "text-foreground"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            category === cat ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                        />
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Shared expense */}
          <div className="mb-8 rounded-md border border-border bg-muted/50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wide text-foreground">
                  Shared Expense?
                </span>
                <span className="text-[10px] text-muted-foreground">Split transaction equally</span>
              </div>
              <button
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  tx.is_split ? "bg-primary" : "bg-border"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-card transition-transform ${
                    tx.is_split ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>
            {tx.is_split && (
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary ring-2 ring-card">
                      You
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-card ring-1 ring-border">
                      <Check size={8} className="text-primary" />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    {tx.split_amount
                      ? `\u20AC${formatEur(tx.split_amount)}`
                      : `\u20AC${formatEur(String(Math.abs(parseFloat(tx.amount)) / 2))}`}
                  </span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-bold text-muted-foreground ring-2 ring-card">
                      ?
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-card ring-1 ring-border">
                      <Hourglass size={8} className="text-muted-foreground/40" />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    {tx.split_amount
                      ? `\u20AC${formatEur(tx.split_amount)}`
                      : `\u20AC${formatEur(String(Math.abs(parseFloat(tx.amount)) / 2))}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] w-full resize-none rounded-md border border-border bg-muted p-3 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Add a note or #tag..."
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <button className="flex items-center gap-2 rounded-md px-4 py-2.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/5">
              <EyeSlash size={14} />
              Exclude from Budget
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs font-bold shadow-sm transition-all ${
                hasChanges && !saving
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "cursor-not-allowed bg-muted text-muted-foreground"
              }`}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const LIMIT = 20;

export default function TransactionsPage() {
  const { loading: authLoading } = useAuth();
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catDropdownPos, setCatDropdownPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const openCatDropdown = (txId: string, buttonEl: HTMLButtonElement) => {
    if (editingCatId === txId) {
      setEditingCatId(null);
      return;
    }
    const rect = buttonEl.getBoundingClientRect();
    setCatDropdownPos({ top: rect.bottom + 4, left: rect.left });
    setEditingCatId(txId);
  };

  const handleInlineCategoryChange = async (txId: string, newCat: string) => {
    setEditingCatId(null);
    const catValue = newCat === "Uncategorized" ? null : newCat;
    try {
      const updated = await api.patch<TransactionItem>(`/api/v1/transactions/${txId}`, {
        category: catValue,
      });
      setData((prev) =>
        prev ? { ...prev, items: prev.items.map((t) => (t.id === updated.id ? updated : t)) } : prev
      );
      if (selectedTx?.id === txId) setSelectedTx(updated);
    } catch {
      // TODO: toast
    }
  };

  // Period filter state
  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [customSince, setCustomSince] = useState("");
  const [customUntil, setCustomUntil] = useState("");

  // Compute since/until from period selection
  const dateRange = useMemo(() => {
    if (period === "custom") {
      if (customSince && customUntil) {
        return {
          since: new Date(customSince).toISOString(),
          until: new Date(`${customUntil}T23:59:59`).toISOString(),
        };
      }
      if (customSince) {
        return { since: new Date(customSince).toISOString(), until: "" };
      }
      if (customUntil) {
        return { since: "", until: new Date(`${customUntil}T23:59:59`).toISOString() };
      }
      return null;
    }
    return getDateRange(period);
  }, [period, customSince, customUntil]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (dateRange?.since) params.set("since", dateRange.since);
      if (dateRange?.until) params.set("until", dateRange.until);

      const res = await api.get<TransactionsResponse>(`/api/v1/transactions?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [page, dateRange]);

  useEffect(() => {
    if (!authLoading) {
      setLoading(true);
      loadData();
    }
  }, [authLoading, loadData]);

  // Reset to page 1 when period changes
  const handlePeriodChange = (key: PeriodKey) => {
    setPeriod(key);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;
  const summary = data?.summary;

  return (
    <>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Global Transactions
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatPeriodLabel(period)} Overview
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="group relative">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  className="w-64 rounded-md border border-border bg-card py-2 pl-9 pr-4 text-xs font-medium text-foreground placeholder-muted-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Filter transactions..."
                  type="text"
                />
              </div>
              <button className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-primary">
                <Funnel size={14} />
                Filter
              </button>
              <button className="flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background shadow-sm transition-colors hover:bg-foreground/90">
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>

          {/* Period selector pills */}
          <div className="flex flex-wrap items-center gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => handlePeriodChange(p.key)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p.key
                    ? "border-foreground bg-foreground text-background shadow-sm"
                    : "border-border bg-card text-foreground hover:border-primary/30 hover:text-primary"
                }`}
              >
                {p.label}
              </button>
            ))}

            {/* Custom date pickers (inline, shown when custom is selected) */}
            {period === "custom" && (
              <div className="ml-2 flex items-center gap-2">
                <div className="relative">
                  <CalendarBlank
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="date"
                    value={customSince}
                    onChange={(e) => {
                      setCustomSince(e.target.value);
                      setPage(1);
                    }}
                    className="w-[140px] rounded-md border border-border bg-card py-1.5 pl-8 pr-3 text-xs font-medium text-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <span className="text-xs text-muted-foreground">&ndash;</span>
                <div className="relative">
                  <CalendarBlank
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="date"
                    value={customUntil}
                    onChange={(e) => {
                      setCustomUntil(e.target.value);
                      setPage(1);
                    }}
                    className="w-[140px] rounded-md border border-border bg-card py-1.5 pl-8 pr-3 text-xs font-medium text-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Total Inflows */}
          <div className="flex flex-col justify-between rounded-md border border-border bg-card p-5 shadow-sm">
            <div className="mb-2 flex items-start justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Inflows
              </span>
              <ArrowDown size={18} className="text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                &euro;{summary ? formatEur(summary.total_inflows) : "0.00"}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {formatPeriodLabel(period)}
              </div>
            </div>
          </div>

          {/* Total Outflows */}
          <div className="flex flex-col justify-between rounded-md border border-border bg-card p-5 shadow-sm">
            <div className="mb-2 flex items-start justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Outflows
              </span>
              <ArrowUp size={18} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                -&euro;
                {summary ? formatEur(String(Math.abs(parseFloat(summary.total_outflows)))) : "0.00"}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {formatPeriodLabel(period)}
              </div>
            </div>
          </div>

          {/* Net Cashflow */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-md border border-border bg-card p-5 shadow-sm">
            <div className="pointer-events-none absolute right-0 top-0 p-6 opacity-5">
              <TrendUp size={64} className="text-primary" />
            </div>
            <div className="relative z-[1] mb-2 flex items-start justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Net Cashflow
              </span>
            </div>
            <div className="relative z-[1] flex items-center gap-2">
              <div className="text-2xl font-bold text-foreground">
                {summary
                  ? `${parseFloat(summary.net_cashflow) >= 0 ? "+" : "-"}\u20AC${formatEur(summary.net_cashflow)}`
                  : "\u20AC0.00"}
              </div>
              {summary && parseFloat(summary.net_cashflow) >= 0 && (
                <TrendUp size={22} className="text-primary" />
              )}
            </div>
          </div>
        </div>

        {/* Main content: loading / error / empty / table */}
        {loading ? (
          <div className="rounded-md border border-border bg-card p-16 text-center text-muted-foreground shadow-sm">
            Loading transactions&hellip;
          </div>
        ) : error ? (
          <div className="rounded-md border border-border bg-card p-16 text-center shadow-sm">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <button
              onClick={loadData}
              className="mt-4 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Try again
            </button>
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Receipt size={28} className="text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-foreground">No transactions found</h3>
            <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
              {period === "custom"
                ? "No transactions match the selected date range. Try adjusting the dates."
                : `No transactions for ${formatPeriodLabel(period)}. Try selecting a different period.`}
            </p>
          </div>
        ) : data ? (
          <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-6 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Transactions &middot; {formatPeriodLabel(period)}
              </h3>
              <span className="text-[10px] font-medium text-muted-foreground">
                Showing {(page - 1) * LIMIT + 1}-{Math.min(page * LIMIT, data.total)} of{" "}
                {data.total}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-muted/30 text-[10px] font-medium uppercase text-muted-foreground">
                  <tr>
                    <th className="w-32 border-b border-border/50 px-6 py-3 font-medium">Date</th>
                    <th className="border-b border-border/50 px-6 py-3 font-medium">Description</th>
                    <th className="border-b border-border/50 px-6 py-3 font-medium">Category</th>
                    <th className="border-b border-border/50 px-6 py-3 font-medium">
                      Source Account
                    </th>
                    <th className="border-b border-border/50 px-6 py-3 text-right font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-xs">
                  {data.items.map((tx) => {
                    const provStyle = PROVIDER_STYLE[tx.provider_name] ?? PROVIDER_STYLE.WISE;
                    const catStyle = CATEGORY_STYLES[tx.category ?? ""] ?? DEFAULT_CATEGORY_STYLE;
                    const income = txIsIncome(tx);

                    return (
                      <tr
                        key={tx.id}
                        className="group cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => setSelectedTx(tx)}
                      >
                        <td className="px-6 py-4 text-muted-foreground">
                          {new Date(tx.transaction_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-8 w-8 rounded-full ${provStyle.bg} flex items-center justify-center ${provStyle.color} transition-all group-hover:shadow-sm`}
                            >
                              <span className="text-xs font-bold">{provStyle.letter}</span>
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">
                                  {tx.description || "No description"}
                                </span>
                                {tx.client_name && tx.direction === "IN" && (
                                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0 text-[9px] font-bold text-primary">
                                    {tx.client_name}
                                  </span>
                                )}
                              </div>
                              {tx.notes && (
                                <span className="max-w-[300px] truncate text-[10px] text-muted-foreground">
                                  {tx.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCatDropdown(tx.id, e.currentTarget);
                            }}
                            className={`inline-flex cursor-pointer items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-all hover:ring-1 hover:ring-primary/30 ${catStyle}`}
                          >
                            {tx.category || "Uncategorized"}
                            <CaretDown size={10} className="ml-1 opacity-50" />
                          </button>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{tx.source_name}</td>
                        <td
                          className={`px-6 py-4 text-right font-bold ${income ? "text-primary" : "text-foreground"}`}
                        >
                          {formatAmount(tx.amount, tx.currency, tx.direction)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-6 py-4">
                <button
                  className={`flex items-center gap-1 text-xs font-medium ${
                    page <= 1
                      ? "cursor-not-allowed text-muted-foreground opacity-50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <CaretLeft size={12} />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium ${
                          pageNum === page
                            ? "border border-primary/20 bg-primary/10 font-bold text-primary"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && page < totalPages - 2 && (
                    <>
                      <span className="px-1 text-xs text-muted-foreground">&hellip;</span>
                      <button
                        onClick={() => setPage(totalPages)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium text-muted-foreground hover:bg-muted"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                <button
                  className={`flex items-center gap-1 text-xs font-medium ${
                    page >= totalPages
                      ? "cursor-not-allowed text-muted-foreground opacity-50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <CaretRight size={12} />
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Inline category dropdown (rendered at page level to escape overflow) */}
      {editingCatId && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setEditingCatId(null)} />
          <div
            className="fixed z-50 max-h-52 w-44 overflow-y-auto rounded-md border border-border bg-card shadow-sm"
            style={{ top: catDropdownPos.top, left: catDropdownPos.left }}
          >
            {CATEGORIES.map((cat) => {
              const editingTx = data?.items.find((t) => t.id === editingCatId);
              const isActive = (editingTx?.category || "Uncategorized") === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleInlineCategoryChange(editingCatId, cat)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted ${
                    isActive ? "bg-primary/5 text-primary" : "text-foreground"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isActive ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  />
                  {cat}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Detail panel */}
      {selectedTx && (
        <TransactionDetailPanel
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onUpdated={(updated) => {
            // Update in the list
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    items: prev.items.map((t) => (t.id === updated.id ? updated : t)),
                  }
                : prev
            );
            setSelectedTx(updated);
          }}
        />
      )}
    </>
  );
}
