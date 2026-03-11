"use client";

/**
 * InlineWiseConnect — self-contained inline panel for connecting Wise.
 *
 * No modal, no navigation — renders directly in the activation page.
 * Calls POST /api/v1/integrations/connect with provider=WISE.
 */

import { useCallback, useState } from "react";
import { ArrowSquareOut, CheckCircle, CircleNotch, Warning, X } from "@phosphor-icons/react";
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

interface InlineWiseConnectProps {
  onSuccess: (integrationId: string, fundingSourceIds: string[]) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InlineWiseConnect({ onSuccess, onCancel }: InlineWiseConnectProps) {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncJob, setSyncJob] = useState<{ jobId: string; integrationId: string } | null>(null);

  const canSubmit = apiKey.trim().length > 0 && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await api.post<ConnectResponse>("/api/v1/integrations/connect", {
        provider: "WISE",
        api_key: apiKey.trim(),
      });
      setSyncJob({ jobId: res.job_id, integrationId: res.id });
    } catch (err) {
      if (err instanceof ApiException) {
        setError(
          err.status === 409
            ? "A Wise integration already exists. Disconnect it first."
            : (err.error.message ?? "Connection failed. Please try again.")
        );
      } else {
        setError("An unexpected error occurred.");
      }
      setSubmitting(false);
    }
  }, [canSubmit, apiKey]);

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
          Connected to Wise!
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
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#9fe870] text-[10px] font-bold text-[#163300] shadow-sm">
            W
          </div>
          <span className="text-sm font-bold text-foreground">Connect Wise</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* Instructions */}
      <div className="rounded-md border border-border bg-muted/30 p-3 shadow-sm">
        <p className="mb-2 text-xs text-muted-foreground">
          <span className="font-bold text-foreground">Step 1:</span> Create a personal API token on
          Wise.
        </p>
        <a
          href="https://wise.com/settings/api-tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-sm transition-colors hover:border-primary/30"
        >
          <ArrowSquareOut size={12} />
          Open Wise API Settings
        </a>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Create a token with <span className="font-bold">Read Only</span> access. This allows
          Finandance to read your Jars and balances.
        </p>
      </div>

      {/* API Key input */}
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          API Token
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste your Wise API token"
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
        className="flex items-center justify-center gap-1.5 rounded-md bg-[#9fe870] px-4 py-2.5 text-xs font-bold text-[#163300] shadow-sm transition-colors hover:bg-[#9fe870]/90 disabled:opacity-50"
      >
        {submitting ? (
          <>
            <CircleNotch size={14} className="animate-spin" />
            Connecting to Wise&hellip;
          </>
        ) : (
          "Connect Wise"
        )}
      </button>
    </div>
  );
}
