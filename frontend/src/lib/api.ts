/**
 * Shared API client for the Finandance FastAPI backend.
 *
 * Usage:
 *   import { api } from '@/lib/api';
 *   const data = await api.get<FundingSource[]>('/api/v1/funding-sources');
 *
 * Auth tokens are injected automatically via the token provider registered
 * by useAuth (see hooks/useAuth.ts). This avoids a circular import between
 * api.ts and supabaseClient.ts.
 */

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiException extends Error {
  constructor(
    public readonly status: number,
    public readonly error: ApiError
  ) {
    super(error.message);
    this.name = "ApiException";
  }
}

// ---------------------------------------------------------------------------
// Token provider (set by useAuth after session initialises)
// ---------------------------------------------------------------------------

type TokenProvider = () => string | null;
let _tokenProvider: TokenProvider | null = null;

/**
 * Register a function that returns the current access token.
 * Called once by useAuth when the Supabase session is ready.
 */
export function setTokenProvider(provider: TokenProvider): void {
  _tokenProvider = provider;
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; headers?: Record<string, string> } = {}
): Promise<T> {
  const token = _tokenProvider?.() ?? null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${path}`;
  console.debug("[api] request", {
    method,
    url,
    hasToken: Boolean(token),
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    console.error("[api] network error", { method, url, err });
    throw err;
  }

  // 204 No Content — return undefined cast to T
  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    let error: ApiError;
    try {
      const payload = await response.json();
      error =
        payload?.error ??
        ({ code: `HTTP_${response.status}`, message: response.statusText } satisfies ApiError);
    } catch {
      error = { code: `HTTP_${response.status}`, message: response.statusText };
    }
    throw new ApiException(response.status, error);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API surface
// ---------------------------------------------------------------------------

export const api = {
  get: <T>(path: string, headers?: Record<string, string>) => request<T>("GET", path, { headers }),

  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>("POST", path, { body, headers }),

  put: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>("PUT", path, { body, headers }),

  patch: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>("PATCH", path, { body, headers }),

  delete: <T>(path: string, headers?: Record<string, string>) =>
    request<T>("DELETE", path, { headers }),
} as const;
