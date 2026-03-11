"use client";

/**
 * Integrations Hub page — /integrations
 *
 * Shows connected providers (Wise, Kraken, Ledger) as cards.
 * Allows connecting new integrations via ConnectModal and triggering syncs.
 * Displays funding sources discovered after sync completes.
 */

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ConnectModal } from "@/components/integrations/ConnectModal";
import { SyncStatus } from "@/components/integrations/SyncStatus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Integration {
  id: string;
  provider_name: "WISE" | "KRAKEN" | "LEDGER" | "REVOLUT";
  status: "PENDING" | "ACTIVE" | "ERROR";
  last_synced_at: string | null;
  public_address: string | null;
}

interface FundingSource {
  id: string;
  integration_id: string;
  name: string;
  currency: string;
  current_balance: string;
  asset_type: string;
}

interface ActiveJob {
  integrationId: string;
  jobId: string;
}

// ---------------------------------------------------------------------------
// Provider card metadata
// ---------------------------------------------------------------------------

const PROVIDER_META: Record<string, { label: string; description: string; logoColor: string }> = {
  WISE: {
    label: "Wise",
    description: "Multi-currency account, Jars & Pockets",
    logoColor: "bg-[#9fe870]",
  },
  KRAKEN: {
    label: "Kraken",
    description: "Crypto exchange — BTC, ETH & more",
    logoColor: "bg-[#5741d9]",
  },
  LEDGER: {
    label: "Ledger",
    description: "Cold wallet — BTC & ETH public address",
    logoColor: "bg-[#1c1c1c]",
  },
  REVOLUT: {
    label: "Revolut",
    description: "Bank account via Open Banking",
    logoColor: "bg-[#0075EB]",
  },
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-primary/15 text-primary",
  PENDING: "bg-secondary text-secondary-foreground",
  ERROR: "bg-destructive/10 text-destructive",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IntegrationsPage() {
  const { loading: authLoading } = useAuth(); // wires token provider for api client
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [ints, sources] = await Promise.all([
        api.get<Integration[]>("/api/v1/integrations"),
        api.get<FundingSource[]>("/api/v1/funding-sources"),
      ]);
      setIntegrations(ints);
      setFundingSources(sources);
    } catch {
      // Errors are handled by the API client (redirected to login on 401)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) loadData();
  }, [authLoading, loadData]);

  const handleConnectSuccess = (jobId: string, integrationId: string) => {
    setShowConnectModal(false);
    setActiveJob({ integrationId, jobId });
    loadData(); // Refresh integration list (new entry in PENDING)
  };

  const handleSyncComplete = () => {
    setActiveJob(null);
    loadData(); // Refresh to show ACTIVE status + new funding sources
  };

  const handleTriggerSync = async (integrationId: string) => {
    try {
      const res = await api.post<{ job_id: string; status: string }>(
        `/api/v1/integrations/${integrationId}/sync`
      );
      setActiveJob({ integrationId, jobId: res.job_id });
    } catch {
      // Error toast would be wired here in a full implementation
    }
  };

  const handleDelete = async (integrationId: string) => {
    try {
      await api.delete(`/api/v1/integrations/${integrationId}`);
      setIntegrations((prev) => prev.filter((i) => i.id !== integrationId));
      setFundingSources((prev) => prev.filter((s) => s.integration_id !== integrationId));
    } catch {
      // Error toast would be wired here
    }
  };

  const connectedProviders = new Set(integrations.map((i) => i.provider_name));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Integrations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your financial accounts to sync balances and transactions.
            </p>
          </div>
          <button
            onClick={() => setShowConnectModal(true)}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            + Connect account
          </button>
        </div>

        {/* Active sync progress */}
        {activeJob && (
          <div className="mb-6">
            <SyncStatus
              jobId={activeJob.jobId}
              integrationId={activeJob.integrationId}
              onComplete={handleSyncComplete}
            />
          </div>
        )}

        {/* Connected integrations */}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground">Loading…</div>
        ) : (
          <>
            {integrations.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Connected accounts
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {integrations.map((integration) => {
                    const meta = PROVIDER_META[integration.provider_name] ?? {
                      label: integration.provider_name,
                      description: "",
                      logoColor: "bg-muted-foreground",
                    };
                    const sourceCount = fundingSources.filter(
                      (s) => s.integration_id === integration.id
                    ).length;

                    return (
                      <div key={integration.id} className="rounded-md bg-card p-5 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-md ${meta.logoColor} text-sm font-bold text-primary-foreground`}
                            >
                              {meta.label[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{meta.label}</p>
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[integration.status] ?? ""}`}
                              >
                                {integration.status}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(integration.id)}
                            className="rounded-lg p-1 text-muted-foreground/50 transition hover:text-destructive"
                            title="Remove integration"
                          >
                            ✕
                          </button>
                        </div>

                        <p className="mt-3 text-xs text-muted-foreground">
                          {sourceCount > 0
                            ? `${sourceCount} account${sourceCount !== 1 ? "s" : ""} synced`
                            : meta.description}
                        </p>

                        {integration.last_synced_at && (
                          <p className="mt-1 text-xs text-muted-foreground/50">
                            Last sync: {new Date(integration.last_synced_at).toLocaleString()}
                          </p>
                        )}

                        <button
                          onClick={() => handleTriggerSync(integration.id)}
                          disabled={!!activeJob}
                          className="mt-4 w-full rounded-md border border-primary/30 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5 disabled:opacity-40"
                        >
                          Sync now
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Provider cards for unconnected providers */}
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {integrations.length > 0 ? "Add more" : "Available providers"}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(PROVIDER_META)
                  .filter(([key]) => !connectedProviders.has(key as Integration["provider_name"]))
                  .map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => setShowConnectModal(true)}
                      className="rounded-md bg-card p-5 text-left shadow-sm transition hover:ring-2 hover:ring-primary"
                    >
                      <div
                        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-md ${meta.logoColor} text-sm font-bold text-primary-foreground`}
                      >
                        {meta.label[0]}
                      </div>
                      <p className="font-semibold text-foreground">{meta.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
                    </button>
                  ))}
              </div>
            </section>

            {/* Funding sources — grouped by provider */}
            {fundingSources.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Your accounts &amp; wallets
                </h2>
                <div className="flex flex-col gap-4">
                  {integrations.map((integration) => {
                    const meta = PROVIDER_META[integration.provider_name];
                    const sources = fundingSources.filter(
                      (s) => s.integration_id === integration.id
                    );
                    if (sources.length === 0) return null;

                    return (
                      <div
                        key={integration.id}
                        className="overflow-hidden rounded-md bg-card shadow-sm"
                      >
                        {/* Provider header */}
                        <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-3">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-md ${meta?.logoColor ?? "bg-muted"} text-xs font-bold text-primary-foreground shadow-sm`}
                          >
                            {(meta?.label ?? integration.provider_name)[0]}
                          </div>
                          <span className="text-xs font-bold text-foreground">
                            {meta?.label ?? integration.provider_name}
                          </span>
                          <span className="ml-auto text-[10px] text-muted-foreground">
                            {integration.last_synced_at
                              ? `Synced ${new Date(integration.last_synced_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                              : "Not synced yet"}
                          </span>
                        </div>

                        {/* Source rows */}
                        {sources.map((source) => (
                          <div
                            key={source.id}
                            className="flex items-center gap-4 border-b border-border px-5 py-3 last:border-b-0"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {source.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {source.asset_type} &middot; {source.currency}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-bold text-foreground">
                              {parseFloat(source.current_balance).toLocaleString(undefined, {
                                maximumFractionDigits: 8,
                              })}{" "}
                              <span className="text-xs font-normal text-muted-foreground">
                                {source.currency}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Connect Modal */}
      <ConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onSuccess={(jobId, integrationId) => handleConnectSuccess(jobId, integrationId)}
      />
    </div>
  );
}
