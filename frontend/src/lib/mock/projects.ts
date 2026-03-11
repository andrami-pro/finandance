import type { FundingSourceOption, ProjectListItem } from "@/types/projects";

// ---------------------------------------------------------------------------
// Mock funding sources (for StepFunding)
// ---------------------------------------------------------------------------

export const MOCK_FUNDING_SOURCES: FundingSourceOption[] = [
  {
    id: "fs-wise-001",
    provider: "WISE",
    name: "Japan Fund (Wise Jar)",
    currency: "EUR",
    currentBalance: 1250.0,
    balanceInBaseCurrency: 1250.0,
    ownerName: "Alex",
    selected: false,
  },
  {
    id: "fs-kraken-001",
    provider: "KRAKEN",
    name: "Joint BTC Savings",
    currency: "EUR",
    currentBalance: 3400.0,
    balanceInBaseCurrency: 3400.0,
    ownerName: "Alex",
    selected: false,
  },
  {
    id: "fs-ledger-001",
    provider: "LEDGER",
    name: "Cold Storage 1",
    currency: "BTC",
    currentBalance: 0.15,
    balanceInBaseCurrency: 12750.0,
    ownerName: "Alex",
    selected: false,
  },
];

// ---------------------------------------------------------------------------
// Mock projects (for Shared Projects list page)
// ---------------------------------------------------------------------------

export const MOCK_PROJECTS: ProjectListItem[] = [
  {
    id: "proj-001",
    name: "Japan Summer Trip",
    target_amount: 10000,
    target_currency: "EUR",
    target_date: "2025-08-15",
    category: "travel",
    funding_strategy: "fiat",
    current_amount: 4650,
    progress_percent: 46,
    member_count: 2,
    funding_sources_count: 2,
  },
  {
    id: "proj-002",
    name: "Home Renovation Fund",
    target_amount: 25000,
    target_currency: "EUR",
    target_date: "2026-03-01",
    category: "home",
    funding_strategy: "fiat",
    current_amount: 8200,
    progress_percent: 33,
    member_count: 2,
    funding_sources_count: 1,
  },
  {
    id: "proj-003",
    name: "Emergency Reserve",
    target_amount: 15000,
    target_currency: "EUR",
    target_date: null,
    category: "emergency",
    funding_strategy: "crypto",
    current_amount: 12750,
    progress_percent: 85,
    member_count: 1,
    funding_sources_count: 2,
  },
  {
    id: "proj-004",
    name: "Family Car Upgrade",
    target_amount: 35000,
    target_currency: "EUR",
    target_date: "2025-12-01",
    category: "auto",
    funding_strategy: "fiat",
    current_amount: 7000,
    progress_percent: 20,
    member_count: 2,
    funding_sources_count: 1,
  },
];
