"use client";

/**
 * ConnectModal — multi-step modal for connecting a financial integration.
 *
 * Step 1: Select provider (Wise / Kraken / Ledger)
 * Step 2: Enter credentials (API key or public address)
 * Step 3: Submit → POST /api/v1/integrations/connect → returns job_id
 */

import { useState } from "react";

import { api, ApiException } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Provider = "WISE" | "KRAKEN" | "LEDGER" | "REVOLUT";

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with (jobId, integrationId) on successful connect */
  onSuccess: (jobId: string, integrationId: string) => void;
}

interface ConnectResponse {
  id: string;
  provider: Provider;
  status: string;
  job_id: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Provider metadata
// ---------------------------------------------------------------------------

interface ProviderConfig {
  label: string;
  description: string;
  inputLabel: string;
  inputPlaceholder: string;
  inputType: "api_key" | "public_address" | "oauth";
  /** Kraken also needs a secret */
  hasSecret?: boolean;
  secretLabel?: string;
  secretPlaceholder?: string;
  chainOptions?: string[];
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  WISE: {
    label: "Wise",
    description: "Connect your Wise multi-currency account.",
    inputLabel: "API Key",
    inputPlaceholder: "Paste your Wise API key",
    inputType: "api_key",
  },
  KRAKEN: {
    label: "Kraken",
    description: "Connect your Kraken crypto exchange account.",
    inputLabel: "API Key",
    inputPlaceholder: "Kraken API key",
    inputType: "api_key",
    hasSecret: true,
    secretLabel: "API Secret",
    secretPlaceholder: "Kraken API secret",
  },
  LEDGER: {
    label: "Ledger",
    description: "Track any BTC or ETH cold wallet by its public address.",
    inputLabel: "Public address",
    inputPlaceholder: "bc1q… or 0x…",
    inputType: "public_address",
    chainOptions: ["BTC", "ETH"],
  },
  REVOLUT: {
    label: "Revolut",
    description:
      "Connect your Revolut bank account via Open Banking (PSD2). You'll be redirected to authorize access.",
    inputLabel: "",
    inputPlaceholder: "",
    inputType: "oauth",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConnectModal({ isOpen, onClose, onSuccess }: ConnectModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [chain, setChain] = useState<string>("BTC");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const config = selectedProvider ? PROVIDERS[selectedProvider] : null;

  const handleClose = () => {
    setSelectedProvider(null);
    setInputValue("");
    setSecretValue("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedProvider || !config) return;

    // OAuth flow — redirect to Enable Banking
    if (config.inputType === "oauth") {
      setError(null);
      setSubmitting(true);
      try {
        const res = await api.post<{ link: string; integration_id: string }>(
          "/api/v1/integrations/revolut/initiate",
          { country: "GB" }
        );
        // Redirect to bank authorization page
        window.location.href = res.link;
      } catch (err) {
        if (err instanceof ApiException) {
          if (err.status === 409) {
            setError(`A ${selectedProvider} integration already exists.`);
          } else {
            setError(err.error.message ?? "Connection failed. Please try again.");
          }
        } else {
          setError("An unexpected error occurred.");
        }
        setSubmitting(false);
      }
      return;
    }

    // Credential-based flow (Wise / Kraken / Ledger)
    if (!inputValue.trim()) {
      setError(`${config.inputLabel} is required`);
      return;
    }
    if (config.hasSecret && !secretValue.trim()) {
      setError(`${config.secretLabel ?? "Secret"} is required`);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const body: Record<string, string> = {
        provider: selectedProvider,
      };

      if (config.inputType === "api_key") {
        body["api_key"] = inputValue.trim();
        if (config.hasSecret) {
          body["api_secret"] = secretValue.trim();
        }
      } else {
        body["public_address"] = inputValue.trim();
        body["chain"] = chain;
      }

      const res = await api.post<ConnectResponse>("/api/v1/integrations/connect", body);

      onSuccess(res.job_id, res.id);
      handleClose();
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 409) {
          setError(`A ${selectedProvider} integration already exists.`);
        } else {
          setError(err.error.message ?? "Connection failed. Please try again.");
        }
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="w-full max-w-md rounded-md bg-card p-6 shadow-sm">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            {selectedProvider ? `Connect ${PROVIDERS[selectedProvider].label}` : "Connect account"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-muted-foreground/50 transition hover:text-muted-foreground"
          >
            ✕
          </button>
        </div>

        {/* Step 1: Provider selection */}
        {!selectedProvider && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose a provider to connect:</p>
            {(Object.keys(PROVIDERS) as Provider[]).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedProvider(key)}
                className="w-full rounded-md border border-border bg-muted px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
              >
                <p className="font-semibold text-foreground">{PROVIDERS[key].label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{PROVIDERS[key].description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Credentials form */}
        {selectedProvider && config && (
          <div className="space-y-4">
            <button
              onClick={() => {
                setSelectedProvider(null);
                setInputValue("");
                setSecretValue("");
                setError(null);
              }}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              ← Back
            </button>

            <p className="text-sm text-muted-foreground">{config.description}</p>

            {/* OAuth flow (Revolut) */}
            {config.inputType === "oauth" && (
              <div className="rounded-md border border-border bg-muted/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  You will be redirected to securely authorize access to your bank account. No
                  credentials are stored by Finandance.
                </p>
              </div>
            )}

            {/* Chain selector for Ledger */}
            {config.inputType !== "oauth" && config.chainOptions && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground/80">
                  Blockchain
                </label>
                <div className="flex gap-2">
                  {config.chainOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setChain(c)}
                      className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
                        chain === c
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground hover:bg-primary/5"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Primary input (not shown for OAuth) */}
            {config.inputType !== "oauth" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground/80">
                  {config.inputLabel}
                </label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={config.inputPlaceholder}
                  className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            {/* Kraken secret */}
            {config.hasSecret && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground/80">
                  {config.secretLabel}
                </label>
                <input
                  type="password"
                  value={secretValue}
                  onChange={(e) => setSecretValue(e.target.value)}
                  placeholder={config.secretPlaceholder}
                  className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting
                ? "Connecting…"
                : config.inputType === "oauth"
                  ? `Connect with ${config.label}`
                  : "Connect"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
