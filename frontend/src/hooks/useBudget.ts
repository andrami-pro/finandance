"use client";

/**
 * Hooks for budget data and limit management.
 *
 * - useBudgetSummary(period, month)     — budget overview with per-category status
 * - useBudgetCategories(period, month)  — category spending breakdown for charts
 * - useBudgetLimits()                   — save/delete budget limits (mutations)
 */

import { useCallback, useEffect, useState } from "react";

import { api, ApiException } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type {
  BudgetLimitItem,
  BudgetLimitUpsert,
  BudgetSummary,
  CategoryBreakdownResponse,
} from "@/types/budget";

// ---------------------------------------------------------------------------
// Module-level cache (keyed by period+month)
// ---------------------------------------------------------------------------

const _summaryCache = new Map<string, BudgetSummary>();
const _breakdownCache = new Map<string, CategoryBreakdownResponse>();
let _refreshListeners: Array<() => void> = [];

function _cacheKey(period: string, month?: string): string {
  return `${period}:${month ?? "current"}`;
}

function _invalidateAll() {
  _summaryCache.clear();
  _breakdownCache.clear();
  _refreshListeners.forEach((fn) => fn());
}

// ---------------------------------------------------------------------------
// useBudgetSummary
// ---------------------------------------------------------------------------

interface UseBudgetSummaryReturn {
  summary: BudgetSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBudgetSummary(
  period: string = "monthly",
  month?: string
): UseBudgetSummaryReturn {
  const { user, loading: authLoading } = useAuth();
  const key = _cacheKey(period, month);
  const cached = _summaryCache.get(key) ?? null;

  const [summary, setSummary] = useState<BudgetSummary | null>(cached);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    const existing = _summaryCache.get(key);
    if (!existing) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period });
      if (month) params.set("month", month);
      const data = await api.get<BudgetSummary>(`/api/v1/budget/summary?${params.toString()}`);
      _summaryCache.set(key, data);
      setSummary(data);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.message);
      } else {
        setError("Failed to load budget summary");
      }
    } finally {
      setLoading(false);
    }
  }, [key, period, month]);

  useEffect(() => {
    if (!authLoading && user) {
      fetch_();
    }
  }, [authLoading, user, fetch_]);

  // Listen for invalidation from mutations
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
// useBudgetCategories
// ---------------------------------------------------------------------------

interface UseBudgetCategoriesReturn {
  breakdown: CategoryBreakdownResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBudgetCategories(
  period: string = "monthly",
  month?: string,
  compare: boolean = false
): UseBudgetCategoriesReturn {
  const { user, loading: authLoading } = useAuth();
  const key = _cacheKey(period, month) + (compare ? ":cmp" : "");
  const cached = _breakdownCache.get(key) ?? null;

  const [breakdown, setBreakdown] = useState<CategoryBreakdownResponse | null>(cached);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    const existing = _breakdownCache.get(key);
    if (!existing) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period });
      if (month) params.set("month", month);
      if (compare) params.set("compare", "true");
      const data = await api.get<CategoryBreakdownResponse>(
        `/api/v1/budget/categories?${params.toString()}`
      );
      _breakdownCache.set(key, data);
      setBreakdown(data);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.message);
      } else {
        setError("Failed to load category breakdown");
      }
    } finally {
      setLoading(false);
    }
  }, [key, period, month, compare]);

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
    breakdown,
    loading: (loading && cached === null) || authLoading,
    error,
    refresh: fetch_,
  };
}

// ---------------------------------------------------------------------------
// useBudgetLimits (mutations)
// ---------------------------------------------------------------------------

interface UseBudgetLimitsReturn {
  saveLimits: (limits: BudgetLimitUpsert[], period?: string) => Promise<BudgetLimitItem[]>;
  deleteLimit: (category: string, period?: string) => Promise<void>;
  saving: boolean;
  error: string | null;
}

export function useBudgetLimits(): UseBudgetLimitsReturn {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveLimits = useCallback(
    async (limits: BudgetLimitUpsert[], period: string = "monthly"): Promise<BudgetLimitItem[]> => {
      setSaving(true);
      setError(null);
      try {
        const result = await api.put<BudgetLimitItem[]>("/api/v1/budget/limits", {
          period,
          limits,
        });
        _invalidateAll();
        return result;
      } catch (err) {
        const msg =
          err instanceof ApiException ? err.error.message : "Failed to save budget limits";
        setError(msg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const deleteLimit = useCallback(
    async (category: string, period: string = "monthly"): Promise<void> => {
      setSaving(true);
      setError(null);
      try {
        await api.delete(`/api/v1/budget/limits/${encodeURIComponent(category)}?period=${period}`);
        _invalidateAll();
      } catch (err) {
        const msg =
          err instanceof ApiException ? err.error.message : "Failed to delete budget limit";
        setError(msg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return { saveLimits, deleteLimit, saving, error };
}
