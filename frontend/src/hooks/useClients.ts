"use client";

/**
 * Hooks for freelance client management.
 *
 * - useClients(includeInactive?)  — fetch client list
 * - useClientMutations()          — create/update/delete clients
 */

import { useCallback, useEffect, useState } from "react";

import { api, ApiException } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Client, ClientCreate, ClientUpdate } from "@/types/income";

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

const _clientsCache = new Map<string, Client[]>();
let _refreshListeners: Array<() => void> = [];

function _cacheKey(includeInactive: boolean): string {
  return includeInactive ? "all" : "active";
}

export function _invalidateClients() {
  _clientsCache.clear();
  _refreshListeners.forEach((fn) => fn());
}

// ---------------------------------------------------------------------------
// useClients
// ---------------------------------------------------------------------------

interface UseClientsReturn {
  clients: Client[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useClients(includeInactive: boolean = false): UseClientsReturn {
  const { user, loading: authLoading } = useAuth();
  const key = _cacheKey(includeInactive);
  const cached = _clientsCache.get(key) ?? null;

  const [clients, setClients] = useState<Client[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    const existing = _clientsCache.get(key);
    if (!existing) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (includeInactive) params.set("include_inactive", "true");
      const qs = params.toString();
      const data = await api.get<Client[]>(`/api/v1/clients${qs ? `?${qs}` : ""}`);
      _clientsCache.set(key, data);
      setClients(data);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.message);
      } else {
        setError("Failed to load clients");
      }
    } finally {
      setLoading(false);
    }
  }, [key, includeInactive]);

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
    clients,
    loading: (loading && cached === null) || authLoading,
    error,
    refresh: fetch_,
  };
}

// ---------------------------------------------------------------------------
// useClientMutations
// ---------------------------------------------------------------------------

interface UseClientMutationsReturn {
  createClient: (data: ClientCreate) => Promise<Client>;
  updateClient: (clientId: string, data: ClientUpdate) => Promise<Client>;
  deleteClient: (clientId: string) => Promise<void>;
  saving: boolean;
  error: string | null;
}

export function useClientMutations(): UseClientMutationsReturn {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createClient = useCallback(async (data: ClientCreate): Promise<Client> => {
    setSaving(true);
    setError(null);
    try {
      const result = await api.post<Client>("/api/v1/clients", data);
      _invalidateClients();
      return result;
    } catch (err) {
      const msg = err instanceof ApiException ? err.error.message : "Failed to create client";
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateClient = useCallback(
    async (clientId: string, data: ClientUpdate): Promise<Client> => {
      setSaving(true);
      setError(null);
      try {
        const result = await api.put<Client>(`/api/v1/clients/${clientId}`, data);
        _invalidateClients();
        return result;
      } catch (err) {
        const msg = err instanceof ApiException ? err.error.message : "Failed to update client";
        setError(msg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const deleteClient = useCallback(async (clientId: string): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      await api.delete(`/api/v1/clients/${clientId}`);
      _invalidateClients();
    } catch (err) {
      const msg = err instanceof ApiException ? err.error.message : "Failed to delete client";
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return { createClient, updateClient, deleteClient, saving, error };
}
