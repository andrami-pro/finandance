"use client";

/**
 * LinkSourcesPanel — checkbox list of funding sources for linking to a project.
 *
 * Reuses the same toggle pattern from the project detail page's
 * ConnectedSourcesSection, adapted for the activation interstitial.
 */

import { useCallback, useState } from "react";
import { ArrowLeft, Check, FloppyDisk, CircleNotch } from "@phosphor-icons/react";
import { useFundingSources, useUpdateProject } from "@/hooks/useProjects";
import { EmptySourcesCTA } from "@/components/projects/EmptySourcesCTA";
import type { ProjectCurrency, Provider } from "@/types/projects";

// ---------------------------------------------------------------------------
// Constants (mirrored from detail page)
// ---------------------------------------------------------------------------

const PROVIDER_STYLES: Record<Provider, { bg: string; text: string; letter: string }> = {
  WISE: { bg: "bg-[#9fe870]", text: "text-[#163300]", letter: "W" },
  KRAKEN: { bg: "bg-[#5741d9]", text: "text-white", letter: "K" },
  LEDGER: { bg: "bg-stone-800", text: "text-white", letter: "L" },
  REVOLUT: { bg: "bg-[#0075EB]", text: "text-white", letter: "R" },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  BTC: "\u20bf",
};

function formatCurrency(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  if (currency === "BTC") return `${sym}${amount}`;
  return `${sym}${amount.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

interface LinkSourcesPanelProps {
  projectId: string;
  existingSourceIds: string[];
  targetCurrency?: string;
  assetTypeFilter?: "fiat" | "crypto";
  onBack: () => void;
  onComplete: () => void;
}

export function LinkSourcesPanel({
  projectId,
  existingSourceIds,
  targetCurrency,
  assetTypeFilter,
  onBack,
  onComplete,
}: LinkSourcesPanelProps) {
  const { sources: allSources, loading: loadingSources } = useFundingSources();

  // Filter sources by asset type when specified
  const sources = assetTypeFilter
    ? allSources.filter((s) =>
        assetTypeFilter === "fiat"
          ? FIAT_CURRENCIES.has(s.currency)
          : !FIAT_CURRENCIES.has(s.currency)
      )
    : allSources;
  const { update, submitting } = useUpdateProject(projectId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(existingSourceIds));

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Sum balances converted to EUR (use balanceInBaseCurrency when available,
  // fall back to currentBalance for EUR sources)
  const totalBalance = sources
    .filter((s) => selectedIds.has(s.id))
    .reduce((sum, s) => sum + (s.balanceInBaseCurrency ?? s.currentBalance), 0);

  const handleSave = useCallback(async () => {
    try {
      await update({ funding_source_ids: Array.from(selectedIds) });
      onComplete();
    } catch {
      // Error shown via hook
    }
  }, [selectedIds, update, onComplete]);

  if (loadingSources) {
    return (
      <div className="flex items-center justify-center py-12">
        <CircleNotch size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card shadow-sm transition-colors hover:border-primary/30"
        >
          <ArrowLeft size={16} className="text-muted-foreground" />
        </button>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Link Funding Sources</h2>
      </div>

      <p className="text-xs text-muted-foreground">
        Select the accounts you want to track for this project.
      </p>

      {/* Source list */}
      <div className="rounded-md border border-border bg-card shadow-sm">
        {sources.length > 0 ? (
          sources.map((source) => {
            const style = PROVIDER_STYLES[source.provider];
            const isSelected = selectedIds.has(source.id);
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => toggle(source.id)}
                className={`flex w-full items-center gap-3 border-b border-border px-5 py-3 text-left transition-colors last:border-b-0 ${
                  isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <div
                  className={`h-8 w-8 shrink-0 rounded-md ${style.bg} ${style.text} flex items-center justify-center text-[10px] font-bold shadow-sm`}
                >
                  {style.letter}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{source.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {source.currency} &middot;{" "}
                    {formatCurrency(source.currentBalance, source.currency as ProjectCurrency)}
                  </p>
                </div>
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-muted-foreground/30 bg-card"
                  }`}
                >
                  {isSelected && <Check size={12} weight="bold" />}
                </div>
              </button>
            );
          })
        ) : (
          <EmptySourcesCTA
            targetCurrency={targetCurrency ?? "EUR"}
            variant="inline"
            onConnected={() => window.location.reload()}
          />
        )}
      </div>

      {/* Running total + save */}
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-5 py-3 shadow-sm">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Initial tracked balance
          </span>
          <p className="text-lg font-bold tracking-tight text-foreground">
            {formatCurrency(totalBalance, "EUR")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting || selectedIds.size === 0}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? (
            <CircleNotch size={14} className="animate-spin" />
          ) : (
            <FloppyDisk size={14} />
          )}
          {submitting ? "Saving\u2026" : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}
