"use client";

/**
 * CryptoActivationCards — two expandable cards for Kraken + Ledger connection.
 *
 * Clicking a card expands its inline connection panel and collapses the other.
 * After connection: auto-links sources to the project, shows "Add another" option.
 */

import { useCallback, useState } from "react";
import { ArrowRight, Check, Plus, Wallet } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { InlineKrakenConnect } from "./InlineKrakenConnect";
import { InlineLedgerConnect } from "./InlineLedgerConnect";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExpandedCard = "kraken" | "ledger" | null;

interface CryptoActivationCardsProps {
  projectId: string;
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CryptoActivationCards({ projectId, onComplete }: CryptoActivationCardsProps) {
  const [expanded, setExpanded] = useState<ExpandedCard>(null);
  const [connectedCount, setConnectedCount] = useState(0);

  const handleSuccess = useCallback(
    async (integrationId: string, _fundingSourceIds: string[]) => {
      // Auto-link: after connection, assign discovered sources to the project.
      // The sync job discovers sources; we re-fetch and link them.
      try {
        // Fetch sources that belong to this integration
        const sources =
          await api.get<Array<{ id: string; integration_id: string }>>("/api/v1/funding-sources");
        const newSources = sources.filter((s) => s.integration_id === integrationId);

        // Link each source to the project
        await Promise.all(
          newSources.map((s) =>
            api.post(`/api/v1/funding-sources/${s.id}/assign`, {
              project_id: projectId,
            })
          )
        );
      } catch {
        // If auto-link fails, user can still link manually from detail page
      }

      setConnectedCount((c) => c + 1);
      setExpanded(null);
    },
    [projectId]
  );

  // After at least one connection, show continue option
  if (connectedCount > 0 && expanded === null) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-4 shadow-sm">
          <Check size={16} className="text-primary" weight="bold" />
          <span className="text-sm font-bold text-foreground">
            {connectedCount} wallet{connectedCount > 1 ? "s" : ""} connected!
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setExpanded(null)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground shadow-sm transition-colors hover:border-primary/30"
            onClickCapture={(e) => {
              e.stopPropagation();
              // Show cards again for "add another"
              setConnectedCount(0);
            }}
          >
            <Plus size={12} weight="bold" />
            Add Another
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Continue to Project
            <ArrowRight size={12} weight="bold" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded: show inline connection panel
  if (expanded === "kraken") {
    return (
      <div className="rounded-md border border-border bg-card p-5 shadow-sm">
        <InlineKrakenConnect onSuccess={handleSuccess} onCancel={() => setExpanded(null)} />
      </div>
    );
  }

  if (expanded === "ledger") {
    return (
      <div className="rounded-md border border-border bg-card p-5 shadow-sm">
        <InlineLedgerConnect onSuccess={handleSuccess} onCancel={() => setExpanded(null)} />
      </div>
    );
  }

  // Default: two selectable cards
  return (
    <div className="grid grid-cols-1 gap-3">
      <button
        type="button"
        onClick={() => setExpanded("kraken")}
        className="group flex items-center gap-4 rounded-md border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-[#5741d9]/40 hover:bg-[#5741d9]/5"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#5741d9] text-sm font-bold text-white shadow-sm">
          K
        </div>
        <div className="flex-1">
          <h3 className="mb-0.5 text-sm font-bold text-foreground">Connect Kraken Exchange</h3>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Link your Kraken account with a read-only API key to track your exchange balances.
          </p>
        </div>
        <ArrowRight
          size={16}
          className="shrink-0 text-muted-foreground transition-colors group-hover:text-[#5741d9]"
        />
      </button>

      <button
        type="button"
        onClick={() => setExpanded("ledger")}
        className="group flex items-center gap-4 rounded-md border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-muted-foreground/40 hover:bg-muted/50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#1c1c1c] text-sm font-bold text-white shadow-sm">
          <Wallet size={18} />
        </div>
        <div className="flex-1">
          <h3 className="mb-0.5 text-sm font-bold text-foreground">Track a Wallet Address</h3>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Monitor a public blockchain address without sharing any private keys. Perfect for
            hardware wallets.
          </p>
        </div>
        <ArrowRight
          size={16}
          className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
        />
      </button>
    </div>
  );
}
