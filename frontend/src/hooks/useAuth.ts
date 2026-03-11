"use client";

/**
 * useAuth — Supabase Auth session management hook.
 *
 * Uses a module-level cache so ALL components calling useAuth() share
 * the same auth state. This eliminates:
 *   - Multiple independent getSession() calls per page
 *   - Flash of loading state on navigation (cached user is available instantly)
 *
 * Provides:
 *   - `user`      Current authenticated user (or null if not signed in)
 *   - `session`   Full Supabase session (includes access_token)
 *   - `loading`   True only on the very first session fetch (cold start)
 *   - `signOut`   Convenience wrapper around supabase.auth.signOut()
 */

import { useEffect, useSyncExternalStore } from "react";

import type { Session, User } from "@supabase/supabase-js";

import { setTokenProvider } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Module-level shared auth store
// ---------------------------------------------------------------------------

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

let _state: AuthState = {
  user: null,
  session: null,
  loading: true,
};

const _listeners = new Set<() => void>();

function getSnapshot(): AuthState {
  return _state;
}

function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function _setState(next: AuthState) {
  _state = next;
  _listeners.forEach((l) => l());
}

// ---------------------------------------------------------------------------
// One-time initialisation (runs once per app lifecycle)
// ---------------------------------------------------------------------------

let _initialised = false;

function ensureInitialised() {
  if (_initialised) return;
  _initialised = true;

  // 1. Load the initial session
  supabase.auth.getSession().then(({ data }) => {
    const session = data.session;
    _setState({
      user: session?.user ?? null,
      session,
      loading: false,
    });
    setTokenProvider(() => session?.access_token ?? null);
  });

  // 2. Subscribe to auth state changes (login, logout, token refresh)
  supabase.auth.onAuthStateChange((_event, session) => {
    _setState({
      user: session?.user ?? null,
      session,
      loading: false,
    });
    setTokenProvider(() => session?.access_token ?? null);
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthState & { signOut: () => Promise<void> } {
  // Ensure the one-time init runs (safe to call multiple times)
  useEffect(() => {
    ensureInitialised();
  }, []);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  return { ...state, signOut };
}

// ---------------------------------------------------------------------------
// Session Gate helper (for route protection)
// ---------------------------------------------------------------------------

/**
 * Returns true if there is an authenticated session.
 * Useful for middleware-level checks (see frontend/middleware.ts in Phase 7).
 */
export async function hasActiveSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return data.session !== null;
}
