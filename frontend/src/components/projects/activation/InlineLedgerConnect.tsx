"use client";

/**
 * InlineLedgerConnect — self-contained inline panel for tracking a wallet address.
 *
 * No modal, no navigation — renders directly in the activation page.
 * Calls POST /api/v1/integrations/connect with provider=LEDGER.
 */

import { useCallback, useState } from "react";
import { Check, CheckCircle, CircleNotch, Warning, X } from "@phosphor-icons/react";
import { api, ApiException } from "@/lib/api";
import { validateAddress, type Network } from "@/lib/addressValidation";
import { SyncStatus } from "@/components/integrations/SyncStatus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectResponse {
  id: string;
  provider: string;
  status: string;
  job_id: string;
  message: string;
}

interface InlineLedgerConnectProps {
  onSuccess: (integrationId: string, fundingSourceIds: string[]) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NETWORKS: { value: Network; label: string; placeholder: string }[] = [
  { value: "bitcoin", label: "Bitcoin", placeholder: "e.g., bc1q..." },
  { value: "ethereum", label: "Ethereum", placeholder: "e.g., 0x..." },
];

const CHAIN_MAP: Record<Network, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InlineLedgerConnect({ onSuccess, onCancel }: InlineLedgerConnectProps) {
  const [network, setNetwork] = useState<Network>("bitcoin");
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncJob, setSyncJob] = useState<{ jobId: string; integrationId: string } | null>(null);

  const validation = validateAddress(network, address);
  const showValidation = touched && address.trim().length > 0;
  const canSubmit = validation.valid && !submitting;

  const networkConfig = NETWORKS.find((n) => n.value === network)!;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await api.post<ConnectResponse>("/api/v1/integrations/connect", {
        provider: "LEDGER",
        public_address: address.trim(),
        chain: CHAIN_MAP[network],
        label: label.trim() || undefined,
      });
      setSyncJob({ jobId: res.job_id, integrationId: res.id });
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.message ?? "Connection failed. Please try again.");
      } else {
        setError("An unexpected error occurred.");
      }
      setSubmitting(false);
    }
  }, [canSubmit, address, network, label]);

  const handleSyncComplete = useCallback(() => {
    if (syncJob) {
      onSuccess(syncJob.integrationId, []);
    }
  }, [syncJob, onSuccess]);

  // Sync in progress
  if (syncJob) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <CheckCircle size={16} className="text-primary" weight="fill" />
          Tracking wallet address!
        </div>
        <SyncStatus
          jobId={syncJob.jobId}
          integrationId={syncJob.integrationId}
          onComplete={handleSyncComplete}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1c1c1c] text-[10px] font-bold text-white shadow-sm">
            L
          </div>
          <span className="text-sm font-bold text-foreground">Track a Wallet Address</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Monitor a public blockchain address without sharing any private keys. Perfect for hardware
        wallets.
      </p>

      {/* Network selector */}
      <div>
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Network
        </label>
        <div className="flex gap-2">
          {NETWORKS.map((n) => (
            <button
              key={n.value}
              type="button"
              onClick={() => {
                setNetwork(n.value);
                setAddress("");
                setTouched(false);
              }}
              className={`flex-1 rounded-md border px-3 py-2 text-center shadow-sm transition-colors ${
                network === n.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/30"
              }`}
            >
              <span className="text-xs font-bold">{n.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Address input */}
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Wallet Address
        </label>
        <div className="relative">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={networkConfig.placeholder}
            className={`w-full rounded-md border bg-card px-3 py-2 pr-8 text-xs text-foreground placeholder-muted-foreground/50 shadow-sm focus:outline-none focus:ring-1 ${
              showValidation && validation.valid
                ? "border-primary focus:border-primary focus:ring-primary"
                : showValidation && !validation.valid
                  ? "border-destructive focus:border-destructive focus:ring-destructive"
                  : "border-border focus:border-primary focus:ring-primary"
            }`}
          />
          {showValidation && validation.valid && (
            <Check
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary"
              weight="bold"
            />
          )}
        </div>
        {showValidation && !validation.valid && validation.error && (
          <p className="mt-1 text-[10px] text-destructive">{validation.error}</p>
        )}
      </div>

      {/* Optional label */}
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Wallet Label <span className="font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Ledger Nano X"
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2">
          <Warning size={14} className="mt-0.5 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="flex items-center justify-center gap-1.5 rounded-md bg-foreground px-4 py-2.5 text-xs font-bold text-background shadow-sm transition-colors hover:bg-foreground/90 disabled:opacity-50"
      >
        {submitting ? (
          <>
            <CircleNotch size={14} className="animate-spin" />
            Adding wallet&hellip;
          </>
        ) : (
          "Track Wallet"
        )}
      </button>
    </div>
  );
}
