"use client";

/**
 * Enable Banking OAuth callback page — /integrations/callback
 *
 * After the user authorizes their bank at Enable Banking, they are redirected
 * here with ?code={authorization_code}&state={integration_id}. This page calls
 * the backend to exchange the code for a session and then redirects to /integrations.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { api, ApiException } from "@/lib/api";

type CallbackState = "loading" | "success" | "error";

export default function BankCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: authLoading } = useAuth();

  const [state, setState] = useState<CallbackState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const code = searchParams.get("code");

  const completeConnection = useCallback(async () => {
    if (!code) {
      setState("error");
      setErrorMessage("Missing authorization code. Please try connecting again.");
      return;
    }

    try {
      await api.post("/api/v1/integrations/revolut/complete", { code });
      setState("success");
      // Redirect to integrations after a brief pause
      setTimeout(() => router.push("/integrations"), 1500);
    } catch (err) {
      setState("error");
      if (err instanceof ApiException) {
        setErrorMessage(
          err.error.message ?? "Failed to complete the connection. Please try again."
        );
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
    }
  }, [code, router]);

  useEffect(() => {
    if (!authLoading) {
      completeConnection();
    }
  }, [authLoading, completeConnection]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-md bg-card p-8 text-center shadow-sm">
        {state === "loading" && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <h2 className="text-lg font-semibold text-foreground">Connecting your account...</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Finalizing your Revolut connection. This may take a moment.
            </p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Connected!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your Revolut account has been linked. Redirecting...
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Connection failed</h2>
            <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
            <button
              onClick={() => router.push("/integrations")}
              className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Back to Integrations
            </button>
          </>
        )}
      </div>
    </div>
  );
}
