/**
 * Supabase browser client (anon key).
 *
 * Use this client in client components and hooks for auth and realtime.
 * Server-side operations use the service role key (backend only — never
 * expose SUPABASE_SERVICE_ROLE_KEY to the browser).
 */

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy frontend/.env.local.example to frontend/.env.local and fill in the values."
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
