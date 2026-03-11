"use client";

/**
 * SyncStatus — polls GET /api/v1/jobs/{jobId} every 2s and shows progress.
 *
 * Renders a card with sync state (QUEUED → RUNNING → COMPLETED | FAILED).
 * Calls onComplete() when the job finishes (success or failure) and stops
 * polling automatically.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

interface JobResponse {
  job_id: string;
  status: JobStatus;
  integration_id: string;
  started_at?: string;
  completed_at?: string;
  funding_sources_synced?: number;
  transactions_synced?: number;
  error?: string;
}

interface SyncStatusProps {
  jobId: string;
  integrationId: string;
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES: JobStatus[] = ["COMPLETED", "FAILED"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SyncStatus({ jobId, integrationId: _integrationId, onComplete }: SyncStatusProps) {
  const [job, setJob] = useState<JobResponse | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    if (doneRef.current) return;

    try {
      const data = await api.get<JobResponse>(`/api/v1/jobs/${jobId}`);
      setJob(data);

      if (TERMINAL_STATUSES.includes(data.status)) {
        doneRef.current = true;
        stopPolling();
        // Brief delay so the user sees the final state before the card hides
        setTimeout(onComplete, 1500);
      }
    } catch {
      // If job not found (server restarted), treat as unknown and stop
      stopPolling();
    }
  }, [jobId, onComplete, stopPolling]);

  useEffect(() => {
    // Start polling immediately
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return stopPolling;
  }, [poll, stopPolling]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const statusConfig: Record<JobStatus, { label: string; color: string; icon: string }> = {
    QUEUED: {
      label: "Sync queued…",
      color: "text-muted-foreground",
      icon: "⏳",
    },
    RUNNING: {
      label: "Syncing…",
      color: "text-primary",
      icon: "🔄",
    },
    COMPLETED: {
      label: "Sync complete",
      color: "text-primary",
      icon: "✓",
    },
    FAILED: {
      label: "Sync failed",
      color: "text-destructive",
      icon: "✕",
    },
  };

  const status = job?.status ?? "QUEUED";
  const cfg = statusConfig[status];

  return (
    <div className="flex items-center gap-4 rounded-md bg-card px-5 py-4 shadow-sm">
      {/* Animated icon */}
      <span className={`text-xl ${status === "RUNNING" ? "animate-spin" : ""}`} aria-hidden>
        {cfg.icon}
      </span>

      <div className="flex-1">
        <p className={`font-semibold ${cfg.color}`}>{cfg.label}</p>

        {status === "COMPLETED" && job && (
          <p className="text-xs text-muted-foreground">
            {job.funding_sources_synced ?? 0} accounts, {job.transactions_synced ?? 0} transactions
            synced
          </p>
        )}

        {status === "FAILED" && job?.error && (
          <p className="text-xs text-destructive/70">Error: {job.error}</p>
        )}

        {(status === "QUEUED" || status === "RUNNING") && (
          /* Progress bar */
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full bg-primary transition-all ${
                status === "RUNNING" ? "w-2/3 animate-pulse" : "w-1/6"
              }`}
            />
          </div>
        )}
      </div>

      {/* Job ID (debug / reference) */}
      <span className="hidden text-xs text-muted-foreground/40 sm:block">#{jobId.slice(0, 8)}</span>
    </div>
  );
}
