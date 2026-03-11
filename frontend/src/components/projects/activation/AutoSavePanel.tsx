"use client";

/**
 * AutoSavePanel — configures a recurring savings plan (DCA).
 *
 * Real-time projection updates as user adjusts amount/frequency.
 */

import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, CircleNotch, FloppyDisk, Info } from "@phosphor-icons/react";
import { useFundingSources } from "@/hooks/useProjects";
import { useCreateFundingPlan } from "@/hooks/useFundingPlans";
import { calculateProjection } from "@/lib/projections";
import { ProjectionChart } from "./ProjectionChart";
import type { PlanFrequency, Provider } from "@/types/projects";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREQUENCIES: { value: PlanFrequency; label: string; sub: string }[] = [
  { value: "weekly", label: "Weekly", sub: "fastest growth" },
  { value: "biweekly", label: "Every 2 weeks", sub: "" },
  { value: "monthly", label: "Monthly", sub: "most popular" },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  BTC: "\u20bf",
};

const PROVIDER_STYLES: Record<Provider, { bg: string; text: string; letter: string }> = {
  WISE: { bg: "bg-[#9fe870]", text: "text-[#163300]", letter: "W" },
  KRAKEN: { bg: "bg-[#5741d9]", text: "text-white", letter: "K" },
  LEDGER: { bg: "bg-stone-800", text: "text-white", letter: "L" },
  REVOLUT: { bg: "bg-[#0075EB]", text: "text-white", letter: "R" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AutoSavePanelProps {
  projectId: string;
  targetAmount: number;
  currentBalance: number;
  targetCurrency: string;
  fundingStrategy: string | null;
  onBack: () => void;
  onComplete: () => void;
}

// Currency classification for client-side asset type filtering
const FIAT_CURRENCIES = new Set([
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "HRK",
]);

export function AutoSavePanel({
  projectId,
  targetAmount,
  currentBalance,
  targetCurrency,
  fundingStrategy,
  onBack,
  onComplete,
}: AutoSavePanelProps) {
  const { sources: allSources, loading: loadingSources } = useFundingSources();
  const { create, submitting } = useCreateFundingPlan();

  // Filter sources by strategy: crypto shows crypto sources, fiat shows fiat
  const sources = fundingStrategy
    ? allSources.filter((s) =>
        fundingStrategy === "fiat"
          ? FIAT_CURRENCIES.has(s.currency)
          : !FIAT_CURRENCIES.has(s.currency)
      )
    : allSources;

  const [amount, setAmount] = useState<number>(100);
  const [frequency, setFrequency] = useState<PlanFrequency>("monthly");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  const sym = CURRENCY_SYMBOLS[targetCurrency] ?? targetCurrency;
  const isCrypto = fundingStrategy === "crypto";

  // Real-time projection
  const projection = useMemo(
    () =>
      calculateProjection({
        currentBalance,
        targetAmount,
        contributionAmount: amount,
        frequency,
      }),
    [currentBalance, targetAmount, amount, frequency]
  );

  const handleSave = useCallback(async () => {
    try {
      await create({
        project_id: projectId,
        funding_source_id: selectedSourceId,
        plan_type: "dca",
        amount,
        currency: targetCurrency,
        frequency,
      });
      onComplete();
    } catch {
      // Error shown via hook
    }
  }, [projectId, selectedSourceId, amount, targetCurrency, frequency, create, onComplete]);

  if (loadingSources) {
    return (
      <div className="flex items-center justify-center py-12">
        <CircleNotch size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card shadow-sm transition-colors hover:border-primary/30"
        >
          <ArrowLeft size={16} className="text-muted-foreground" />
        </button>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Set Up Auto-Save</h2>
      </div>

      {/* Explanation card */}
      <div className="rounded-md border border-border bg-muted/30 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <Info size={16} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="mb-1 text-xs font-bold text-foreground">
              {isCrypto ? "What is Dollar-Cost Averaging?" : "What is Auto-Save?"}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {isCrypto
                ? "Dollar-Cost Averaging (DCA) means investing a fixed amount at regular intervals, regardless of price. This strategy reduces the impact of volatility by spreading purchases over time."
                : "Auto-Save sets a recurring savings goal. You\u2019ll get reminders to contribute a fixed amount at your chosen frequency. Build your goal steadily over time."}
            </p>
          </div>
        </div>
      </div>

      {/* Amount input */}
      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Contribution Amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {sym}
          </span>
          <input
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            min={1}
            step={10}
            placeholder="100"
            className="w-full rounded-md border border-border bg-card py-2.5 pl-7 pr-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Frequency pills */}
      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Frequency
        </label>
        <div className="flex gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFrequency(f.value)}
              className={`flex-1 rounded-md border px-3 py-2.5 text-center shadow-sm transition-colors ${
                frequency === f.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/30"
              }`}
            >
              <span className="block text-xs font-bold">{f.label}</span>
              {f.sub && (
                <span className="mt-0.5 block text-[9px] text-muted-foreground">{f.sub}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Source selector */}
      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          From Source (optional)
        </label>
        <div className="flex flex-col gap-1.5">
          {sources.map((source) => {
            const style = PROVIDER_STYLES[source.provider];
            const isSelected = selectedSourceId === source.id;
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => setSelectedSourceId(isSelected ? null : source.id)}
                className={`flex items-center gap-3 rounded-md border px-4 py-2.5 text-left shadow-sm transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div
                  className={`h-7 w-7 shrink-0 rounded-md ${style.bg} ${style.text} flex items-center justify-center text-[9px] font-bold shadow-sm`}
                >
                  {style.letter}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{source.name}</p>
                </div>
                {isSelected && (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
          {sources.length === 0 && (
            <p className="py-2 text-xs text-muted-foreground">
              No funding sources connected yet. You can add one later.
            </p>
          )}
        </div>
      </div>

      {/* Projection chart */}
      {amount > 0 && !projection.goalAlreadyReached && (
        <div className="rounded-md border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Projection
          </h3>
          <ProjectionChart
            dataPoints={projection.dataPoints}
            targetAmount={targetAmount}
            currency={targetCurrency}
            milestones={projection.milestones}
          />
        </div>
      )}

      {/* Summary text */}
      {amount > 0 && projection.estimatedCompletionDate && (
        <p className="text-center text-xs text-muted-foreground">
          At{" "}
          <span className="font-bold text-foreground">
            {sym}
            {amount}
          </span>{" "}
          / {frequency}, you&apos;ll reach{" "}
          <span className="font-bold text-foreground">
            {sym}
            {targetAmount.toLocaleString()}
          </span>{" "}
          by{" "}
          <span className="font-bold text-foreground">
            {projection.estimatedCompletionDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
        </p>
      )}

      {projection.goalAlreadyReached && (
        <p className="text-center text-xs font-bold text-primary">Your goal is already reached!</p>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={submitting || amount <= 0}
        className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? <CircleNotch size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
        {submitting ? "Creating Plan\u2026" : "Create Auto-Save Plan"}
      </button>
    </div>
  );
}
