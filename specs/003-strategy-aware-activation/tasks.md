---
description: "Task list for Strategy-Aware Activation Flow"
---

# Tasks: Strategy-Aware Activation Flow

**Input**: Design documents from `/specs/003-strategy-aware-activation/`
**Prerequisites**: spec.md (required), plan.md (required)
**Depends on**: `001-finandance-mvp` (Phase 3-4 complete), `002-activation-autosave` (Phase A-E complete)

**Tests**: Frontend component tests for strategy branching + address validation unit tests.

**Organization**: Tasks are dependency-ordered across 2 main phases (A = routing + filtering, B = inline connections). Phase A can ship independently. Phase B requires US1 integration services.

## Format: `[ID] [P?] [US7.x] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[US7.x]**: Maps to user story from spec (7.1 = routing, 7.2 = inline crypto, 7.3 = fiat filtered, 7.4 = visibility)
- **Include exact file paths in descriptions**

---

## Phase A: Strategy Routing + Visual Enhancements

**Purpose**: Make the activation page strategy-aware. Crypto "Connect Wallet" card links to `/integrations` temporarily until Phase B.

**No dependency on US1 integration flows** — can ship immediately.

### A1: Backend — Funding Source Filtering

- [ ] T109 [US7.3] Add `asset_type` query parameter filter to funding sources endpoint in `backend/app/api/v1/funding_sources.py`
  - Accept `?asset_type=fiat` or `?asset_type=crypto` query param
  - Fiat currencies set: `{'EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK'}`
  - Crypto currencies set: `{'BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK', 'XRP', 'LTC'}`
  - Filter applied as `WHERE currency IN (...)` on the existing query
  - If param omitted: return all (no regression)
  - Update `backend/app/models/funding_sources.py` if needed (add param to list endpoint)

### A2: Frontend — Strategy-Aware Activation Page

- [ ] T110 [US7.1] Refactor activation page to branch on `funding_strategy` in `frontend/src/app/(dashboard)/shared-projects/[id]/get-started/page.tsx`
  - Read `project.funding_strategy` from `useProjectDetail(id)` response
  - Three branches:
    - `'crypto'`: render crypto-specific header + crypto card options
    - `'fiat'`: render fiat-specific header + fiat-filtered LinkSourcesPanel
    - `null`: render current generic activation (no change — preserve existing behavior)
  - Crypto header: "Your crypto project **[Name]** is ready!" + "Let's connect your first wallet to start tracking."
  - Fiat header: "Your savings project **[Name]** is ready!" + "Link your savings accounts to start tracking progress."
  - Crypto primary card: "Connect Wallet" — icon `Wallet`, description about exchange/wallet connection. **Temporarily links to `/integrations`** (replaced in Phase B)
  - Fiat primary card: "Link Savings" — renders `LinkSourcesPanel` with `assetTypeFilter="fiat"`
  - Both paths keep Auto-Save as secondary card and "Explore First" as tertiary
  - Auto-Save card label: "Set Up DCA" for crypto, "Set Up Auto-Save" for fiat

- [ ] T111 [P] [US7.3] Add `assetTypeFilter` prop to `LinkSourcesPanel` in `frontend/src/components/projects/activation/LinkSourcesPanel.tsx`
  - New optional prop: `assetTypeFilter?: 'fiat' | 'crypto'`
  - When set: pass `?asset_type=fiat` (or crypto) to funding sources API call
  - When unset: fetch all sources (no regression)
  - Update `useCompatibleSources` or inline the filter logic

- [ ] T112 [P] [US7.1] Add `strategyFraming` prop to `AutoSavePanel` in `frontend/src/components/projects/activation/AutoSavePanel.tsx`
  - New optional prop: `strategyFraming?: 'crypto' | 'fiat'`
  - Crypto framing: explanation card uses DCA language ("Dollar-Cost Averaging reduces volatility...")
  - Fiat framing: explanation card uses Auto-Save language ("Regular contributions toward your goal...")
  - Pre-filter source selector by asset type matching strategy

### A3: Frontend — Strategy Visibility

- [ ] T113 [P] [US7.4] Create `StrategyBadge` component in `frontend/src/components/projects/StrategyBadge.tsx`
  - Props: `strategy: 'fiat' | 'crypto' | null`
  - If null: render nothing
  - Crypto: `CurrencyBtc` icon + "Crypto" text in a `rounded-md` pill with `bg-muted` background
  - Fiat: `CurrencyDollar` icon + "Fiat" text in same pill style
  - Small size: `text-xs`, `px-2 py-0.5`, icons from `@phosphor-icons/react`

- [ ] T114 [P] [US7.4] Add strategy badge to project detail page header in `frontend/src/app/(dashboard)/shared-projects/[id]/page.tsx`
  - Import `StrategyBadge`
  - Render next to project name in the header section
  - Pass `project.funding_strategy` as prop

- [ ] T115 [P] [US7.4] Enhance wizard review step with "what happens next" in `frontend/src/components/projects/steps/StepReview.tsx`
  - Below the "Funding Strategy" section label + description, add a muted info line:
    - If `crypto`: "After creation, you'll be guided to connect your wallet"
    - If `fiat`: "After creation, you'll link your savings accounts"
    - If `null`: no additional text
  - Style: `text-xs text-muted-foreground` with `Info` icon

- [ ] T116 [US7.4] Sort strategy-compatible sources first in project detail Connected Sources section
  - In `frontend/src/app/(dashboard)/shared-projects/[id]/page.tsx` (Connected Sources section)
  - If `funding_strategy = 'crypto'`: crypto sources sorted to top
  - If `funding_strategy = 'fiat'`: fiat sources sorted to top
  - If null: no sort change

### A4: Verification

- [ ] T117 [US7.1] Phase A verification: strategy routing + filtering
  - Create crypto project via wizard → verify crypto activation path shows crypto header + "Connect Wallet" card
  - Create fiat project via wizard → verify fiat activation path shows fiat header + filtered fiat sources
  - Create null-strategy project → verify generic activation (no regression)
  - Verify strategy badge appears on project detail page
  - Verify wizard review shows "what happens next" text
  - Run `npx tsc --noEmit` — must pass
  - Run `npm run lint` — must pass

**Checkpoint**: Phase A complete. Strategy choice has visible downstream consequences. Crypto "Connect Wallet" links to `/integrations` temporarily.

---

## Phase B: Inline Wallet/Exchange Connection

**Purpose**: Replace temporary `/integrations` link with inline connection flows. Auto-link created sources to the project.

**Depends on**: US1 integration services (T025-T036) being stable + Phase A complete.

### B1: Utilities

- [ ] T118 [P] [US7.2] Create address validation utility in `frontend/src/lib/addressValidation.ts`
  - `validateBtcAddress(address: string): { valid: boolean; error?: string }`
    - Valid prefixes: `1` (P2PKH), `3` (P2SH), `bc1` (Bech32/Bech32m)
    - Length: 25-62 characters
    - Character set: alphanumeric (no 0, O, I, l for base58 addresses)
  - `validateEthAddress(address: string): { valid: boolean; error?: string }`
    - Must start with `0x`
    - Exactly 42 characters total
    - Hex characters only after prefix
  - Export `validateAddress(network: 'bitcoin' | 'ethereum', address: string)` dispatcher
  - Unit test file: `frontend/tests/unit/addressValidation.test.ts`

### B2: Inline Connection Components

- [ ] T119 [P] [US7.2] Build `InlineKrakenConnect` component in `frontend/src/components/projects/activation/InlineKrakenConnect.tsx`
  - Self-contained inline panel (no modal, no navigation)
  - Kraken brand header: `bg-[#5741d9]` icon + "Connect Kraken Exchange"
  - Step 1: Deep link button to Kraken API settings page (opens new tab)
  - Step 2: Visual instruction text: "Create a new API key with **Query** permissions only"
  - Step 3: API Key input + API Secret input (password-masked)
  - Step 4: Checkbox: "I confirm this key has read-only permissions" — submit disabled until checked
  - Optional expandable section: "Recommended: Enable 2FA and IP whitelisting on your Kraken account"
  - Submit: calls `POST /api/v1/integrations/connect` with `{ provider: 'kraken', credentials: { api_key, api_secret } }`
  - Loading state: "Connecting to Kraken..." with spinner
  - Success state: "Connected! Found X wallets. Syncing balances..." + `SyncStatus` component
  - Error state: "Connection failed: [error message]" with retry button
  - Props: `onSuccess(integrationId: string, fundingSourceIds: string[])`, `onCancel()`
  - Extract shared connection logic from existing `ConnectModal.tsx` where possible

- [ ] T120 [P] [US7.2] Build `InlineLedgerConnect` component in `frontend/src/components/projects/activation/InlineLedgerConnect.tsx`
  - Self-contained inline panel
  - Ledger brand header: `bg-[#1c1c1c]` icon + "Track a Wallet Address"
  - Network selector: two pill buttons — "Bitcoin" / "Ethereum" (default: Bitcoin)
  - Address input: text input with placeholder based on network
    - Bitcoin placeholder: "e.g., bc1q..."
    - Ethereum placeholder: "e.g., 0x..."
  - Real-time validation using `validateAddress()` from T118
    - Show green check icon when valid
    - Show red error text when invalid (after blur or on submit attempt)
  - Optional label input: "Give this wallet a name" with placeholder "e.g., Ledger Nano X"
  - Submit: calls `POST /api/v1/integrations/connect` with `{ provider: 'ledger', credentials: { address, network, label } }`
  - Success state: "Tracking! Fetching current balance..." + skeleton loader for balance
  - Props: `onSuccess(integrationId: string, fundingSourceIds: string[])`, `onCancel()`

- [ ] T121 [P] [US7.3] Build `InlineWiseConnect` component in `frontend/src/components/projects/activation/InlineWiseConnect.tsx`
  - Self-contained inline panel
  - Wise brand header: `bg-[#9fe870]` with dark foreground + "Connect Wise"
  - Deep link to Wise API settings page
  - Visual instruction: "Create a personal API token with **Read Only** access"
  - API Token input
  - Submit: calls `POST /api/v1/integrations/connect` with `{ provider: 'wise', credentials: { api_key } }`
  - Success state: "Connected! Found X Jars. Syncing balances..."
  - Props: `onSuccess(integrationId: string, fundingSourceIds: string[])`, `onCancel()`

### B3: Activation Card Components

- [ ] T122 [US7.2] Build `CryptoActivationCards` component in `frontend/src/components/projects/activation/CryptoActivationCards.tsx`
  - Two expandable cards in a grid:
    - Card 1: "Connect Kraken Exchange" (icon + description + CTA)
    - Card 2: "Track a Wallet Address" (icon + description + CTA)
  - State: `expandedCard: 'kraken' | 'ledger' | null`
  - Clicking a card expands its inline connection panel, collapses the other
  - After first successful connection:
    - Auto-link discovered funding sources to project via `POST /api/v1/projects/{id}/funding`
    - Show success message with balance summary
    - Show "Add another wallet" option (reset to card view)
    - Show "Continue to project" button (navigate to detail page)
  - Props: `projectId: string`, `onComplete()` (navigates to detail page)

- [ ] T123 [US7.3] Build `FiatActivationCards` component in `frontend/src/components/projects/activation/FiatActivationCards.tsx`
  - Branching logic:
    - If user has fiat funding sources: render checkbox list (reuse `LinkSourcesPanel` with `assetTypeFilter="fiat"`)
    - If user has zero fiat sources: render `InlineWiseConnect` with Wise branding + "Connect your first savings account"
  - After Wise connection: auto-link discovered Jars to project
  - After linking: navigate to detail page
  - Props: `projectId: string`, `fundingSources: FundingSource[]`, `onComplete()`

### B4: Get-Started Page Integration

- [ ] T124 [US7.1] [US7.2] Wire inline connection components into activation page in `frontend/src/app/(dashboard)/shared-projects/[id]/get-started/page.tsx`
  - Replace temporary `/integrations` link in crypto path with `CryptoActivationCards`
  - Replace `LinkSourcesPanel` in fiat path with `FiatActivationCards`
  - Auto-link flow:
    1. User connects wallet/exchange inline
    2. On `onSuccess`: call `POST /api/v1/projects/{id}/funding` with discovered source IDs
    3. Navigate to project detail page
  - Handle error case: if auto-link fails, show fallback message with manual link instructions

### B5: Verification

- [ ] T125 [US7.2] Phase B verification: inline connections + auto-link
  - Create crypto project → activation page → click "Connect Kraken" → submit API key → verify sources auto-linked to project
  - Create crypto project → activation page → click "Track Wallet" → enter BTC address → verify source created + auto-linked
  - Create fiat project with no fiat sources → verify Wise connect CTA shown → connect → verify Jars auto-linked
  - Create fiat project with existing fiat sources → verify filtered checkbox list
  - Verify address validation: invalid BTC address shows error, invalid ETH address shows error
  - Create null-strategy project → verify generic flow (no regression)
  - Run `npx tsc --noEmit` — must pass
  - Run `npm run lint` — must pass

**Checkpoint**: Full feature complete. Strategy-aware activation with inline wallet/exchange connection.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase A (Strategy Routing)  ←── No blockers, can start now
  ├── T109 (backend filter)
  ├── T110 (activation page branching) ←── depends on T109
  ├── T111 [P], T112 [P] ←── can run parallel with T110
  ├── T113 [P], T114 [P], T115 [P] ←── can run parallel (strategy visibility)
  ├── T116 ←── depends on T113
  └── T117 (verification) ←── depends on all above

Phase B (Inline Connections)  ←── Blocked by US1 integration services + Phase A
  ├── T118 [P] (address validation)
  ├── T119 [P], T120 [P], T121 [P] ←── inline components, parallel. T120 depends on T118
  ├── T122 ←── depends on T119 + T120
  ├── T123 ←── depends on T121 + T111
  ├── T124 ←── depends on T122 + T123
  └── T125 (verification) ←── depends on all above
```

### Parallel Opportunities

- **Phase A**: T111, T112, T113, T114, T115 can ALL run in parallel (different files)
- **Phase B**: T118, T119, T120, T121 can run in parallel (independent components). T120 soft-depends on T118 (can mock validation initially)
- **Cross-phase**: Phase B starts after Phase A is verified (T117), BUT T118 (address validation) has no Phase A dependency and can start anytime

---

## Task Summary

| Phase | Tasks | New Files | Modified Files |
|-------|-------|-----------|----------------|
| A1: Backend filter | T109 | 0 | 1-2 |
| A2: Activation branching | T110-T112 | 0 | 3 |
| A3: Strategy visibility | T113-T116 | 1 | 2 |
| A4: Verification | T117 | 0 | 0 |
| B1: Utilities | T118 | 2 | 0 |
| B2: Inline components | T119-T121 | 3 | 0 |
| B3: Activation cards | T122-T123 | 2 | 0 |
| B4: Wiring | T124 | 0 | 1 |
| B5: Verification | T125 | 0 | 0 |
| **Total** | **17 tasks** | **8 new** | **7 modified** |
