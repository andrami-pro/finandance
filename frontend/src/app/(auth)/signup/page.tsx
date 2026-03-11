"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";

import { Diamond, Eye, EyeSlash } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // session is null when Supabase requires email confirmation before login.
    // session is present when auto-confirm is enabled (e.g. local dev mode).
    if (!data.session) {
      setEmailSent(true);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/dashboard");
  }

  // ── Email confirmation pending state ────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <Diamond size={24} weight="fill" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">
            Finandance
          </span>
        </div>
        <div className="rounded-md border border-border/50 bg-card p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-md border border-primary/20 bg-primary/10">
            <svg
              className="h-7 w-7 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 7.5-9.75-7.5"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Check your email</h1>
          <p className="mb-1 text-xs leading-relaxed text-muted-foreground">
            We sent a confirmation link to
          </p>
          <p className="mb-6 text-sm font-semibold text-foreground">{email}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Click the link in the email to activate your account. Check your spam folder if it
            doesn&apos;t arrive within a few minutes.
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Wrong email?{" "}
          <button
            onClick={() => setEmailSent(false)}
            className="font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Go back
          </button>
        </p>
      </div>
    );
  }

  // ── Signup form ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md space-y-8">
      {/* Branding */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
          <Diamond size={24} weight="fill" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-foreground">
          Finandance
        </span>
      </div>

      {/* Card */}
      <div className="rounded-md border border-border/50 bg-card p-8 shadow-sm sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-foreground">Start your financial journey</h1>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Create an account to manage shared projects and track your wealth securely.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="full-name"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground"
              >
                Full Name
              </label>
              <input
                id="full-name"
                type="text"
                autoComplete="name"
                required
                placeholder="e.g. Elena Rodriguez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 pr-10 text-sm text-foreground placeholder-muted-foreground transition-all focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </div>
        </form>

        {/* OAuth divider */}
        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-3.44 2.252-5.26 4.46-5.26 1.57 0 2.96.95 3.877.95.817 0 2.342-1.01 4.13-1.01.65 0 2.898.06 4.394 2.19zm-5.669-1.72c.03-.03.07-.03.11-.03.15 0 .3.08.3.26 0 .1-.06.22-.15.3-.16.13-.39.19-.6.19-.12 0-.22-.03-.3-.07.09-.28.34-.53.64-.65z" />
              </svg>
              Apple
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary transition-colors hover:text-primary/80"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
