/**
 * Shared category constants for transactions and budget pages.
 *
 * Single source of truth for the 16 spending categories,
 * their Tailwind badge styles, and chart colors.
 */

export const CATEGORIES = [
  "Uncategorized",
  "Transfer",
  "Investment",
  "Income",
  "Food & Drink",
  "Groceries",
  "Travel",
  "Housing",
  "Transport",
  "Entertainment",
  "Shopping",
  "Health",
  "Subscriptions",
  "Savings",
  "Family & Gifts",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Budget-assignable categories (excludes Uncategorized). */
export const BUDGETABLE_CATEGORIES = CATEGORIES.filter((c) => c !== "Uncategorized");

/** Tailwind classes for category badges (bg + border + text). */
export const CATEGORY_STYLES: Record<string, string> = {
  Transfer: "bg-[#eff6ff] border-[#dbeafe] text-[#1d4ed8]",
  Investment: "bg-[#faf5ff] border-[#f3e8ff] text-[#7e22ce]",
  Income: "bg-primary/5 border-primary/15 text-primary",
  "Food & Drink": "bg-[#fff7ed] border-[#ffedd5] text-[#c2410c]",
  Groceries: "bg-[#fff7ed] border-[#ffedd5] text-[#c2410c]",
  Travel: "bg-[#ecfeff] border-[#cffafe] text-[#0e7490]",
  Housing: "bg-[#fef3c7] border-[#fde68a] text-[#92400e]",
  Transport: "bg-[#e0e7ff] border-[#c7d2fe] text-[#3730a3]",
  Entertainment: "bg-[#fce7f3] border-[#fbcfe8] text-[#9d174d]",
  Shopping: "bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]",
  Health: "bg-[#fef2f2] border-[#fecaca] text-[#991b1b]",
  Subscriptions: "bg-[#f5f3ff] border-[#ddd6fe] text-[#5b21b6]",
  Savings: "bg-primary/5 border-primary/15 text-primary",
  "Family & Gifts": "bg-[#fdf2f8] border-[#fce7f3] text-[#be185d]",
  Other: "bg-muted border-border text-muted-foreground",
};

export const DEFAULT_CATEGORY_STYLE = "bg-muted border-border text-muted-foreground";

/** Hex colors per category for charts (donut, bars). */
export const CATEGORY_COLORS: Record<string, string> = {
  Transfer: "#1d4ed8",
  Investment: "#7e22ce",
  Income: "#1dedb2",
  "Food & Drink": "#c2410c",
  Groceries: "#ea580c",
  Travel: "#0e7490",
  Housing: "#92400e",
  Transport: "#3730a3",
  Entertainment: "#9d174d",
  Shopping: "#166534",
  Health: "#991b1b",
  Subscriptions: "#5b21b6",
  Savings: "#15bd8d",
  "Family & Gifts": "#be185d",
  Other: "#6b7280",
  Uncategorized: "#9ca3af",
};

export function getCategoryStyle(category: string | null): string {
  if (!category) return DEFAULT_CATEGORY_STYLE;
  return CATEGORY_STYLES[category] ?? DEFAULT_CATEGORY_STYLE;
}
