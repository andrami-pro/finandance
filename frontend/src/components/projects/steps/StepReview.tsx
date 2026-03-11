"use client";

import {
  AirplaneTilt,
  CalendarBlank,
  Car,
  CurrencyBtc,
  CurrencyDollar,
  CurrencyEur,
  Flag,
  Heart,
  House,
  Info,
  Lightning,
  Compass,
} from "@phosphor-icons/react";
import type {
  FundingStrategy,
  ProjectCategory,
  ProjectCurrency,
  ProjectDetails,
  ProjectMember,
} from "@/types/projects";
import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";

// ---------------------------------------------------------------------------
// Category icon mapping
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<ProjectCategory, ComponentType<IconProps>> = {
  travel: AirplaneTilt,
  home: House,
  auto: Car,
  family: Heart,
  emergency: Lightning,
};

const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  travel: "Shared Vacation Fund",
  home: "Home Improvement Fund",
  auto: "Vehicle Fund",
  family: "Family Fund",
  emergency: "Emergency Reserve",
};

const CURRENCY_ICONS: Record<ProjectCurrency, ComponentType<IconProps>> = {
  EUR: CurrencyEur,
  USD: CurrencyDollar,
  BTC: CurrencyBtc,
};

const CURRENCY_SYMBOLS: Record<ProjectCurrency, string> = {
  EUR: "€",
  USD: "$",
  BTC: "₿",
};

const STRATEGY_LABELS: Record<FundingStrategy, string> = {
  fiat: "Fiat Strategy",
  crypto: "Crypto Strategy",
};

const STRATEGY_DESCRIPTIONS: Record<FundingStrategy, string> = {
  fiat: "Save in EUR/USD using high-yield jars",
  crypto: "Save in BTC/ETH using exchange wallets or cold storage",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StepReviewProps {
  details: ProjectDetails;
  members: ProjectMember[];
  fundingStrategy: FundingStrategy | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepReview({ details, members, fundingStrategy }: StepReviewProps) {
  const targetAmount = details.targetAmount ?? 0;
  const currency = details.targetCurrency ?? "EUR";
  const symbol = CURRENCY_SYMBOLS[currency];
  const CurrencyIcon = CURRENCY_ICONS[currency];

  const CategoryIcon = details.category ? CATEGORY_ICONS[details.category] : Flag;

  const categoryLabel = details.category ? CATEGORY_LABELS[details.category] : "Shared Project";

  const formattedDate = details.targetDate
    ? new Date(details.targetDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Not set";

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h3 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          Review your project
        </h3>
        <p className="text-xs text-muted-foreground">
          Verify all details before creating this shared financial space.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-md border border-border bg-muted/30 p-6 shadow-sm">
        {/* Project identity */}
        <div className="mb-6 flex items-start gap-4 border-b border-dashed border-border pb-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <CategoryIcon size={24} className="text-primary" />
          </div>
          <div>
            <h4 className="mb-1 text-lg font-bold text-foreground">
              {details.name || "Untitled Project"}
            </h4>
            <p className="text-xs font-medium text-muted-foreground">{categoryLabel}</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          {/* Goal Details */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Goal Details
            </span>
            <div className="mt-1 flex items-center gap-2">
              <Flag size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">
                Target:{" "}
                <span className="font-bold">
                  {symbol}
                  {currency === "BTC"
                    ? targetAmount
                    : targetAmount.toLocaleString("en", { minimumFractionDigits: 0 })}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarBlank size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">Date: {formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <CurrencyIcon size={16} className="text-primary" />
              <span className="text-sm font-medium text-foreground">Currency: {currency}</span>
            </div>
          </div>

          {/* Team Members */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Team Members
            </span>
            <div className="mt-1 flex items-center gap-2">
              {/* Avatar stack */}
              <div className="flex -space-x-2">
                {members.slice(0, 4).map((member, i) => (
                  <div
                    key={member.email}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary/10 text-[10px] font-bold text-primary"
                    style={{ zIndex: members.length - i }}
                  >
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                ))}
                {members.length > 4 && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-bold text-muted-foreground">
                    +{members.length - 4}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-foreground">
                {members.map((m) => m.displayName).join(", ")}
              </span>
            </div>
          </div>

          {/* Funding Strategy */}
          <div className="col-span-1 flex flex-col gap-1 md:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Funding Strategy
            </span>
            <div className="mt-1 flex items-center gap-2">
              <Compass size={16} className="text-primary" />
              {fundingStrategy ? (
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {STRATEGY_LABELS[fundingStrategy]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {STRATEGY_DESCRIPTIONS[fundingStrategy]}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">No strategy selected</span>
              )}
            </div>
            {fundingStrategy && (
              <div className="ml-6 mt-2 flex items-center gap-1.5">
                <Info size={12} className="shrink-0 text-primary" />
                <span className="text-xs text-muted-foreground">
                  {fundingStrategy === "crypto"
                    ? "After creation, you'll be guided to connect your wallet"
                    : "After creation, you'll link your savings accounts"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Info bar */}
        <div className="mt-6 border-t border-dashed border-border pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Compass size={14} className="text-primary" />
            <span>Strategy can be adjusted later from the project settings.</span>
          </div>
        </div>
      </div>
    </>
  );
}
