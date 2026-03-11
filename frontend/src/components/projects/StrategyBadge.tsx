"use client";

import { CurrencyBtc, CurrencyDollar } from "@phosphor-icons/react";
import type { FundingStrategy } from "@/types/projects";

interface StrategyBadgeProps {
  strategy: FundingStrategy | null;
}

export function StrategyBadge({ strategy }: StrategyBadgeProps) {
  if (!strategy) return null;

  const isCrypto = strategy === "crypto";

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
      {isCrypto ? (
        <CurrencyBtc size={12} weight="bold" />
      ) : (
        <CurrencyDollar size={12} weight="bold" />
      )}
      {isCrypto ? "Crypto" : "Fiat"}
    </span>
  );
}
