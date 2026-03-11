"use client";

import {
  CaretRight,
  CheckCircle,
  Clock,
  CurrencyEur,
  LinkSimple,
  Plus,
  Sparkle,
  Warning,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { useCallback, useMemo, useState } from "react";

import { useClients, useClientMutations } from "@/hooks/useClients";
import { useIncomeSummary, useUnmatchedTransactions, useIncomeMutations } from "@/hooks/useIncome";
import type {
  Client,
  ClientCreate,
  ClientIncomeSummary,
  IncomeStatus,
  PaymentFrequency,
  UnmatchedTransaction,
} from "@/types/income";

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

const STATUS_CONFIG: Record<
  IncomeStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  received: { label: "Received", color: "text-primary", icon: CheckCircle },
  pending: { label: "Pending", color: "text-muted-foreground", icon: Clock },
  partial: { label: "Partial", color: "text-[#f59e0b]", icon: Warning },
  overdue: { label: "Overdue", color: "text-destructive", icon: XCircle },
};

const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: "Monthly",
  biweekly: "Biweekly",
  weekly: "Weekly",
  one_time: "One-time",
};

/* ------------------------------------------------------------------ */
/*  Summary Card                                                       */
/* ------------------------------------------------------------------ */

function SummaryCard({
  title,
  value,
  subtitle,
  colorClass,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  colorClass?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h3>
          <div className={`text-2xl font-bold tracking-tight ${colorClass ?? "text-foreground"}`}>
            {value}
          </div>
        </div>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${colorClass ? "bg-current/10" : "bg-muted"}`}
        >
          <Icon size={18} className={colorClass ?? "text-muted-foreground"} />
        </div>
      </div>
      {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Income vs Budget Bar                                               */
/* ------------------------------------------------------------------ */

function IncomeVsBudgetCard({
  expectedCents,
  budgetedCents,
  coveragePercent,
  surplusCents,
  status,
}: {
  expectedCents: number;
  budgetedCents: number;
  coveragePercent: number;
  surplusCents: number;
  status: string;
}) {
  const barColor =
    status === "healthy" ? "bg-primary" : status === "tight" ? "bg-[#f59e0b]" : "bg-destructive";
  const textColor =
    status === "healthy"
      ? "text-primary"
      : status === "tight"
        ? "text-[#f59e0b]"
        : "text-destructive";

  return (
    <div className="rounded-md border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Sparkle size={18} className="text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Income vs Budget
        </h3>
      </div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Expected:{" "}
          <span className="font-bold text-foreground">&euro;{centsToEur(expectedCents)}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Budget:{" "}
          <span className="font-bold text-foreground">&euro;{centsToEur(budgetedCents)}</span>
        </div>
      </div>
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(coveragePercent, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold ${textColor}`}>
          {coveragePercent.toFixed(0)}% coverage
        </span>
        <span className={`text-xs font-bold ${textColor}`}>
          {surplusCents >= 0 ? "Surplus" : "Deficit"}: &euro;{centsToEur(Math.abs(surplusCents))}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Client Row                                                         */
/* ------------------------------------------------------------------ */

function ClientRow({
  client,
  onMatchPayment,
  onEdit,
}: {
  client: ClientIncomeSummary;
  onMatchPayment: () => void;
  onEdit: () => void;
}) {
  const config = STATUS_CONFIG[client.status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-4 border-b border-border/50 py-3 last:border-0">
      <StatusIcon size={20} weight="fill" className={config.color} />
      <div className="min-w-0 flex-1">
        <button
          onClick={onEdit}
          className="block truncate text-xs font-bold text-foreground transition-colors hover:text-primary"
        >
          {client.client_name}
        </button>
        <span className="text-[10px] text-muted-foreground">Due day {client.expected_day}</span>
      </div>
      <div className="text-right">
        <div className="text-xs font-bold text-foreground">
          &euro;{centsToEur(client.expected_amount_cents)}
        </div>
        {client.received_amount_cents > 0 && client.status !== "received" && (
          <div className="text-[10px] text-muted-foreground">
            received &euro;{centsToEur(client.received_amount_cents)}
          </div>
        )}
      </div>
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
          client.status === "received"
            ? "border-primary/30 bg-primary/10 text-primary"
            : client.status === "pending"
              ? "border-border bg-muted text-muted-foreground"
              : client.status === "partial"
                ? "border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b]"
                : "border-destructive/30 bg-destructive/10 text-destructive"
        }`}
      >
        {config.label}
      </span>
      {client.status !== "received" && (
        <button
          onClick={onMatchPayment}
          className="flex items-center gap-1.5 whitespace-nowrap text-[10px] font-bold text-primary transition-colors hover:text-primary/80"
        >
          <LinkSimple size={12} />
          Match
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Match Payment Drawer                                               */
/* ------------------------------------------------------------------ */

function MatchPaymentDrawer({
  open,
  onClose,
  client,
  transactions,
  loading,
  onLink,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  client: ClientIncomeSummary | null;
  transactions: UnmatchedTransaction[];
  loading: boolean;
  onLink: (txnId: string, amountCents: number) => void;
  saving: boolean;
}) {
  if (!open || !client) return null;

  const toleranceLow = client.expected_amount_cents * 0.95;
  const toleranceHigh = client.expected_amount_cents * 1.05;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Match Payment</h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {client.client_name} — expected &euro;{centsToEur(client.expected_amount_cents)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Transaction list */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading transactions&hellip;
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No unmatched income transactions this period.
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((txn) => {
                const isCloseMatch =
                  txn.amount_cents >= toleranceLow && txn.amount_cents <= toleranceHigh;
                return (
                  <button
                    key={txn.id}
                    disabled={saving}
                    onClick={() => onLink(txn.id, txn.amount_cents)}
                    className={`w-full rounded-md border p-4 text-left transition-colors ${
                      isCloseMatch
                        ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                        : "border-border bg-muted hover:bg-muted/80"
                    } disabled:opacity-50`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="mr-2 truncate text-xs font-bold text-foreground">
                        {txn.description ?? "Income transaction"}
                      </span>
                      <span className="whitespace-nowrap text-xs font-bold text-foreground">
                        &euro;{centsToEur(txn.amount_cents)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {txn.transaction_date && (
                        <span>{new Date(txn.transaction_date).toLocaleDateString()}</span>
                      )}
                      {txn.source_name && <span>&middot; {txn.source_name}</span>}
                      {isCloseMatch && (
                        <span className="ml-auto font-bold text-primary">Close match</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Client Modal (Add / Edit)                                          */
/* ------------------------------------------------------------------ */

function ClientModal({
  open,
  onClose,
  editClient,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  editClient: Client | null;
  onSave: (data: ClientCreate) => Promise<void>;
  saving: boolean;
}) {
  const [name, setName] = useState(editClient?.name ?? "");
  const [amountEur, setAmountEur] = useState(
    editClient ? (editClient.expected_amount_cents / 100).toString() : ""
  );
  const [frequency, setFrequency] = useState<PaymentFrequency>(
    editClient?.payment_frequency ?? "monthly"
  );
  const [expectedDay, setExpectedDay] = useState(editClient?.expected_day?.toString() ?? "1");
  const [notes, setNotes] = useState(editClient?.notes ?? "");

  // Reset when modal opens with different client
  const [lastEditId, setLastEditId] = useState<string | null>(null);
  const currentEditId = editClient?.id ?? null;
  if (open && currentEditId !== lastEditId) {
    setName(editClient?.name ?? "");
    setAmountEur(editClient ? (editClient.expected_amount_cents / 100).toString() : "");
    setFrequency(editClient?.payment_frequency ?? "monthly");
    setExpectedDay(editClient?.expected_day?.toString() ?? "1");
    setNotes(editClient?.notes ?? "");
    setLastEditId(currentEditId);
  }
  if (!open && lastEditId !== null) {
    setLastEditId(null);
  }

  const handleSubmit = async () => {
    const cents = Math.round(parseFloat(amountEur || "0") * 100);
    await onSave({
      name: name.trim(),
      expected_amount_cents: cents,
      payment_frequency: frequency,
      expected_day: parseInt(expectedDay) || 1,
      notes: notes.trim() || null,
    });
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-md border border-border bg-card shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {editClient ? "Edit Client" : "Add Client"}
              </h2>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {editClient ? "Update client details" : "Add a new freelance client"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4 p-6">
            <div>
              <label className="mb-1 block text-xs font-bold text-foreground">Client Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full rounded-md border border-border bg-muted px-3 py-2 text-xs font-medium text-foreground placeholder-muted-foreground/50 focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-foreground">
                Expected Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  &euro;
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountEur}
                  onChange={(e) => setAmountEur(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-border bg-muted py-2 pl-7 pr-3 text-xs font-medium text-foreground placeholder-muted-foreground/50 focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as PaymentFrequency)}
                  className="w-full rounded-md border border-border bg-muted px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {(Object.entries(FREQUENCY_LABELS) as [PaymentFrequency, string][]).map(
                    ([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">Expected Day</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={expectedDay}
                  onChange={(e) => setExpectedDay(e.target.value)}
                  className="w-full rounded-md border border-border bg-muted px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-foreground">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
                className="w-full resize-none rounded-md border border-border bg-muted px-3 py-2 text-xs font-medium text-foreground placeholder-muted-foreground/50 focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
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
              onClick={handleSubmit}
              disabled={saving || !name.trim()}
              className="rounded-md bg-primary px-6 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : editClient ? "Update Client" : "Add Client"}
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

export default function IncomePage() {
  const { summary, loading, error } = useIncomeSummary();
  const { clients } = useClients();
  const { data: unmatchedData, loading: unmatchedLoading } = useUnmatchedTransactions();
  const { createClient, updateClient, saving: clientSaving } = useClientMutations();
  const { linkTransaction, generateExpected, saving: incomeSaving } = useIncomeMutations();

  // UI state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [matchingClient, setMatchingClient] = useState<ClientIncomeSummary | null>(null);

  const hasClients = summary && summary.clients.length > 0;
  const hasOverdue = summary ? summary.total_overdue_cents > 0 : false;

  const overdueCount = useMemo(() => {
    if (!summary) return 0;
    return summary.clients.filter((c) => c.status === "overdue").length;
  }, [summary]);

  const handleOpenModal = useCallback((client?: Client) => {
    setEditingClient(client ?? null);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingClient(null);
  }, []);

  const handleSaveClient = useCallback(
    async (data: ClientCreate) => {
      if (editingClient) {
        await updateClient(editingClient.id, data);
      } else {
        await createClient(data);
      }
      handleCloseModal();
      // Auto-generate expected incomes after creating a client
      if (!editingClient) {
        try {
          await generateExpected();
        } catch {
          // Non-critical; summary will refresh
        }
      }
    },
    [editingClient, createClient, updateClient, generateExpected, handleCloseModal]
  );

  const handleOpenDrawer = useCallback((client: ClientIncomeSummary) => {
    setMatchingClient(client);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setMatchingClient(null);
  }, []);

  const handleLink = useCallback(
    async (txnId: string, amountCents: number) => {
      if (!matchingClient) return;
      try {
        await linkTransaction(matchingClient.expected_income_id, txnId, amountCents);
        handleCloseDrawer();
      } catch {
        // Error shown via hook state
      }
    },
    [matchingClient, linkTransaction, handleCloseDrawer]
  );

  const findClientById = useCallback(
    (clientId: string): Client | undefined => {
      return clients.find((c) => c.id === clientId);
    },
    [clients]
  );

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
            Freelance Income
          </h1>
          <p className="text-xs text-muted-foreground">
            {summary?.period_label ?? "..."} Overview
            {overdueCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 font-bold text-destructive">
                <Warning size={12} />
                {overdueCount} overdue
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus size={14} weight="bold" />
            Add Client
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && !summary && (
        <div className="rounded-md border border-border bg-card p-16 text-center text-muted-foreground shadow-sm">
          Loading income data&hellip;
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
            className={`mb-6 grid grid-cols-1 gap-6 ${hasOverdue ? "md:grid-cols-4" : "md:grid-cols-3"}`}
          >
            <SummaryCard
              title="Expected Income"
              value={`€${centsToEur(summary.total_expected_cents)}`}
              icon={CurrencyEur}
            />
            <SummaryCard
              title="Received"
              value={`€${centsToEur(summary.total_received_cents)}`}
              subtitle={
                summary.total_expected_cents > 0
                  ? `${((summary.total_received_cents / summary.total_expected_cents) * 100).toFixed(0)}% of expected`
                  : undefined
              }
              colorClass="text-primary"
              icon={CheckCircle}
            />
            <SummaryCard
              title="Pending"
              value={`€${centsToEur(summary.total_pending_cents)}`}
              icon={Clock}
            />
            {hasOverdue && (
              <SummaryCard
                title="Overdue"
                value={`€${centsToEur(summary.total_overdue_cents)}`}
                colorClass="text-destructive"
                icon={XCircle}
              />
            )}
          </div>

          {/* Income vs Budget */}
          {summary.income_vs_budget && (
            <div className="mb-6">
              <IncomeVsBudgetCard
                expectedCents={summary.total_expected_cents}
                budgetedCents={summary.income_vs_budget.total_budgeted_cents}
                coveragePercent={summary.income_vs_budget.coverage_percent}
                surplusCents={summary.income_vs_budget.surplus_cents}
                status={summary.income_vs_budget.status}
              />
            </div>
          )}

          {/* Client list */}
          <div className="mb-6 rounded-md border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Clients
              </h3>
              {!hasClients && clients.length > 0 && (
                <button
                  onClick={() => generateExpected()}
                  disabled={incomeSaving}
                  className="text-[10px] font-bold text-primary transition-colors hover:text-primary/80"
                >
                  Generate Expected Incomes &rarr;
                </button>
              )}
            </div>

            {!hasClients && clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CurrencyEur size={32} className="mb-3 text-muted-foreground/30" />
                <p className="mb-3 text-xs text-muted-foreground">
                  No clients yet. Add your first client to start tracking income.
                </p>
                <button
                  onClick={() => handleOpenModal()}
                  className="text-xs font-bold text-primary transition-colors hover:text-primary/80"
                >
                  Add Your First Client &rarr;
                </button>
              </div>
            ) : !hasClients && clients.length > 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="mb-3 text-xs text-muted-foreground">
                  You have {clients.length} client{clients.length > 1 ? "s" : ""} but no expected
                  incomes for this period.
                </p>
                <button
                  onClick={() => generateExpected()}
                  disabled={incomeSaving}
                  className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {incomeSaving ? "Generating..." : "Generate Expected Incomes"}
                </button>
              </div>
            ) : (
              <div>
                {summary.clients.map((clientSummary) => (
                  <ClientRow
                    key={clientSummary.client_id}
                    client={clientSummary}
                    onMatchPayment={() => handleOpenDrawer(clientSummary)}
                    onEdit={() => {
                      const full = findClientById(clientSummary.client_id);
                      if (full) handleOpenModal(full);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Unmatched income */}
          {unmatchedData && unmatchedData.total > 0 && (
            <div className="rounded-md border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LinkSimple size={18} className="text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Unmatched Income
                  </h3>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {unmatchedData.total} transaction{unmatchedData.total !== 1 ? "s" : ""} &middot;
                  &euro;{centsToEur(summary.unlinked_income_cents)}
                </span>
              </div>
              <div className="space-y-0 divide-y divide-border/50">
                {unmatchedData.transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <CaretRight size={12} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate text-xs font-bold text-foreground">
                          {txn.description ?? "Income transaction"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {txn.transaction_date &&
                            new Date(txn.transaction_date).toLocaleDateString()}
                          {txn.source_name && ` · ${txn.source_name}`}
                        </span>
                      </div>
                    </div>
                    <span className="ml-2 whitespace-nowrap text-xs font-bold text-foreground">
                      &euro;{centsToEur(txn.amount_cents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals / Drawers */}
      <ClientModal
        open={modalOpen}
        onClose={handleCloseModal}
        editClient={editingClient}
        onSave={handleSaveClient}
        saving={clientSaving}
      />

      <MatchPaymentDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        client={matchingClient}
        transactions={unmatchedData?.transactions ?? []}
        loading={unmatchedLoading}
        onLink={handleLink}
        saving={incomeSaving}
      />
    </div>
  );
}
