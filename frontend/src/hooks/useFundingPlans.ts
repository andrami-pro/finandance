"use client";

/**
 * Hooks for funding plan CRUD.
 *
 * Uses the same stale-while-revalidate pattern as useProjects.
 *
 * - useFundingPlans(projectId) — list plans for a project
 * - useCreateFundingPlan()     — POST + invalidate cache
 * - useUpdateFundingPlan()     — PUT + invalidate cache
 * - useDeleteFundingPlan()     — DELETE + invalidate cache
 */

import { useCallback, useEffect, useState } from "react";

import { api, ApiException } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { FundingPlanResponse, PlanFrequency, PlanType } from "@/types/projects";

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

const _plansCache = new Map<string, FundingPlanResponse[]>();

const _invalidationListeners = new Set<() => void>();

function invalidateFundingPlans() {
  _plansCache.clear();
  _invalidationListeners.forEach((fn) => fn());
}

// ---------------------------------------------------------------------------
// useFundingPlans
// ---------------------------------------------------------------------------

interface UseFundingPlansReturn {
  plans: FundingPlanResponse[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useFundingPlans(projectId: string | null): UseFundingPlansReturn {
  const { user, loading: authLoading } = useAuth();
  const cached = projectId ? (_plansCache.get(projectId) ?? null) : null;
  const [plans, setPlans] = useState<FundingPlanResponse[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!projectId) return;
    const hasCached = _plansCache.has(projectId);
    if (!hasCached) setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ items: FundingPlanResponse[]; count: number }>(
        `/api/v1/funding-plans?project_id=${projectId}`
      );
      _plansCache.set(projectId, data.items);
      setPlans(data.items);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.message);
      } else {
        setError("Failed to load funding plans");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!authLoading && user && projectId) {
      fetch_();
    }
  }, [authLoading, user, projectId, fetch_]);

  useEffect(() => {
    _invalidationListeners.add(fetch_);
    return () => {
      _invalidationListeners.delete(fetch_);
    };
  }, [fetch_]);

  return {
    plans,
    loading: (loading && cached === null) || authLoading,
    error,
    refresh: fetch_,
  };
}

// ---------------------------------------------------------------------------
// useCreateFundingPlan
// ---------------------------------------------------------------------------

interface CreateFundingPlanPayload {
  project_id: string;
  funding_source_id?: string | null;
  plan_type: PlanType;
  amount: number;
  currency: string;
  frequency?: PlanFrequency | null;
}

interface UseCreateFundingPlanReturn {
  create: (payload: CreateFundingPlanPayload) => Promise<FundingPlanResponse>;
  submitting: boolean;
  error: string | null;
}

export function useCreateFundingPlan(): UseCreateFundingPlanReturn {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (payload: CreateFundingPlanPayload): Promise<FundingPlanResponse> => {
      setSubmitting(true);
      setError(null);
      try {
        const result = await api.post<FundingPlanResponse>("/api/v1/funding-plans", payload);
        invalidateFundingPlans();
        return result;
      } catch (err) {
        const msg =
          err instanceof ApiException ? err.error.message : "Failed to create funding plan";
        setError(msg);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return { create, submitting, error };
}

// ---------------------------------------------------------------------------
// useUpdateFundingPlan
// ---------------------------------------------------------------------------

interface UpdateFundingPlanPayload {
  funding_source_id?: string | null;
  amount?: number;
  frequency?: PlanFrequency | null;
  is_active?: boolean;
}

interface UseUpdateFundingPlanReturn {
  update: (payload: UpdateFundingPlanPayload) => Promise<FundingPlanResponse>;
  submitting: boolean;
  error: string | null;
}

export function useUpdateFundingPlan(planId: string): UseUpdateFundingPlanReturn {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    async (payload: UpdateFundingPlanPayload): Promise<FundingPlanResponse> => {
      setSubmitting(true);
      setError(null);
      try {
        const result = await api.put<FundingPlanResponse>(
          `/api/v1/funding-plans/${planId}`,
          payload
        );
        invalidateFundingPlans();
        return result;
      } catch (err) {
        const msg =
          err instanceof ApiException ? err.error.message : "Failed to update funding plan";
        setError(msg);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [planId]
  );

  return { update, submitting, error };
}

// ---------------------------------------------------------------------------
// useDeleteFundingPlan
// ---------------------------------------------------------------------------

interface UseDeleteFundingPlanReturn {
  deletePlan: () => Promise<void>;
  deleting: boolean;
  error: string | null;
}

export function useDeleteFundingPlan(planId: string): UseDeleteFundingPlanReturn {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletePlan = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/api/v1/funding-plans/${planId}`);
      invalidateFundingPlans();
    } catch (err) {
      const msg = err instanceof ApiException ? err.error.message : "Failed to delete funding plan";
      setError(msg);
      throw err;
    } finally {
      setDeleting(false);
    }
  }, [planId]);

  return { deletePlan, deleting, error };
}
