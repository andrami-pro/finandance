import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware — lightweight route protection via cookie presence check.
 *
 * The real session validation (and secure redirect on expired tokens) happens
 * in (dashboard)/layout.tsx using the Supabase SSR server client. This
 * middleware only handles the fast-path for unauthenticated users to avoid
 * rendering the full app shell before redirecting.
 *
 * Supabase v2 stores auth in a cookie named:
 *   sb-<project-ref>-auth-token  (legacy)
 *   sb-<project-ref>-auth-token.0 / .1 (chunked, newer)
 * We detect any "sb-*-auth-token*" cookie to determine session presence.
 */

const PROTECTED_PATHS = [
  "/dashboard",
  "/shared-projects",
  "/integrations",
  "/settings",
  "/budget",
  "/transactions",
  "/income",
];
const AUTH_PATHS = ["/login", "/signup"];

function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") &&
        (cookie.name.endsWith("-auth-token") || cookie.name.includes("-auth-token."))
    );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthenticated = hasSupabaseSession(request);
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
