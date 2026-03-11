"use client";

import {
  CurrencyEur,
  Diamond,
  Gear,
  PlugsConnected,
  Receipt,
  ShieldCheck,
  SignOut,
  SquaresFour,
  UsersThree,
  Wallet,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: SquaresFour },
  { label: "Transactions", href: "/transactions", icon: Receipt },
  { label: "Budget", href: "/budget", icon: Wallet },
  { label: "Income", href: "/income", icon: CurrencyEur },
  { label: "Shared Projects", href: "/shared-projects", icon: UsersThree },
  { label: "Integrations", href: "/integrations", icon: PlugsConnected, badge: 3 },
  { label: "Settings", href: "/settings", icon: Gear },
];

interface AppSidebarProps {
  userName?: string;
  userPlan?: string;
}

export function AppSidebar({ userName = "User", userPlan = "Free Plan" }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error.message);
      }
    } catch (err) {
      console.error("Sign out failed:", err);
    }
    // Always redirect to login, even if signOut had an error
    router.push("/login");
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar p-6">
      {/* Top: Logo + Nav */}
      <div className="flex flex-col gap-8">
        {/* Branding */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Diamond size={18} weight="fill" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
              Finandance
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
              Nova V3
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon, badge }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                  isActive
                    ? "border border-sidebar-border bg-card text-sidebar-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon
                  size={18}
                  weight={isActive ? "fill" : "regular"}
                  className={
                    isActive
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60"
                  }
                />
                <span className={`text-xs ${isActive ? "font-semibold" : "font-medium"}`}>
                  {label}
                </span>
                {badge !== undefined && (
                  <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-sidebar-primary/15 px-1 text-[9px] font-bold text-sidebar-primary">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Security badge + user */}
      <div className="flex flex-col gap-4">
        {/* Security badge */}
        <div className="rounded-lg border border-sidebar-primary/20 bg-sidebar-primary/5 p-3">
          <div className="mb-1 flex items-center gap-2 text-sidebar-primary">
            <ShieldCheck size={16} weight="fill" className="text-sidebar-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wide">Security</span>
          </div>
          <p className="text-[10px] leading-relaxed text-sidebar-primary/80">
            Your session is encrypted and 2FA secured.
          </p>
        </div>

        {/* User profile */}
        <div className="flex items-center gap-3 border-t border-sidebar-border pt-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/15 text-xs font-bold text-sidebar-primary">
            {initials}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-bold text-sidebar-foreground">{userName}</span>
            <span className="text-[10px] text-sidebar-foreground/60">{userPlan}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="ml-auto text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
            aria-label="Sign out"
          >
            <SignOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
