# Implementation Plan: Strategy-Aware Activation Flow

**Branch**: `003-strategy-aware-activation` | **Date**: 2026-03-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification for strategy-aware branching in the post-creation activation flow
**Depends on**: `001-finandance-mvp` (US1 + US2), `002-activation-autosave`

## Summary

Make the post-creation activation flow (`/shared-projects/[id]/get-started`) strategy-aware: crypto projects route into wallet/exchange connection, fiat projects route into filtered savings source linking. Adds inline Kraken + Ledger connection directly on the activation page (no navigation to `/integrations`). Adds strategy visibility (badge on detail page, "what happens next" in wizard review).

## Technical Context

**Language/Version**: TypeScript strict (Frontend), Python 3.11+ (Backend)
**Primary Dependencies**: Next.js 14 App Router, Supabase SSR, FastAPI, shadcn/ui, Phosphor Icons
**Existing Infrastructure**: Activation page (T089), ConnectModal (T035), SyncStatus (T036), EmptySourcesCTA (T101)
**No new DB tables**: Uses existing `integrations`, `funding_sources`, `project_funding_sources`, `projects` tables
**No new backend services**: Reuses existing Kraken/Ledger/Wise services from US1

## Constitution Check

- **Security Over Convenience**: Crypto connections use read-only API keys (Kraken) and public addresses (Ledger). No signing capability. Permission verification checkbox enforced.
- **Separation of Responsibilities**: Inline connection still calls backend `POST /api/v1/integrations/connect` — frontend collects input, backend encrypts and syncs.
- **UI/UX**: Semantic tokens only. Provider brand colors as inline hex per MEMORY.md. Geist Mono font. `rounded-md`, `shadow-sm`.

## Key Files

### Will Modify (existing)

| File | Change |
|------|--------|
| `frontend/src/app/(dashboard)/shared-projects/[id]/get-started/page.tsx` | Read `funding_strategy`, branch rendering into crypto/fiat/generic paths |
| `frontend/src/components/projects/activation/LinkSourcesPanel.tsx` | Accept `assetTypeFilter` prop, filter displayed sources |
| `frontend/src/components/projects/activation/AutoSavePanel.tsx` | Accept `strategyFraming` prop for DCA vs Auto-Save copy |
| `frontend/src/components/projects/steps/StepReview.tsx` | Add "what happens next" preview text based on strategy |
| `frontend/src/app/(dashboard)/shared-projects/[id]/page.tsx` | Add strategy badge in header |
| `backend/app/api/v1/funding_sources.py` | Add `?asset_type=fiat|crypto` query param filter |

### Will Create (new)

| File | Purpose |
|------|---------|
| `frontend/src/components/projects/activation/CryptoActivationCards.tsx` | Kraken + Ledger connect cards with inline expand |
| `frontend/src/components/projects/activation/InlineKrakenConnect.tsx` | Inline Kraken API key form (reuses ConnectModal logic) |
| `frontend/src/components/projects/activation/InlineLedgerConnect.tsx` | Inline Ledger address input with network selector + validation |
| `frontend/src/components/projects/activation/InlineWiseConnect.tsx` | Inline Wise API key form for fiat activation path |
| `frontend/src/components/projects/activation/FiatActivationCards.tsx` | Fiat-filtered source list + Wise connect CTA |
| `frontend/src/components/projects/StrategyBadge.tsx` | Reusable strategy pill (Crypto/Fiat) |
| `frontend/src/lib/addressValidation.ts` | BTC + ETH address format validators |

## Implementation Phases

### Phase A: Strategy Routing + Visual Enhancements (no US1 dependency)

**Objective**: Make the activation page strategy-aware with filtering and visual cues. Crypto "Connect Wallet" card temporarily links to `/integrations` page until Phase B ships.

**Can ship independently** — improves UX even without inline connection flows.

1. **Backend: Funding Sources Filter**
   - Add `asset_type` query param to `GET /api/v1/funding-sources` (values: `fiat`, `crypto`, or omit for all)
   - `fiat` = funding sources where `currency IN ('EUR', 'USD', 'GBP', ...)` (ISO 4217 fiat set)
   - `crypto` = funding sources where `currency IN ('BTC', 'ETH', 'USDT', ...)` (crypto set)
   - Classification logic: simple set membership check, not a new DB column

2. **Frontend: Strategy-Aware Activation Page**
   - Read `project.funding_strategy` from `useProjectDetail()` data (already available)
   - Three rendering branches:
     - `crypto`: crypto header copy + "Connect Wallet" card (links to `/integrations` for now) + DCA-framed Auto-Save
     - `fiat`: fiat header copy + "Link Savings" card (filtered to fiat sources) + Auto-Save framing
     - `null`: current generic activation (no change)
   - Pass `assetTypeFilter` to `LinkSourcesPanel` and `AutoSavePanel` source selector

3. **Frontend: Wizard Review Enhancement**
   - Modify `StepReview.tsx`: below strategy label, add grey text:
     - Crypto: "After creation, you'll be guided to connect your wallet"
     - Fiat: "After creation, you'll link your savings accounts"
     - Null: no extra text

4. **Frontend: Strategy Badge on Detail Page**
   - Create `StrategyBadge.tsx`: pill component with crypto/fiat icon + label
   - Render in project detail header next to project name
   - Crypto: `CurrencyBtc` icon + "Crypto" text
   - Fiat: `CurrencyDollar` icon + "Fiat" text
   - Null: not rendered

5. **Frontend: Source Sorting on Detail Page**
   - In project detail Connected Sources section: sort strategy-compatible sources first

### Phase B: Inline Wallet/Exchange Connection (requires US1 integration services)

**Objective**: Replace the temporary `/integrations` link with inline connection flows directly on the activation page. Auto-link created sources to the project.

**Ships when** US1 integration services (T025-T036) are stable.

1. **Address Validation Utility**
   - `addressValidation.ts`: pure functions for BTC + ETH address format checks
   - BTC: starts with `1`, `3`, or `bc1`; length 25-62 chars
   - ETH: starts with `0x`; exactly 42 hex chars
   - Returns `{ valid: boolean, error?: string }`

2. **Inline Kraken Connect Component**
   - `InlineKrakenConnect.tsx`: self-contained panel with:
     - Deep link to Kraken API settings (new tab)
     - Visual instruction for read-only permissions
     - API Key + API Secret inputs
     - Permission confirmation checkbox (blocks submit)
     - Calls `POST /api/v1/integrations/connect` with provider=kraken
     - On success: polls `GET /api/v1/jobs/{job_id}` for sync status
     - Success state: shows discovered wallet count + "Syncing balances..."
   - Extracts shared logic from `ConnectModal.tsx` into reusable connection helpers

3. **Inline Ledger Connect Component**
   - `InlineLedgerConnect.tsx`: self-contained panel with:
     - Network selector: Bitcoin / Ethereum (pill buttons)
     - Address input with real-time format validation
     - Optional label input ("Ledger Nano X")
     - Calls `POST /api/v1/integrations/connect` with provider=ledger + address
     - Success state: "Tracking! Fetching balance..."
   - Uses `addressValidation.ts` for client-side validation

4. **Inline Wise Connect Component**
   - `InlineWiseConnect.tsx`: same pattern as Kraken but Wise-branded
     - Deep link to Wise API settings
     - API Key input
     - Calls `POST /api/v1/integrations/connect` with provider=wise
     - Success state: shows discovered Jars count

5. **Crypto Activation Cards Component**
   - `CryptoActivationCards.tsx`: two expandable cards (Kraken + Ledger)
     - Click to expand inline connection panel
     - Collapse other when one opens
     - After successful connection: auto-link discovered sources to current project via `POST /api/v1/projects/{id}/funding`
     - Show "Add another" option after first success

6. **Fiat Activation Cards Component**
   - `FiatActivationCards.tsx`:
     - If user has fiat sources: checkbox list (existing pattern from LinkSourcesPanel)
     - If zero fiat sources: InlineWiseConnect panel with Wise branding
     - After connection: auto-link Wise Jars to project

7. **Get-Started Page Integration**
   - Replace temporary `/integrations` link in crypto path with `CryptoActivationCards`
   - Replace `LinkSourcesPanel` in fiat path with `FiatActivationCards`
   - Auto-link flow: after connection + sync → call project funding assignment → navigate to detail page

8. **E2E Verification**
   - Create crypto project → verify crypto activation path shows Kraken + Ledger cards
   - Create fiat project → verify fiat activation path shows filtered sources or Wise connect
   - Create null-strategy project → verify generic flow (no regression)
   - `npx tsc --noEmit` passes
   - `npm run lint` passes

---

## Complexity Tracking

| Complexity Item | Justification | Simpler Alternative Rejected Because |
|-----------------|--------------|--------------------------------------|
| Strategy-aware branching on activation page | Spec requirement — make strategy choice meaningful | Generic page wastes the strategy signal |
| Inline connection panels (Kraken, Ledger, Wise) | Eliminate navigation detour to `/integrations` | Linking to `/integrations` adds 3+ clicks and context loss |
| Address validation utility | Client-side feedback before server round-trip | Server-only validation adds latency and poor UX for typos |
| Auto-link after connection | Reduce steps from connect → navigate → link to connect → done | Manual linking after inline connect defeats the purpose |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Phase B blocked by US1 integration flows not being ready | Phase A ships independently — strategy routing + filtering + visual badges work without inline connections |
| Inline connection duplicates ConnectModal logic | Extract shared connection helpers; inline components reuse them, ConnectModal also refactored to use them |
| Auto-link fails silently after successful connection | Show explicit success/error states. If funding assignment fails, show "Connected! Go to project to link manually." |

---

## Next Steps

- Run `/speckit.tasks` to generate atomic tasks from this plan
- Phase A can start immediately (no blockers)
- Phase B starts when US1 integration services are stable
