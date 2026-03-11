"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ChartDonut,
  CircleNotch,
  CurrencyEur,
  Link as LinkIcon,
  ListBullets,
  Plus,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Warning,
  Clock,
} from "@phosphor-icons/react";
import { useDashboardSummary } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types for recent transactions
// ---------------------------------------------------------------------------

interface RecentTransaction {
  id: string;
  description: string | null;
  amount: number;
  currency: string;
  direction: string | null;
  transaction_date: string;
  source_name: string;
  provider_name: string;
}

interface TransactionsResponse {
  items: RecentTransaction[];
  total: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  BTC: "\u20bf",
  GBP: "\u00a3",
};

const PROVIDER_STYLES: Record<string, { bg: string; text: string }> = {
  WISE: { bg: "bg-[#9fe870]", text: "text-[#163300]" },
  KRAKEN: { bg: "bg-[#5741d9]", text: "text-white" },
  LEDGER: { bg: "bg-stone-800", text: "text-white" },
  REVOLUT: { bg: "bg-[#0075EB]", text: "text-white" },
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  ACTIVE: { icon: CheckCircle, color: "text-primary", label: "Connected" },
  PENDING: { icon: Clock, color: "text-muted-foreground", label: "Syncing" },
  ERROR: { icon: Warning, color: "text-destructive", label: "Error" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  if (currency === "BTC") return `${sym}${amount.toFixed(8)}`;
  return `${sym}${amount.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { summary, loading: summaryLoading } = useDashboardSummary();

  const [recentTxns, setRecentTxns] = useState<RecentTransaction[]>([]);
  const [txnsLoading, setTxnsLoading] = useState(true);

  // Fetch recent transactions (last 5)
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await api.get<TransactionsResponse>("/api/v1/transactions?page=1&limit=5");
        if (!cancelled) setRecentTxns(data.items);
      } catch {
        // Dashboard degrades gracefully
      } finally {
        if (!cancelled) setTxnsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const loading = summaryLoading || authLoading;
  const hasIntegrations = (summary?.integrations.length ?? 0) > 0;
  const hasProjects = (summary?.total_projects ?? 0) > 0;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1 text-2xl font-bold text-foreground">Financial Overview</h1>
        <p className="text-xs text-muted-foreground">
          {hasIntegrations
            ? `${summary!.integrations.length} integration${summary!.integrations.length !== 1 ? "s" : ""} connected`
            : "Connect your integrations to see live data"}
        </p>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* ── Net Worth ─────────────────────────────────────────── */}
        <div className="col-span-12 rounded-md border border-border bg-card p-6 shadow-sm lg:col-span-5">
          <div className="mb-4 flex items-center gap-2">
            <CurrencyEur size={16} className="text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total Net Worth
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <CircleNotch size={24} className="animate-spin text-primary" />
            </div>
          ) : hasIntegrations && summary ? (
            <div className="py-4">
              <p className="text-4xl font-bold tracking-tight text-foreground">
                {formatCurrency(summary.net_worth, summary.net_worth_currency)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Across {summary.integrations.length} connected source
                {summary.integrations.length !== 1 ? "s" : ""}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <p className="select-none text-5xl font-bold tracking-tight text-muted-foreground/40">
                &euro;&ndash;,&ndash;&ndash;&ndash;
              </p>
              <p className="max-w-[200px] text-xs leading-relaxed text-muted-foreground">
                Connect your financial integrations to calculate your net worth
              </p>
              <Link
                href="/integrations"
                className="flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
              >
                <LinkIcon size={12} weight="bold" />
                Connect Integration
              </Link>
            </div>
          )}
        </div>

        {/* ── Active Goals ──────────────────────────────────────── */}
        <div className="col-span-12 rounded-md border border-border bg-card p-6 shadow-sm lg:col-span-4">
          <div className="mb-4 flex items-center gap-2">
            <ArrowUpRight size={16} className="text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Active Goals
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <CircleNotch size={24} className="animate-spin text-primary" />
            </div>
          ) : hasProjects && summary ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{summary.total_projects}</span>
                <span className="text-xs text-muted-foreground">
                  project{summary.total_projects !== 1 ? "s" : ""}
                </span>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Average progress</span>
                  <span className="text-xs font-bold text-foreground">
                    {summary.average_progress}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${summary.average_progress}%` }}
                  />
                </div>
              </div>
              {/* Top projects */}
              <div className="mt-1 flex flex-col gap-2">
                {summary.active_projects.slice(0, 3).map((p) => (
                  <Link
                    key={p.id}
                    href={`/shared-projects/${p.id}`}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 transition-colors hover:border-primary/30"
                  >
                    <span className="truncate text-xs font-medium text-foreground">{p.name}</span>
                    <span className="ml-2 shrink-0 text-[10px] font-bold text-primary">
                      {p.progress_percent}%
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
                <ArrowUpRight size={20} className="text-muted-foreground/30" />
              </div>
              <p className="max-w-[160px] text-xs leading-relaxed text-muted-foreground">
                Create a shared project to start tracking your financial goals
              </p>
              <Link
                href="/shared-projects"
                className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
              >
                <Plus size={12} weight="bold" />
                New Shared Project
              </Link>
            </div>
          )}
        </div>

        {/* ── Allocation ────────────────────────────────────────── */}
        <div className="col-span-12 rounded-md border border-border bg-card p-6 shadow-sm lg:col-span-3">
          <div className="mb-4 flex items-center gap-2">
            <ChartDonut size={16} className="text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Allocation
            </span>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
              <ChartDonut size={20} className="text-muted-foreground/30" />
            </div>
            <p className="max-w-[160px] text-xs leading-relaxed text-muted-foreground">
              {hasIntegrations
                ? "Allocation chart coming soon"
                : "Connect integrations to see your asset allocation"}
            </p>
          </div>
        </div>

        {/* ── Connections ───────────────────────────────────────── */}
        <div className="col-span-12 rounded-md border border-border bg-card p-6 shadow-sm lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LinkIcon size={16} className="text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Connections
              </span>
            </div>
            {hasIntegrations && (
              <Link
                href="/integrations"
                className="text-[10px] font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Manage
              </Link>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {summary?.integrations.map((integration) => {
              const providerStyle = PROVIDER_STYLES[integration.provider_name] ?? {
                bg: "bg-muted",
                text: "text-foreground",
              };
              const statusConf = STATUS_CONFIG[integration.status] ?? STATUS_CONFIG.PENDING;
              const StatusIcon = statusConf.icon;

              return (
                <div
                  key={integration.provider_name}
                  className="flex items-center gap-3 rounded-md border border-border px-4 py-3"
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-md ${providerStyle.bg} ${providerStyle.text} text-xs font-bold shadow-sm`}
                  >
                    {integration.provider_name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {integration.provider_name.charAt(0) +
                      integration.provider_name.slice(1).toLowerCase()}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <StatusIcon size={12} className={statusConf.color} />
                    <span className={`text-[10px] font-medium ${statusConf.color}`}>
                      {statusConf.label}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Show "not connected" placeholders for missing providers */}
            {!loading &&
              ["WISE", "KRAKEN", "LEDGER"]
                .filter((p) => !summary?.integrations.some((i) => i.provider_name === p))
                .map((provider) => (
                  <div
                    key={provider}
                    className="flex items-center gap-3 rounded-md border border-dashed border-border px-4 py-3"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                      {provider[0]}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {provider.charAt(0) + provider.slice(1).toLowerCase()}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground/50">
                      Not connected
                    </span>
                  </div>
                ))}

            <Link
              href="/integrations"
              className="flex items-center justify-center gap-2 rounded-md border border-dashed border-primary/30 px-4 py-3 text-xs font-semibold text-primary transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <Plus size={12} weight="bold" />
              Connect New Account
            </Link>
          </div>
        </div>

        {/* ── Recent Activity ───────────────────────────────────── */}
        <div className="col-span-12 rounded-md border border-border bg-card p-6 shadow-sm lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListBullets size={16} className="text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recent Activity
              </span>
            </div>
            {recentTxns.length > 0 && (
              <Link
                href="/transactions"
                className="text-[10px] font-semibold text-primary transition-colors hover:text-primary/80"
              >
                View All
              </Link>
            )}
          </div>

          {txnsLoading ? (
            <div className="flex items-center justify-center py-8">
              <CircleNotch size={24} className="animate-spin text-primary" />
            </div>
          ) : recentTxns.length > 0 ? (
            <div className="flex flex-col divide-y divide-border">
              {recentTxns.map((txn) => {
                const isInflow = txn.direction === "IN" || txn.amount > 0;
                return (
                  <div key={txn.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                        isInflow ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      {isInflow ? (
                        <ArrowDown size={14} className="text-primary" />
                      ) : (
                        <ArrowUp size={14} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {txn.description ?? "Transaction"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {txn.source_name} &middot; {formatDate(txn.transaction_date)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-bold ${
                        isInflow ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {isInflow ? "+" : ""}
                      {formatCurrency(Math.abs(txn.amount), txn.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
                <ListBullets size={20} className="text-muted-foreground/30" />
              </div>
              <p className="max-w-[200px] text-xs leading-relaxed text-muted-foreground">
                Transactions will appear here once your integrations are connected
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
