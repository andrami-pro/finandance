"use client";

/**
 * InlineKrakenConnect — self-contained inline panel for connecting Kraken.
 *
 * No modal, no navigation — renders directly in the activation page.
 * Calls POST /api/v1/integrations/connect with provider=KRAKEN.
 */

import { useCallback, useState } from "react";
import {
  ArrowSquareOut,
  CaretDown,
  CheckCircle,
  CircleNotch,
  ShieldCheck,
  Warning,
  X,
} from "@phosphor-icons/react";
import { api, ApiException } from "@/lib/api";
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

interface InlineKrakenConnectProps {
  onSuccess: (integrationId: string, fundingSourceIds: string[]) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InlineKrakenConnect({ onSuccess, onCancel }: InlineKrakenConnectProps) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncJob, setSyncJob] = useState<{ jobId: string; integrationId: string } | null>(null);

  const canSubmit = apiKey.trim() && apiSecret.trim() && confirmed && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await api.post<ConnectResponse>("/api/v1/integrations/connect", {
        provider: "KRAKEN",
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
      });
      setSyncJob({ jobId: res.job_id, integrationId: res.id });
    } catch (err) {
      if (err instanceof ApiException) {
        setError(
          err.status === 409
            ? "A Kraken integration already exists. Disconnect it first."
            : (err.error.message ?? "Connection failed. Please try again.")
        );
      } else {
        setError("An unexpected error occurred.");
      }
      setSubmitting(false);
    }
  }, [canSubmit, apiKey, apiSecret]);

  // After sync completes, notify parent
  const handleSyncComplete = useCallback(() => {
    if (syncJob) {
      // TODO: extract funding source IDs from job result when backend supports it
      onSuccess(syncJob.integrationId, []);
    }
  }, [syncJob, onSuccess]);

  // Sync in progress
  if (syncJob) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <CheckCircle size={16} className="text-primary" weight="fill" />
          Connected to Kraken!
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
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#5741d9] text-[10px] font-bold text-white shadow-sm">
            K
          </div>
          <span className="text-sm font-bold text-foreground">Connect Kraken Exchange</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* Step 1: Deep link */}
      <div className="rounded-md border border-border bg-muted/30 p-3 shadow-sm">
        <p className="mb-2 text-xs text-muted-foreground">
          <span className="font-bold text-foreground">Step 1:</span> Create a read-only API key on
          Kraken.
        </p>
        <a
          href="https://www.kraken.com/u/security/api"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-sm transition-colors hover:border-primary/30"
        >
          <ArrowSquareOut size={12} />
          Open Kraken API Settings
        </a>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Create a new API key with <span className="font-bold">Query</span> permissions only.
          Disable all other permissions (trade, withdraw, etc).
        </p>
      </div>

      {/* Step 2: Inputs */}
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            API Key
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your Kraken API key"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            API Secret
          </label>
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Paste your Kraken API secret"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Permission confirmation */}
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded-md border-border accent-primary"
        />
        <span className="text-xs text-muted-foreground">
          <ShieldCheck size={12} className="mr-0.5 inline text-primary" weight="fill" />I confirm
          this key has <span className="font-bold text-foreground">read-only permissions</span>
        </span>
      </label>

      {/* Security tips (expandable) */}
      <button
        type="button"
        onClick={() => setShowSecurity(!showSecurity)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <CaretDown
          size={10}
          className={`transition-transform ${showSecurity ? "rotate-180" : ""}`}
        />
        Security recommendations
      </button>
      {showSecurity && (
        <div className="rounded-md border border-border bg-muted/30 p-3 text-[10px] text-muted-foreground shadow-sm">
          <ul className="list-disc space-y-1 pl-3">
            <li>Enable 2FA on your Kraken account</li>
            <li>Set IP whitelisting for this API key</li>
            <li>Never share your API secret with anyone</li>
            <li>Revoke the key immediately if compromised</li>
          </ul>
        </div>
      )}

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
        className="flex items-center justify-center gap-1.5 rounded-md bg-[#5741d9] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#5741d9]/90 disabled:opacity-50"
      >
        {submitting ? (
          <>
            <CircleNotch size={14} className="animate-spin" />
            Connecting to Kraken&hellip;
          </>
        ) : (
          "Connect Kraken"
        )}
      </button>
    </div>
  );
}
