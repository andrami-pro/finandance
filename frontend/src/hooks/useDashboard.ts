"use client";

/**
 * Hooks for dashboard data and compatible source detection.
 *
 * - useDashboardSummary()     — aggregated net worth, goals, integrations
 * - useCompatibleSources()    — funding sources matching a project's currency
 *
 * Both use the same stale-while-revalidate pattern as useProjects.
 */

import { useCallback, useEffect, useState } from "react";

import { api, ApiException } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { CompatibleSource, DashboardSummary } from "@/types/dashboard";

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

let _dashboardCache: DashboardSummary | null = null;
const _compatibleCache = new Map<string, CompatibleSource[]>();

// ---------------------------------------------------------------------------
// useDashboardSummary
// ---------------------------------------------------------------------------

interface UseDashboardSummaryReturn {
  summary: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDashboardSummary(): UseDashboardSummaryReturn {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(_dashboardCache);
  const [loading, setLoading] = useState(_dashboardCache === null);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (_dashboardCache === null) setLoading(true);
    setError(null);
    try {
      const data = await api.get<DashboardSummary>("/api/v1/dashboard/summary");
      _dashboardCache = data;
      setSummary(data);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.message);
      } else {
        setError("Failed to load dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetch_();
    }
  }, [authLoading, user, fetch_]);

  return {
    summary,
    loading: (loading && _dashboardCache === null) || authLoading,
    error,
    refresh: fetch_,
  };
}

// ---------------------------------------------------------------------------
// useCompatibleSources
// ---------------------------------------------------------------------------

interface UseCompatibleSourcesReturn {
  sources: CompatibleSource[];
  loading: boolean;
  error: string | null;
  hasCompatible: boolean;
}

export function useCompatibleSources(targetCurrency: string | null): UseCompatibleSourcesReturn {
  const { user, loading: authLoading } = useAuth();
  const cacheKey = targetCurrency?.toUpperCase() ?? "";
  const cached = cacheKey ? (_compatibleCache.get(cacheKey) ?? null) : null;

  const [sources, setSources] = useState<CompatibleSource[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null && !!targetCurrency);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !targetCurrency) return;

    let cancelled = false;

    async function load() {
      const existing = _compatibleCache.get(cacheKey);
      if (!existing) setLoading(true);
      setError(null);
      try {
        const data = await api.get<CompatibleSource[]>(
          `/api/v1/dashboard/compatible-sources?target_currency=${encodeURIComponent(targetCurrency!)}`
        );
        if (cancelled) return;
        _compatibleCache.set(cacheKey, data);
        setSources(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiException) {
          setError(err.error.message);
        } else {
          setError("Failed to check compatible sources");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, targetCurrency, cacheKey]);

  return {
    sources,
    loading: (loading && cached === null) || authLoading,
    error,
    hasCompatible: sources.length > 0,
  };
}
