# Feature Specification: Strategy-Aware Activation Flow

**Feature Branch**: `003-strategy-aware-activation`
**Created**: 2026-03-03
**Status**: Draft
**Depends on**: `001-finandance-mvp` (US2), `002-activation-autosave`

---

## 1. Executive Summary

The Funding Strategy chosen during project creation (fiat vs crypto) currently has **zero downstream consequences** — the post-creation activation flow treats both strategies identically. This spec introduces a **strategy-aware routing system** that branches the activation experience based on the selected strategy, and specifically addresses the crypto path: when a user creates a project with a crypto funding strategy, the system must guide them immediately into connecting or creating a crypto wallet — not show them a generic "Link Sources" screen.

---

## 2. Problem Statement

### Who has this problem?

Users who create a project and select **Crypto Strategy** in Step 3 of the project creation wizard.

### What is the problem?

The wizard asks users to choose between "Fiat Strategy" and "Crypto Strategy" — a meaningful decision that signals clear intent. But after project creation, both strategies land on the **same generic activation page** (`/shared-projects/[id]/get-started`) with identical options: Link Sources, Auto-Save, Explore. The chosen strategy is stored in the DB but has no impact on the user experience.

For crypto users specifically:

1. **"Link Sources" shows all sources indiscriminately** — Wise jars mixed with Kraken wallets and Ledger addresses. A user who chose crypto strategy doesn't need to see their EUR savings jars.
2. **No wallet creation/connection flow exists** — If the user doesn't already have a Kraken or Ledger integration, there's no guided path to set one up. They must navigate away to `/integrations`, figure it out, then come back.
3. **The strategy choice feels meaningless** — Users invest cognitive effort in a decision that produces no visible difference. This erodes trust in the product's intelligence.

### Why is it painful?

- **Trust erosion**: The product asks a question, then ignores the answer. This is the fintech equivalent of a bank asking your investment risk tolerance and then showing the same generic homepage to everyone. (FSM: zero-friction quadrant — low security, low trust)
- **Activation drop-off**: Crypto users face extra steps to get to value (navigate to integrations → connect exchange/wallet → return to project → link source). Each navigation step is a drop-off opportunity.
- **Wasted signal**: The strategy field sits in the DB unused. We're capturing intent without acting on it.

### Evidence

- **Current implementation**: `CreateProjectWizard.tsx` sends `funding_strategy` to the API, which persists it. The `get-started` page in spec 002 does not read or branch on this field.
- **Prototype reference**: The original Step 3 prototype (`onboarding-step-3.png`) showed funding source linking with both Wise Jars and BTC wallets — a mixed view that doesn't acknowledge strategy intent.
- **Behavioral insight**: Users who choose "Crypto Strategy" have already self-selected as crypto-forward. Showing them a fiat-first or mixed interface is a contextual mismatch.

---

## 3. Target Users & Personas

### Primary Persona: Crypto-First Project Creator

- **Profile**: User who creates a project with `funding_strategy = 'crypto'`
- **Intent**: Save/accumulate in BTC, ETH, or stablecoins toward a long-term goal
- **Current experience**: Chooses "Crypto Strategy" → sees generic activation page → must manually navigate to Integrations to connect Kraken/Ledger → return to project to link → high friction, low conversion
- **Desired experience**: Chooses "Crypto Strategy" → guided directly to connect exchange or add wallet address → wallet auto-linked to project → project feels "alive" immediately

### Secondary Persona: Fiat-First Project Creator

- **Profile**: User who creates a project with `funding_strategy = 'fiat'`
- **Intent**: Save in EUR/USD using high-yield jars (Wise)
- **Impact**: Fiat path also benefits from strategy-aware filtering (show only fiat sources, suggest Wise connection if none exist)

### Tertiary Persona: Mixed/Undecided Creator

- **Profile**: User who skips strategy selection (leaves it null) or wants both
- **Impact**: Falls back to the current generic activation flow (no regression)

---

## 4. Strategic Context

### Business Goals

- **Increase crypto project activation rate**: % of crypto-strategy projects with a linked crypto funding source within 24 hours (target: from ~0% to 50%+)
- **Reduce time-to-first-link for crypto users**: Eliminate the detour through `/integrations` page
- **Make the strategy choice meaningful**: Every wizard input must produce a visible consequence — otherwise remove the question

### Why Now?

- The activation flow (spec 002) is being built — this is the cheapest moment to make it strategy-aware
- Wallet connection for Ledger (public address) is trivially simple — no API key needed, just an address input
- Kraken connection already has a defined flow (spec 001, US1) — we're reusing it, not building from scratch

### Frameworks Applied

- **FSM (Friction-Security Matrix)**: Strategy-aware routing is *positive friction* — it adds a contextual step at the highest-intent moment. Asking a crypto user to paste a public address is lower friction than navigating to a separate Integrations page.
- **VAC (Volatility Abstraction & Custody)**: Crypto wallet connection uses read-only architecture — public addresses for Ledger, read-only API keys for Kraken. No signing, no withdrawal capability.
- **ASR (Async Sync Resilience)**: After wallet connection, balance sync happens in background. The activation page shows optimistic UI ("Wallet connected! Syncing balance...") with progressive status updates.

---

## 5. Solution Overview

### Core Concept: Strategy-Aware Branching

The activation interstitial (`/shared-projects/[id]/get-started`) reads the project's `funding_strategy` and renders a **strategy-specific experience**:

```
Wizard Step 3: Choose Strategy
  |
  +-- funding_strategy = 'crypto'
  |     |
  |     v
  |   Activation Page (Crypto Path)
  |     |
  |     +-- "Connect Wallet"  --> Guided wallet/exchange connection (inline)
  |     +-- "Set Up DCA"      --> Auto-Save with DCA framing
  |     +-- "Explore First"   --> Detail page (skip)
  |
  +-- funding_strategy = 'fiat'
  |     |
  |     v
  |   Activation Page (Fiat Path)
  |     |
  |     +-- "Link Savings"    --> Filtered fiat sources only + Wise connection CTA
  |     +-- "Set Up Auto-Save" --> Auto-Save with savings framing
  |     +-- "Explore First"    --> Detail page (skip)
  |
  +-- funding_strategy = null
        |
        v
      Activation Page (Generic — current behavior, no regression)
```

---

### Screen: Crypto Activation Path

**URL**: `/shared-projects/[id]/get-started` (same URL, strategy-aware content)

**Header**:
> "Your crypto project **[Name]** is ready!"
> "Let's connect your first wallet to start tracking."

**Primary Card: Connect Wallet** (prominent, recommended)

Two sub-options presented as selectable cards:

#### Option A: Connect Exchange (Kraken)
- Icon: Kraken brand logo (`bg-[#5741d9]`)
- Title: "Connect Kraken Exchange"
- Description: "Link your Kraken account with a read-only API key to track your exchange balances."
- CTA: "Connect Kraken"
- **Inline flow** (expands without navigation):
  1. Deep link to Kraken's API settings page (external, opens in new tab)
  2. Visual instruction: "Create a new API key with **Query** permissions only. Disable all other permissions."
  3. Input fields: API Key + API Secret
  4. Permission verification checkbox: "I confirm this key has read-only permissions"
  5. "Connect" button → triggers integration creation + sync
  6. Success state: "Connected! Found X wallets. Syncing balances..." → auto-links crypto sources to project

#### Option B: Add Wallet Address (Ledger / Cold Storage)
- Icon: Ledger brand logo (`bg-[#1c1c1c]`)
- Title: "Track a Wallet Address"
- Description: "Monitor a public blockchain address without sharing any private keys. Perfect for hardware wallets."
- CTA: "Add Address"
- **Inline flow** (expands without navigation):
  1. Network selector: Bitcoin / Ethereum / (future: more chains)
  2. Address input with format validation (BTC: starts with `1`, `3`, or `bc1`; ETH: starts with `0x`, 42 chars)
  3. Optional label input: "Give this wallet a name" (e.g., "Ledger Nano X")
  4. "Track Wallet" button → creates integration + funding source → auto-links to project
  5. Success state: "Tracking! Fetching current balance..." → shows balance when available

**Secondary Card: Set Up DCA**
- Same as spec 002 Auto-Save, but with DCA-specific framing
- Pre-filtered to show only crypto-compatible funding sources in source selector

**Tertiary Card: Explore First**
- Same skip behavior as spec 002

---

### Screen: Fiat Activation Path

**URL**: `/shared-projects/[id]/get-started`

**Header**:
> "Your savings project **[Name]** is ready!"
> "Link your savings accounts to start tracking progress."

**Primary Card: Link Savings**
- Shows **only fiat funding sources** (filter by `asset_type = 'fiat'`)
- If user has no fiat sources: shows "Connect Wise" CTA (inline Wise API key flow, same pattern as Kraken above but with Wise branding `bg-[#9fe870]`)
- If user has fiat sources: checkbox list (reuse existing pattern from spec 002)

**Secondary Card: Set Up Auto-Save**
- Same as spec 002, with "Auto-Save" framing (not DCA)

**Tertiary Card: Explore First**
- Same skip behavior

---

### Changes to Existing Components

#### 1. Activation Page (`get-started`)
- **Read** `project.funding_strategy` from the project data (already available via API)
- **Branch** rendering based on strategy value
- **Filter** displayed funding sources by strategy-compatible asset types

#### 2. Wizard Review Step (`StepReview.tsx`)
- **Enhance** the strategy display: instead of just showing the label, add a preview of what happens next:
  - Crypto: "After creation, you'll be guided to connect your wallet"
  - Fiat: "After creation, you'll link your savings accounts"

#### 3. Project Detail Page
- **Strategy badge**: Show the project's funding strategy as a visible badge/tag on the detail page header (e.g., `[Crypto]` or `[Fiat]` pill next to the project name)
- **Connected sources section**: Filter/sort by strategy-relevant sources first

---

## 6. Success Metrics

### Primary Metric
**Strategy-to-Action Conversion Rate** — % of projects where the first linked funding source matches the chosen strategy type.
- **Current**: Unknown (no tracking, strategy is decorative)
- **Target**: 70%+ (crypto projects link crypto sources, fiat projects link fiat sources)
- **Timeline**: 30 days post-launch

### Secondary Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Crypto project activation rate (source linked within 24h) | ~0% | 50%+ |
| Time-to-first-link for crypto projects | Unknown (requires detour to /integrations) | < 3 minutes (inline connection) |
| Wallet address submission success rate | N/A | 85%+ (valid addresses on first attempt) |
| Strategy selection rate in wizard | ~60% (many skip) | 80%+ (visible consequence increases selection) |

### Guardrail Metrics
- **Wizard completion rate**: Must not decrease (strategy step remains optional)
- **Fiat path activation**: Must not decrease vs. spec 002 baseline (no regression)

---

## 7. User Stories & Requirements

### Epic Hypothesis

We believe that making the activation flow strategy-aware — specifically routing crypto project creators directly into a wallet connection experience — will increase crypto project activation rate from ~0% to 50%+ because users currently face a disjointed experience where their strategy choice has no visible consequence and connecting a crypto source requires navigating away to a separate page.

---

### US7.1 — Strategy-Aware Activation Routing (Priority: P1)

**Description**: The post-creation activation page reads the project's `funding_strategy` and renders strategy-specific content, cards, and CTAs.

**Acceptance Scenarios**:

1. **Given** a project with `funding_strategy = 'crypto'`, **When** the user lands on the get-started page, **Then** they see the crypto-specific header, "Connect Wallet" as the primary card, and DCA-framed Auto-Save as secondary
2. **Given** a project with `funding_strategy = 'fiat'`, **When** the user lands on the get-started page, **Then** they see the fiat-specific header, "Link Savings" as the primary card, and Auto-Save as secondary
3. **Given** a project with `funding_strategy = null`, **When** the user lands on the get-started page, **Then** they see the generic activation flow (no regression from spec 002)
4. **Given** any strategy, **When** the user clicks "Explore First", **Then** they navigate to the project detail page (unchanged behavior)

---

### US7.2 — Inline Crypto Wallet Connection (Priority: P1)

**Description**: Crypto project creators can connect an exchange (Kraken) or add a wallet address (Ledger) directly from the activation page without navigating to `/integrations`.

**Acceptance Scenarios**:

1. **Given** the crypto activation path, **When** the user selects "Connect Kraken Exchange", **Then** an inline panel expands showing the API key input flow with a deep link to Kraken's API settings
2. **Given** valid Kraken API credentials submitted, **When** connection succeeds, **Then** discovered crypto funding sources are automatically linked to the project and a success state is shown
3. **Given** the crypto activation path, **When** the user selects "Track a Wallet Address", **Then** an inline panel expands with network selector and address input
4. **Given** a valid BTC address (starts with `1`, `3`, or `bc1`), **When** submitted, **Then** a Ledger integration + funding source is created and auto-linked to the project
5. **Given** a valid ETH address (starts with `0x`, 42 characters), **When** submitted, **Then** a Ledger integration + funding source is created and auto-linked to the project
6. **Given** an invalid address format, **When** the user attempts to submit, **Then** inline validation shows a specific error ("Invalid Bitcoin address format" / "Invalid Ethereum address format")
7. **Given** a successful wallet connection, **When** the system begins syncing, **Then** the UI shows "Connected! Syncing balance..." with a skeleton loader, and the balance appears when sync completes
8. **Given** a Kraken connection with non-read-only permissions, **When** the user skips the permission confirmation checkbox, **Then** the submit button remains disabled

---

### US7.3 — Fiat-Filtered Activation (Priority: P2)

**Description**: Fiat project creators see only fiat-compatible funding sources in the activation flow, with a Wise connection CTA if none exist.

**Acceptance Scenarios**:

1. **Given** a fiat project activation, **When** the user sees "Link Savings", **Then** only funding sources with `asset_type = 'fiat'` are shown (crypto sources hidden)
2. **Given** a fiat project activation with zero fiat funding sources, **When** the page loads, **Then** a "Connect Wise" CTA is shown with the Wise brand color and a brief setup guide
3. **Given** a successful Wise connection from the activation page, **Then** discovered Wise Jars are auto-linked to the project

---

### US7.4 — Strategy Visibility on Project Detail (Priority: P2)

**Description**: The project's funding strategy is visually displayed on the project detail page and review step.

**Acceptance Scenarios**:

1. **Given** a project with a funding strategy, **When** viewing the project detail page, **Then** a strategy badge (pill) is visible next to the project name showing "Crypto" or "Fiat"
2. **Given** the wizard review step (Step 4), **When** a strategy is selected, **Then** the review shows what will happen after creation ("You'll be guided to connect your wallet" / "You'll link your savings accounts")
3. **Given** the project detail page's Connected Sources section, **When** viewing sources, **Then** strategy-compatible sources are shown first (sorted by relevance)

---

## 8. Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-chain auto-discovery from seed/xPub | Requires complex derivation logic. MVP: one address = one source. Future enhancement. |
| Exchange connections beyond Kraken | Binance, Coinbase, etc. are future integrations. Kraken is the MVP crypto exchange. |
| Wallet creation (generate new keys) | Finandance is read-only aggregation. We track existing wallets, not create new ones. |
| ENS / domain name resolution | "vitalik.eth" → address resolution. Future enhancement. |
| Token-level balance breakdown | Showing individual ERC-20 tokens within an ETH wallet. MVP shows total native balance. |
| Strategy switching post-creation | Changing from fiat to crypto after project creation. Requires rebalancing UX. Deferred. |
| Custom/hybrid strategy | "50% fiat, 50% crypto" mixed strategy. Out of scope — pick one or leave null. |

---

## 9. Dependencies & Risks

### Dependencies

| Dependency | Status | Impact |
|------------|--------|--------|
| Spec 002 (Activation Flow) | Draft | This spec extends it — must be built on top of the activation interstitial |
| US1 integration flows (Kraken, Ledger) | Phase 3 (pending) | Kraken API key flow and Ledger address tracking are prerequisites. This spec reuses those flows inline. |
| `funding_strategy` field on project model | Done (T040) | Already persisted and available via API |
| Funding sources filtering by asset_type | Partial | Backend may need a query param to filter by asset type |

### Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Integration flows (US1) not ready when this ships | Blocker | Medium | This spec can ship in phases: Phase A (strategy routing + filtering) without inline connection; Phase B adds inline flows once US1 is done |
| Users paste API keys with write permissions despite warnings | Security | Medium | VAC framework: permission verification checkbox + backend validation of key permissions where possible (Kraken API supports permission check) |
| Address validation rejects valid addresses (new BTC format, L2 chains) | UX friction | Low | Use permissive validation (basic prefix + length check), not full cryptographic validation. Log rejections for monitoring. |
| Crypto activation path cannibalizes DCA setup | Lower DCA adoption | Low | DCA is secondary option, not removed. Monitor distribution. |

---

## 10. Open Questions

- [ ] **Q1**: Should the inline wallet connection on the activation page create a full integration (visible on `/integrations`) or a lightweight "project-scoped" source? → **Recommendation**: Full integration — avoids duplicate architecture. The activation page is a shortcut to the same integration flow, not a parallel system.
- [ ] **Q2**: Should we support multiple wallet connections from the activation page (e.g., Kraken + Ledger for the same project)? → **Recommendation**: Yes — show both options, let user connect one or both. After first connection, show "Add another" option.
- [ ] **Q3**: What happens if a user chose "crypto" strategy but later wants to link a fiat source too? → **Recommendation**: The detail page's "Connected Sources" section shows all available sources (unfiltered). Strategy-aware filtering only applies to the activation page. The strategy is a *guide*, not a *lock*.
- [ ] **Q4**: Should the Kraken inline flow include IP whitelisting guidance? → **Recommendation**: Yes, as an optional expandable section. Per VAC framework: recommend 2FA + IP whitelisting on exchange account.

---

## 11. Implementation Phases

### Phase A: Strategy Routing + Filtering (no new integration flows needed)

- Read `funding_strategy` on get-started page
- Branch header copy and card labels by strategy
- Filter existing funding sources by asset type on the fiat path
- Add strategy badge to project detail page
- Add "what happens next" preview to wizard review step

**Can ship independently** — improves UX even before inline connection flows exist. Crypto path shows "Connect Wallet" card that links to `/integrations` page (temporary) instead of inline flow.

### Phase B: Inline Wallet Connection (requires US1 integration flows)

- Inline Kraken API key flow on activation page
- Inline Ledger address input on activation page
- Inline Wise connection CTA on fiat activation page
- Auto-link created sources to the project
- Background sync with progressive status updates

**Ships when** US1 integration flows (T025-T036) are implemented.
