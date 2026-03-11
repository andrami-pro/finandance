"use client";

/**
 * Hooks for project CRUD and funding-source listing.
 *
 * All read hooks use a module-level cache (stale-while-revalidate pattern):
 *   - On mount, cached data is returned immediately (no loading flash)
 *   - A background revalidation fires to keep data fresh
 *   - Cache persists across navigations within the same SPA session
 *
 * - useProjects()        — list current user's projects
 * - useProjectDetail()   — fetch a single project by ID
 * - useCreateProject()   — submit the wizard form
 * - useUpdateProject()   — update project from detail page
 * - useDeleteProject()   — delete project
 * - useFundingSources()  — fetch available funding sources for the wizard
 */

import { useCallback, useEffect, useState } from "react";

import { api, ApiException } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type {
  FundingSourceOption,
  FundingStrategy,
  ProjectListItem,
  ProjectResponse,
  Provider,
} from "@/types/projects";

// ---------------------------------------------------------------------------
// Funding-source API shape (matches backend GET /api/v1/funding-sources)
// ---------------------------------------------------------------------------

interface FundingSourceRow {
  id: string;
  integration_id: string;
  user_id: string;
  external_source_id: string;
  name: string;
  asset_type: string;
  currency: string;
  current_balance: number;
  balance_in_base_currency: number | null;
  updated_at: string;
  provider_name: string | null;
}

// ---------------------------------------------------------------------------
// Module-level caches
// ---------------------------------------------------------------------------

let _projectsCache: ProjectListItem[] | null = null;
const _projectDetailCache = new Map<string, ProjectResponse>();
let _fundingSourcesCache: FundingSourceOption[] | null = null;

// Simple event to notify mounted hooks that data changed
const _invalidationListeners = new Set<() => void>();

/** Invalidate project caches and notify mounted hooks to refetch */
function invalidateProjects() {
  _projectsCache = null;
  _projectDetailCache.clear();
  _invalidationListeners.forEach((fn) => fn());
}

// ---------------------------------------------------------------------------
// useProjects
// ---------------------------------------------------------------------------

interface UseProjectsReturn {
  projects: ProjectListItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useProjects(): UseProjectsReturn {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<ProjectListItem[]>(_projectsCache ?? []);
  const [loading, setLoading] = useState(_projectsCache === null);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    // Only show loading spinner if we have no cached data
    if (_projectsCache === null) setLoading(true);
    setError(null);
    try {
      const data = await api.get<ProjectListItem[]>("/api/v1/projects");
      _projectsCache = data;
      setProjects(data);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.message);
      } else {
        setError("Failed to load projects");
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

  // Re-fetch when cache is invalidated (e.g. after create/update/delete)
  useEffect(() => {
    _invalidationListeners.add(fetch_);
    return () => {
      _invalidationListeners.delete(fetch_);
    };
  }, [fetch_]);

  return {
    projects,
    loading: (loading && _projectsCache === null) || authLoading,
    error,
    refresh: fetch_,
  };
}

// ---------------------------------------------------------------------------
// useCreateProject
// ---------------------------------------------------------------------------

interface UseCreateProjectReturn {
  create: (payload: {
    name: string;
    target_amount: number;
    target_currency?: string;
    target_date?: string | null;
    category?: string | null;
    funding_strategy?: FundingStrategy | null;
    invited_emails?: string[];
    funding_source_ids?: string[];
  }) => Promise<ProjectResponse>;
  submitting: boolean;
  error: string | null;
}

export function useCreateProject(): UseCreateProjectReturn {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (payload: {
      name: string;
      target_amount: number;
      target_currency?: string;
      target_date?: string | null;
      category?: string | null;
      funding_strategy?: FundingStrategy | null;
      invited_emails?: string[];
      funding_source_ids?: string[];
    }): Promise<ProjectResponse> => {
      setSubmitting(true);
      setError(null);
      try {
        const result = await api.post<ProjectResponse>("/api/v1/projects", payload);
        invalidateProjects();
        return result;
      } catch (err) {
        const msg = err instanceof ApiException ? err.error.message : "Failed to create project";
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
// useFundingSources
// ---------------------------------------------------------------------------

interface UseFundingSourcesReturn {
  sources: FundingSourceOption[];
  loading: boolean;
  error: string | null;
}

export function useFundingSources(): UseFundingSourcesReturn {
  const { user, loading: authLoading } = useAuth();
  const [sources, setSources] = useState<FundingSourceOption[]>(_fundingSourcesCache ?? []);
  const [loading, setLoading] = useState(_fundingSourcesCache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;

    async function load() {
      if (_fundingSourcesCache === null) setLoading(true);
      setError(null);
      try {
        const rows = await api.get<FundingSourceRow[]>("/api/v1/funding-sources");
        if (cancelled) return;

        const mapped: FundingSourceOption[] = rows.map((row) => ({
          id: row.id,
          provider: (row.provider_name ?? "WISE") as Provider,
          name: row.name,
          currency: row.currency,
          currentBalance: Number(row.current_balance) || 0,
          balanceInBaseCurrency:
            row.balance_in_base_currency != null ? Number(row.balance_in_base_currency) || 0 : null,
          ownerName: "",
          selected: false,
        }));
        _fundingSourcesCache = mapped;
        setSources(mapped);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiException) {
          setError(err.error.message);
        } else {
          setError("Failed to load funding sources");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  return {
    sources,
    loading: (loading && _fundingSourcesCache === null) || authLoading,
    error,
  };
}

// ---------------------------------------------------------------------------
// useProjectDetail
// ---------------------------------------------------------------------------

interface UseProjectDetailReturn {
  project: ProjectResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useProjectDetail(projectId: string | null): UseProjectDetailReturn {
  const { user, loading: authLoading } = useAuth();
  const cached = projectId ? (_projectDetailCache.get(projectId) ?? null) : null;
  const [project, setProject] = useState<ProjectResponse | null>(cached);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!projectId) return;
    const hasCached = _projectDetailCache.has(projectId);
    if (!hasCached) setLoading(true);
    setError(null);
    try {
      const data = await api.get<ProjectResponse>(`/api/v1/projects/${projectId}`);
      _projectDetailCache.set(projectId, data);
      setProject(data);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.message);
      } else {
        setError("Failed to load project");
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

  // Re-fetch when cache is invalidated (e.g. after update/delete)
  useEffect(() => {
    _invalidationListeners.add(fetch_);
    return () => {
      _invalidationListeners.delete(fetch_);
    };
  }, [fetch_]);

  return {
    project,
    loading: (loading && cached === null) || authLoading,
    error,
    refresh: fetch_,
  };
}

// ---------------------------------------------------------------------------
// useUpdateProject
// ---------------------------------------------------------------------------

interface UseUpdateProjectReturn {
  update: (payload: {
    name?: string;
    target_amount?: number;
    target_currency?: string;
    target_date?: string | null;
    category?: string | null;
    funding_strategy?: FundingStrategy | null;
    funding_source_ids?: string[];
  }) => Promise<ProjectResponse>;
  submitting: boolean;
  error: string | null;
}

export function useUpdateProject(projectId: string): UseUpdateProjectReturn {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    async (payload: {
      name?: string;
      target_amount?: number;
      target_currency?: string;
      target_date?: string | null;
      category?: string | null;
      funding_strategy?: FundingStrategy | null;
      funding_source_ids?: string[];
    }): Promise<ProjectResponse> => {
      setSubmitting(true);
      setError(null);
      try {
        const result = await api.put<ProjectResponse>(`/api/v1/projects/${projectId}`, payload);
        invalidateProjects();
        return result;
      } catch (err) {
        const msg = err instanceof ApiException ? err.error.message : "Failed to update project";
        setError(msg);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [projectId]
  );

  return { update, submitting, error };
}

// ---------------------------------------------------------------------------
// useDeleteProject
// ---------------------------------------------------------------------------

interface UseDeleteProjectReturn {
  deleteProject: () => Promise<void>;
  deleting: boolean;
  error: string | null;
}

export function useDeleteProject(projectId: string): UseDeleteProjectReturn {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteProject = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/api/v1/projects/${projectId}`);
      invalidateProjects();
    } catch (err) {
      const msg = err instanceof ApiException ? err.error.message : "Failed to delete project";
      setError(msg);
      throw err;
    } finally {
      setDeleting(false);
    }
  }, [projectId]);

  return { deleteProject, deleting, error };
}
