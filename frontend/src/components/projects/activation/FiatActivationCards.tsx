"use client";

/**
 * FiatActivationCards — fiat-filtered source list or Wise connect CTA.
 *
 * If user has fiat sources: checkbox list (reuses LinkSourcesPanel with fiat filter).
 * If zero fiat sources: InlineWiseConnect panel.
 */

import { useCallback, useState } from "react";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { InlineWiseConnect } from "./InlineWiseConnect";
import { LinkSourcesPanel } from "./LinkSourcesPanel";
import type { FundingSourceOption } from "@/types/projects";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FiatActivationCardsProps {
  projectId: string;
  existingSourceIds: string[];
  targetCurrency: string;
  fundingSources: FundingSourceOption[];
  onComplete: () => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FiatActivationCards({
  projectId,
  existingSourceIds,
  targetCurrency,
  fundingSources,
  onComplete,
  onBack,
}: FiatActivationCardsProps) {
  const [connected, setConnected] = useState(false);

  const fiatSources = fundingSources.filter((s) => FIAT_CURRENCIES.has(s.currency));
  const hasFiatSources = fiatSources.length > 0;

  const handleWiseSuccess = useCallback(
    async (integrationId: string, _fundingSourceIds: string[]) => {
      // Auto-link: fetch sources from the new integration and assign to project
      try {
        const sources =
          await api.get<Array<{ id: string; integration_id: string }>>("/api/v1/funding-sources");
        const newSources = sources.filter((s) => s.integration_id === integrationId);

        await Promise.all(
          newSources.map((s) =>
            api.post(`/api/v1/funding-sources/${s.id}/assign`, {
              project_id: projectId,
            })
          )
        );
      } catch {
        // If auto-link fails, user can link manually from detail page
      }

      setConnected(true);
    },
    [projectId]
  );

  // After Wise connection success
  if (connected) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-4 shadow-sm">
          <Check size={16} className="text-primary" weight="bold" />
          <span className="text-sm font-bold text-foreground">
            Wise connected! Your Jars have been linked to this project.
          </span>
        </div>
        <button
          type="button"
          onClick={onComplete}
          className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Continue to Project
          <ArrowRight size={12} weight="bold" />
        </button>
      </div>
    );
  }

  // If user has fiat sources: show filtered checkbox list
  if (hasFiatSources) {
    return (
      <LinkSourcesPanel
        projectId={projectId}
        existingSourceIds={existingSourceIds}
        targetCurrency={targetCurrency}
        assetTypeFilter="fiat"
        onBack={onBack}
        onComplete={onComplete}
      />
    );
  }

  // No fiat sources: show Wise connect CTA
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-border bg-muted/30 p-4 shadow-sm">
        <p className="text-xs text-muted-foreground">
          You don&apos;t have any fiat savings accounts connected yet. Connect Wise to start
          tracking your EUR/USD savings Jars.
        </p>
      </div>
      <div className="rounded-md border border-border bg-card p-5 shadow-sm">
        <InlineWiseConnect onSuccess={handleWiseSuccess} onCancel={onBack} />
      </div>
    </div>
  );
}
