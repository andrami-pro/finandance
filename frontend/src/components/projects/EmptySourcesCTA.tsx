"use client";

/**
 * EmptySourcesCTA — contextual prompt shown when a project targets a currency
 * (e.g. BTC) but the user has no compatible funding sources connected.
 *
 * Opens the ConnectModal directly from within the project context.
 */

import { useState } from "react";
import { PlugsConnected, ArrowRight } from "@phosphor-icons/react";
import { ConnectModal } from "@/components/integrations/ConnectModal";
import { SyncStatus } from "@/components/integrations/SyncStatus";

// ---------------------------------------------------------------------------
// Provider suggestions per currency
// ---------------------------------------------------------------------------

const CRYPTO_CURRENCIES = new Set(["BTC", "ETH", "XRP", "SOL", "DOT", "ADA", "MATIC"]);

function getSuggestedProviders(currency: string): string {
  const upper = currency.toUpperCase();
  if (upper === "BTC") return "Kraken or Ledger";
  if (upper === "ETH") return "Kraken or Ledger";
  if (CRYPTO_CURRENCIES.has(upper)) return "Kraken";
  return "Wise or Revolut";
}

function getCurrencyLabel(currency: string): string {
  const upper = currency.toUpperCase();
  if (CRYPTO_CURRENCIES.has(upper)) return `${upper} assets`;
  return `${upper} accounts`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EmptySourcesCTAProps {
  targetCurrency: string;
  /** Compact variant for inline use inside lists/panels */
  variant?: "card" | "inline";
  /** Called after integration is connected and sync starts */
  onConnected?: () => void;
}

export function EmptySourcesCTA({
  targetCurrency,
  variant = "card",
  onConnected,
}: EmptySourcesCTAProps) {
  const [showModal, setShowModal] = useState(false);
  const [activeJob, setActiveJob] = useState<{
    jobId: string;
    integrationId: string;
  } | null>(null);

  const providers = getSuggestedProviders(targetCurrency);
  const label = getCurrencyLabel(targetCurrency);

  const handleSuccess = (jobId: string, integrationId: string) => {
    setActiveJob({ jobId, integrationId });
    setShowModal(false);
  };

  const handleSyncComplete = () => {
    setActiveJob(null);
    onConnected?.();
  };

  // Show sync progress if a job is running
  if (activeJob) {
    return (
      <div
        className={
          variant === "card" ? "rounded-md border border-border bg-card p-5 shadow-sm" : "px-5 py-4"
        }
      >
        <SyncStatus
          jobId={activeJob.jobId}
          integrationId={activeJob.integrationId}
          onComplete={handleSyncComplete}
        />
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <>
        <div className="px-5 py-6 text-center">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <PlugsConnected size={20} className="text-primary" />
          </div>
          <p className="mb-1 text-sm font-medium text-foreground">No {label} connected yet</p>
          <p className="mx-auto mb-4 max-w-xs text-xs text-muted-foreground">
            Connect your {providers} to start tracking your {targetCurrency.toUpperCase()} balance
            for this project.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <PlugsConnected size={14} />
            Connect {providers}
          </button>
        </div>
        <ConnectModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      </>
    );
  }

  // Card variant (for project detail banners)
  return (
    <>
      <div className="rounded-md border border-primary/20 bg-primary/5 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <PlugsConnected size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="mb-1 text-sm font-bold text-foreground">Connect your {label}</h3>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              This project targets {targetCurrency.toUpperCase()}, but you don&apos;t have any{" "}
              {label} linked yet. Connect your {providers} to start tracking your balance
              automatically.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Connect account
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
      <ConnectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
