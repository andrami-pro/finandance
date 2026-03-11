"use client";

/**
 * Hooks for freelance income tracking.
 *
 * - useIncomeSummary(month?)              — income overview for a period
 * - useUnmatchedTransactions(month?)      — unlinked income transactions
 * - useIncomeMutations()                  — link/unlink/generate actions
 */

import { useCallback, useEffect, useState } from "react";

import { api, ApiException } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { _invalidateClients } from "@/hooks/useClients";
import type { ExpectedIncome, IncomeSummary, UnmatchedTransactionsResponse } from "@/types/income";

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

const _summaryCache = new Map<string, IncomeSummary>();
const _unmatchedCache = new Map<string, UnmatchedTransactionsResponse>();
let _refreshListeners: Array<() => void> = [];

function _cacheKey(month?: string): string {
  return month ?? "current";
}

function _invalidateAll() {
  _summaryCache.clear();
  _unmatchedCache.clear();
  _invalidateClients();
  _refreshListeners.forEach((fn) => fn());
}

// ---------------------------------------------------------------------------
// useIncomeSummary
// ---------------------------------------------------------------------------

interface UseIncomeSummaryReturn {
  summary: IncomeSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useIncomeSummary(month?: string): UseIncomeSummaryReturn {
  const { user, loading: authLoading } = useAuth();
  const key = _cacheKey(month);
  const cached = _summaryCache.get(key) ?? null;

  const [summary, setSummary] = useState<IncomeSummary | null>(cached);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    const existing = _summaryCache.get(key);
    if (!existing) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (month) params.set("month", month);
      const qs = params.toString();
      const data = await api.get<IncomeSummary>(`/api/v1/income/summary${qs ? `?${qs}` : ""}`);
      _summaryCache.set(key, data);
      setSummary(data);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.message);
      } else {
        setError("Failed to load income summary");
      }
    } finally {
      setLoading(false);
    }
  }, [key, month]);

  useEffect(() => {
    if (!authLoading && user) {
      fetch_();
    }
  }, [authLoading, user, fetch_]);

  useEffect(() => {
    _refreshListeners.push(fetch_);
    return () => {
      _refreshListeners = _refreshListeners.filter((fn) => fn !== fetch_);
    };
  }, [fetch_]);

  return {
    summary,
    loading: (loading && cached === null) || authLoading,
    error,
    refresh: fetch_,
  };
}

// ---------------------------------------------------------------------------
// useUnmatchedTransactions
// ---------------------------------------------------------------------------

interface UseUnmatchedReturn {
  data: UnmatchedTransactionsResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useUnmatchedTransactions(month?: string, limit: number = 20): UseUnmatchedReturn {
  const { user, loading: authLoading } = useAuth();
  const key = `${_cacheKey(month)}:${limit}`;
  const cached = _unmatchedCache.get(key) ?? null;

  const [data, setData] = useState<UnmatchedTransactionsResponse | null>(cached);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    const existing = _unmatchedCache.get(key);
    if (!existing) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (month) params.set("month", month);
      const result = await api.get<UnmatchedTransactionsResponse>(
        `/api/v1/income/unmatched?${params.toString()}`
      );
      _unmatchedCache.set(key, result);
      setData(result);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.message);
      } else {
        setError("Failed to load unmatched transactions");
      }
    } finally {
      setLoading(false);
    }
  }, [key, month, limit]);

  useEffect(() => {
    if (!authLoading && user) {
      fetch_();
    }
  }, [authLoading, user, fetch_]);

  useEffect(() => {
    _refreshListeners.push(fetch_);
    return () => {
      _refreshListeners = _refreshListeners.filter((fn) => fn !== fetch_);
    };
  }, [fetch_]);

  return {
    data,
    loading: (loading && cached === null) || authLoading,
    error,
    refresh: fetch_,
  };
}

// ---------------------------------------------------------------------------
// useIncomeMutations
// ---------------------------------------------------------------------------

interface UseIncomeMutationsReturn {
  linkTransaction: (
    expectedIncomeId: string,
    transactionId: string,
    amountCents: number
  ) => Promise<ExpectedIncome>;
  unlinkTransaction: (linkId: string) => Promise<void>;
  generateExpected: (month?: string) => Promise<ExpectedIncome[]>;
  saving: boolean;
  error: string | null;
}

export function useIncomeMutations(): UseIncomeMutationsReturn {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkTransaction = useCallback(
    async (
      expectedIncomeId: string,
      transactionId: string,
      amountCents: number
    ): Promise<ExpectedIncome> => {
      setSaving(true);
      setError(null);
      try {
        const result = await api.post<ExpectedIncome>("/api/v1/income/link", {
          expected_income_id: expectedIncomeId,
          transaction_id: transactionId,
          amount_cents: amountCents,
        });
        _invalidateAll();
        return result;
      } catch (err) {
        const msg = err instanceof ApiException ? err.error.message : "Failed to link transaction";
        setError(msg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const unlinkTransaction = useCallback(async (linkId: string): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      await api.delete(`/api/v1/income/link/${linkId}`);
      _invalidateAll();
    } catch (err) {
      const msg = err instanceof ApiException ? err.error.message : "Failed to unlink transaction";
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const generateExpected = useCallback(async (month?: string): Promise<ExpectedIncome[]> => {
    setSaving(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (month) params.set("month", month);
      const qs = params.toString();
      const result = await api.post<ExpectedIncome[]>(
        `/api/v1/income/generate${qs ? `?${qs}` : ""}`
      );
      _invalidateAll();
      return result;
    } catch (err) {
      const msg =
        err instanceof ApiException ? err.error.message : "Failed to generate expected incomes";
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return { linkTransaction, unlinkTransaction, generateExpected, saving, error };
}
