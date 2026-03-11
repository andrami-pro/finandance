"use client";

import { CheckCircle, CurrencyDollar, CurrencyBtc, Info } from "@phosphor-icons/react";
import type { FundingStrategy } from "@/types/projects";

// ---------------------------------------------------------------------------
// Strategy options
// ---------------------------------------------------------------------------

interface StrategyOption {
  id: FundingStrategy;
  label: string;
  description: string;
  icon: typeof CurrencyDollar;
}

const STRATEGIES: StrategyOption[] = [
  {
    id: "fiat",
    label: "Fiat Strategy",
    description: "Save in EUR/USD using high-yield jars. Ideal for short-term goals.",
    icon: CurrencyDollar,
  },
  {
    id: "crypto",
    label: "Crypto Strategy",
    description:
      "Save in BTC/ETH using exchange wallets or cold storage. Ideal for long-term growth.",
    icon: CurrencyBtc,
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StepStrategyProps {
  selected: FundingStrategy | null;
  onSelect: (strategy: FundingStrategy) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepStrategy({ selected, onSelect }: StepStrategyProps) {
  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h3 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          Choose Funding Strategy
        </h3>
        <p className="text-xs text-muted-foreground">
          Select how you would like to manage your project funds.
        </p>
      </div>

      {/* Strategy cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {STRATEGIES.map((strategy) => {
          const isSelected = selected === strategy.id;
          const Icon = strategy.icon;

          return (
            <button
              key={strategy.id}
              type="button"
              onClick={() => onSelect(strategy.id)}
              className={`relative flex flex-col items-start rounded-md border p-5 text-left shadow-sm transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 hover:bg-primary/10"
                  : "border-border bg-card hover:border-primary/30 hover:bg-muted/30"
              }`}
            >
              {/* Check indicator */}
              {isSelected && (
                <div className="absolute right-3 top-3">
                  <CheckCircle size={20} weight="fill" className="text-primary" />
                </div>
              )}

              {/* Icon */}
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-md ${
                  isSelected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon size={22} />
              </div>

              {/* Text */}
              <span className="mb-1 text-sm font-bold text-foreground">{strategy.label}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {strategy.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Info note */}
      <div className="mt-6 flex items-start gap-2.5 rounded-md border border-border bg-muted/30 p-4">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Strategies can be adjusted later, but switching may incur small rebalancing fees depending
          on the assets held.
        </p>
      </div>
    </>
  );
}
