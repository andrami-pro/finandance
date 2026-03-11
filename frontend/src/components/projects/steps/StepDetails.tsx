"use client";

import {
  AirplaneTilt,
  Car,
  CalendarBlank,
  CurrencyEur,
  CurrencyDollar,
  CurrencyBtc,
  Heart,
  House,
  Lightning,
} from "@phosphor-icons/react";
import type { ProjectCategory, ProjectCurrency, ProjectDetails } from "@/types/projects";
import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";
import { useBtcPrice } from "@/hooks/useBtcPrice";

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

interface CategoryOption {
  key: ProjectCategory;
  label: string;
  Icon: ComponentType<IconProps>;
}

const CATEGORIES: CategoryOption[] = [
  { key: "travel", label: "Travel", Icon: AirplaneTilt },
  { key: "home", label: "Home", Icon: House },
  { key: "auto", label: "Auto", Icon: Car },
  { key: "family", label: "Family", Icon: Heart },
  { key: "emergency", label: "Emergency", Icon: Lightning },
];

// ---------------------------------------------------------------------------
// Currency config
// ---------------------------------------------------------------------------

interface CurrencyOption {
  key: ProjectCurrency;
  label: string;
  symbol: string;
  Icon: ComponentType<IconProps>;
}

const CURRENCIES: CurrencyOption[] = [
  { key: "EUR", label: "Euro", symbol: "€", Icon: CurrencyEur },
  { key: "USD", label: "Dollar", symbol: "$", Icon: CurrencyDollar },
  { key: "BTC", label: "Bitcoin", symbol: "₿", Icon: CurrencyBtc },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StepDetailsProps {
  data: ProjectDetails;
  onChange: (data: ProjectDetails) => void;
  errors: Partial<Record<keyof ProjectDetails, string>>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepDetails({ data, onChange, errors }: StepDetailsProps) {
  const update = (patch: Partial<ProjectDetails>) => onChange({ ...data, ...patch });

  const currencySymbol = CURRENCIES.find((c) => c.key === data.targetCurrency)?.symbol ?? "€";
  const btcPrice = useBtcPrice();

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h3 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          What are we saving for?
        </h3>
        <p className="text-xs text-muted-foreground">
          Start by giving your shared project a name and setting a target.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Project Name */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-foreground">
            Project Name
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g., Summer Trip to Japan"
            className={`w-full rounded-md border bg-muted px-4 py-3 text-lg text-foreground placeholder-muted-foreground/50 shadow-sm transition-all focus:border-primary focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary ${
              errors.name ? "border-destructive" : "border-border"
            }`}
          />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
        </div>

        {/* Store currency */}
        <div>
          <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-foreground">
            Project Currency
          </label>
          <div className="grid grid-cols-3 gap-3">
            {CURRENCIES.map(({ key, label, symbol, Icon }) => {
              const isSelected = data.targetCurrency === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => update({ targetCurrency: key })}
                  className={`group flex items-center gap-3 rounded-md border p-3 shadow-sm transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-md shadow-sm transition-transform group-hover:scale-105 ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-muted group-hover:bg-card"
                    }`}
                  >
                    <Icon size={18} weight="bold" />
                  </div>
                  <div className="text-left">
                    <span className={`block text-xs ${isSelected ? "font-bold" : "font-medium"}`}>
                      {label}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {symbol} {key}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Amount + Date */}
        <div className="grid grid-cols-2 gap-6">
          {/* Amount */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-foreground">
              Target Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={data.targetAmount ?? ""}
                onChange={(e) =>
                  update({
                    targetAmount: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="0.00"
                min={0}
                step={data.targetCurrency === "BTC" ? 0.00000001 : 0.01}
                className={`w-full rounded-md border bg-card py-2.5 pl-8 pr-4 text-sm text-foreground placeholder-muted-foreground/50 shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                  errors.targetAmount ? "border-destructive" : "border-border"
                }`}
              />
            </div>
            {errors.targetAmount && (
              <p className="mt-1 text-xs text-destructive">{errors.targetAmount}</p>
            )}
            {data.targetCurrency === "BTC" && (
              <p className="mt-1 text-xs text-muted-foreground">
                {btcPrice.loading
                  ? "…"
                  : data.targetAmount && btcPrice.eur
                    ? `≈ €${(data.targetAmount * btcPrice.eur).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} @ €${btcPrice.eur.toLocaleString("de-DE")}/BTC`
                    : btcPrice.eur
                      ? `@ €${btcPrice.eur.toLocaleString("de-DE")}/BTC`
                      : null}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-foreground">
              Target Date
            </label>
            <div className="relative">
              <CalendarBlank
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="date"
                value={data.targetDate}
                onChange={(e) => update({ targetDate: e.target.value })}
                className="w-full rounded-md border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground/50 shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-foreground">
            Category
          </label>
          <div className="grid grid-cols-5 gap-3">
            {CATEGORIES.map(({ key, label, Icon }) => {
              const isSelected = data.category === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => update({ category: isSelected ? null : key })}
                  className={`group flex flex-col items-center justify-center gap-2 rounded-md border p-3 shadow-sm transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-transform group-hover:scale-110 ${
                      isSelected ? "bg-card" : "border border-border bg-muted group-hover:bg-card"
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <span className={`text-[10px] ${isSelected ? "font-bold" : "font-medium"}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
