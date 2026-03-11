---
name: pm-fintech
description: >
  Senior Product Management framework for hybrid fintech platforms (fiat + crypto aggregation).
  Use when making product decisions, writing PRDs, designing features, evaluating trade-offs,
  or planning architecture for Finandance. Covers: Open Banking (PSD2/PSD3, STET APIs),
  crypto aggregation (Kraken API keys, Ledger watch-only), collaborative finance (shared projects,
  split rules), security-as-feature (Fernet encryption, SCA renewal), data architecture
  (idempotency, integer storage, FX caching), and fintech KPIs (sync success rate, SCA drop-off,
  time-to-first-link, multiplayer depth index). Triggers on: product decision, feature design,
  PRD creation, architecture trade-off, metrics definition, fintech ideation, user flow design.
user-invocable: true
---

# PM Fintech: Senior Product Management for Hybrid Finance

Use this skill during ideation, PRD creation, feature design, and architectural decisions for Finandance. It provides fintech-specific frameworks, decision checklists, and quality gates that ensure every product choice meets the standard of a Senior PM operating in the EU fintech market.

---

## When to Use

- Designing a new feature or user flow
- Writing or reviewing a PRD for any Finandance module
- Making architecture decisions that affect data integrity or UX
- Defining success metrics and KPIs
- Evaluating trade-offs (security vs. friction, real-time vs. cached, etc.)
- Reviewing sync/aggregation design patterns
- Planning collaborative finance features

## When NOT to Use

- Pure implementation tasks (use `fullstack-dev` or `speckit.implement`)
- UI pixel-level decisions (use `frontend-design`)
- Database schema optimization (use `supabase-expert`)

---

## Core Thesis

> A fintech aggregation product does NOT compete on the breadth of integrations alone.
> It competes on its **technical mastery to abstract the imperfections of underlying infrastructure**,
> delivering a unified, async, and security-first environment.

Every decision must be evaluated against three pillars:

1. **Data Integrity** - Can we guarantee arithmetic correctness across currencies and sources?
2. **Trust Engineering** - Does this build or erode user confidence?
3. **Async Resilience** - Does this degrade gracefully when external systems fail?

---

## The 6 Frameworks

These are the mental models that govern all product decisions. Apply the relevant framework(s) when designing any feature.

### 1. Async Sync Resilience (ASR)

**Domain:** Banking aggregation, API consumption, data freshness

**Rules:**
- No UI interaction shall depend on a synchronous response from a third-party banking API
- Present the last validated cached state immediately; sync in background
- On HTTP 429 (rate limit): apply exponential backoff, never aggressive retry
- Migrate from polling to webhook-driven architecture where possible
- Show data freshness markers ("Updated 2 hours ago") instead of spinners

**UX pattern:** Skeleton screens with progressive messaging:
1. "Connecting securely with [Bank]..."
2. "Analyzing last 30 days of transactions..."
3. "Categorizing expenses..."

**Anti-patterns to reject:**
- Manual "Refresh" buttons that block the UI
- Treating all API errors as generic "try again later"
- Synchronous balance fetching on page load

### 2. Volatility Abstraction & Custody (VAC)

**Domain:** Crypto aggregation, Web3, cold wallets, exchange APIs

**Rules:**
- Suppress real-time tick charts on dashboards; show smoothed weekly/monthly trend curves
- Architecturally separate "Read" (aggregation) from "Sign" (fund movement) - Finandance is read-only
- Never request private keys; use watch-only addresses (xPubs) for cold wallets
- Auto-discover balances across EVM chains from a single seed address
- Insert positive friction before saving exchange API keys (confirm read-only permissions)

**API key onboarding checklist:**
- [ ] Deep link to exchange's API settings page
- [ ] Visual guide showing which permission checkboxes to uncheck
- [ ] Confirmation modal: "I have disabled withdrawal permissions"
- [ ] Recommend 2FA + IP whitelisting on exchange account

**Anti-patterns to reject:**
- Displaying raw 42-char hex addresses (resolve to ENS or human labels)
- Continuous price polling that exhausts backend resources
- Letting users paste API keys without permission verification flow

### 3. Radial Co-Ownership Permissions (RCP)

**Domain:** Shared projects, couple finances, split rules

**Rules:**
- **Privacy by default (opt-in sharing):** Every connected source enters as strictly private
- **Granular consent:** Sharing specific transactions/flows, not entire accounts
- **Transaction split engine:** Rules-based automation (e.g., "Carrefour > 50EUR -> 60/40 split to Food Project")
- **Zero-sum reconciliation:** Total shared obligations + individual Net Worth must balance exactly
- **Async conflict resolution:** Recategorizations trigger "pending review" notifications, not overwrites
- **Immutable audit trail:** Every data mutation is event-sourced

**Architecture:** Model money as a multi-tenant ledger with granular permissions (read/write/veto) per identity, NOT as `user_id_2` bolted onto a monolithic accounts table.

**Anti-patterns to reject:**
- Last-write-wins on shared budgets (use optimistic locking)
- Double-counting shared expenses in individual Net Worth
- Forced full-account visibility for shared project members

### 4. Friction-Security Matrix (FSM)

**Domain:** Onboarding, authentication, SCA renewal, trust signals

**Quadrant model:**

| | Low Security | High Security |
|---|---|---|
| **High Friction** | NEGATIVE (captchas, slow loads, form resets) - ELIMINATE | POSITIVE (biometric before transfers, encryption verification) - TARGET |
| **Low Friction** | ZERO (OS autofill for passwords, no re-verify) - DANGEROUS | IDEAL but unreachable |

**Rules:**
- Progressive disclosure: Let users explore (blank dashboards, budget simulators) before requiring KYC/SCA
- SCA renewal (180 days): Notify 5 days early, frame as "security vault renewal", maintain read access to cached data
- Translate backend security into UI trust signals: "Your keys are encrypted with military-grade algorithms"
- Insert intentional micro-delays with reassuring feedback ("Verifying credential encryption...")
- Biometric validation only before destructive/high-value confirmations

**Onboarding golden rule:** KYC/SCA gates activate ONLY at the moment the user attempts to link a real bank account or execute a binding action, never before.

**Anti-patterns to reject:**
- All verification steps on first screen (>63% drop-off)
- Blocking historical data access when SCA token expires
- Hiding security infrastructure from users ("they won't understand")

### 5. Single-Origin Transaction Structure (ETOU)

**Domain:** Data architecture, monetary storage, timezone handling, FX rates

**Rules:**
- **Minor units as integers:** Store all monetary values as BIGINT (1050 = 10.50 EUR), adjacent ISO 4217 currency code column
- **Never use float/double** for money - causes arithmetic drift at scale
- **Idempotency keys:** Every write operation protected by deterministic keys derived from the bank's original transaction ID
- **Transaction state machine:** Initiated -> Processing -> Pending -> Successful -> Failed -> Reversed
- **Raw payload preservation:** Keep original bank/blockchain payload separate from processed display table (enables bulk rollback)
- **Timestamps:** Store raw UTC + IANA timezone ID ("Europe/Paris"), never bare offsets (break on DST transitions)

**FX rate strategy:**
- Backend syncs and caches FX rates periodically (e.g., hourly)
- Lock the historical FX rate at transaction execution time (immutable audit record)
- Weekend gaps: Freeze fiat FX at Friday market close; let crypto float via real-time oracles
- Daily mark-to-market cutoff: 00:00 UTC

**Anti-patterns to reject:**
- Client-side FX conversion on render (synchronous API call per paint)
- Importing "Pending" and "Cleared" as separate transactions (dedup via state machine)
- Storing timestamps with fixed UTC offsets instead of IANA zone IDs

### 6. Hybrid Value Predictive Metrics Stack (PMPVH)

**Domain:** KPIs, analytics, product health, growth

See [references/metrics-playbook.md](references/metrics-playbook.md) for the full three-tier framework.

**Quick reference - the metrics that matter:**

| Tier | Metric | What It Predicts |
|------|--------|-----------------|
| Infrastructure (Leading) | Sync Failure Rate | Future churn from broken trust |
| Infrastructure (Leading) | Data Sync Accuracy | Arithmetic reliability perception |
| Friction (Mid) | SCA Drop-off Rate | Compliance-induced churn |
| Friction (Mid) | Time-to-first-link | Onboarding conversion |
| Value (Lagging/North Star) | LTV / Net Returning Revenue | Business viability |
| Value (Lagging/North Star) | Multiplayer Depth Index | Collaborative stickiness |

**Critical insight:** If a major bank's STET endpoint fails, the user blames Finandance, not the bank. Monitor Integration Health Score proactively and deploy graceful degradation (disable manual sync button, show empathetic banner) before users experience failures.

---

## PRD Enhancement Checklist for Fintech Features

When writing a PRD for any Finandance feature, validate against these fintech-specific gates **in addition to** the standard PRD structure (see `prd-development` skill):

### Data Integrity Gate
- [ ] All monetary values specified as integer minor units + ISO 4217 currency code?
- [ ] Idempotency strategy defined for any write operation?
- [ ] Transaction state machine documented (not binary success/fail)?
- [ ] FX conversion strategy specified (cached vs. real-time, weekend policy)?
- [ ] Timezone handling uses UTC + IANA, not bare offsets?

### Trust Engineering Gate
- [ ] Security measures translated into user-facing trust signals?
- [ ] Friction classified per FSM quadrant (positive, negative, zero)?
- [ ] Progressive disclosure applied to verification flows?
- [ ] SCA renewal impact assessed and notification strategy defined?

### Async Resilience Gate
- [ ] Every external API interaction designed for failure (retry, backoff, fallback)?
- [ ] UI behavior defined for stale/unavailable data states?
- [ ] Graceful degradation strategy for provider outages?
- [ ] Webhook vs. polling architecture decision documented?

### Collaborative Finance Gate (if shared features)
- [ ] Privacy-by-default enforced (opt-in sharing)?
- [ ] Split rule engine requirements specified?
- [ ] Double-counting prevention strategy documented?
- [ ] Conflict resolution flow designed (async approval, not last-write-wins)?
- [ ] Audit trail requirements defined?

### Crypto/Web3 Gate (if digital assets)
- [ ] Read-only architecture enforced (no signing capability)?
- [ ] API key permission verification flow designed?
- [ ] Volatility presentation strategy defined (smoothed curves vs. real-time)?
- [ ] Multi-chain discovery approach specified?

---

## Decision Framework: Junior vs Senior PM

When evaluating any product decision, check against the Senior PM column. See [references/decision-matrices.md](references/decision-matrices.md) for the complete comparison tables across all domains.

**Quick self-check questions:**

1. **Am I assuming HTTP 200 = business success?** Map to a state machine instead.
2. **Am I blocking UI on an external API response?** Use optimistic cache + background sync.
3. **Am I treating all errors the same?** Segment: transient network (auto-retry) vs. consent revocation (re-auth).
4. **Am I using float for money?** Switch to integer minor units.
5. **Am I hiding security from users?** Surface it as trust signals.
6. **Am I measuring vanity metrics (DAU/MAU)?** Track sync health, SCA friction, multiplayer depth.
7. **Am I forcing full verification before showing value?** Apply progressive disclosure.
8. **Am I designing for individual users only?** Model as multi-tenant ledger with granular permissions.

---

## Workflow: Fintech-Enhanced PRD Creation

When creating a PRD for Finandance, follow this enhanced flow:

### Phase 0: Context Framing (NEW - Fintech specific)
1. Identify which of the 6 frameworks apply to this feature
2. List external dependencies (banks, aggregators, blockchains, exchanges)
3. Classify the feature: pure aggregation / collaborative / security / analytics
4. Determine regulatory touchpoints (PSD2/PSD3, GDPR, SCA, AML)

### Phases 1-8: Standard PRD Flow
Follow `prd-development` skill phases, enhanced with:
- **Phase 2 (Problem):** Include fintech-specific pain points (sync failures, SCA friction, FX gaps)
- **Phase 5 (Solution):** Apply relevant frameworks (ASR, VAC, RCP, FSM, ETOU)
- **Phase 6 (Metrics):** Use PMPVH tier structure, not generic DAU/MAU
- **Phase 7 (Stories):** Include acceptance criteria from the fintech gates above
- **Phase 9 (Dependencies):** Map API providers, regulatory timelines, aggregator SLAs

### Phase 9: Fintech Validation (NEW)
Run the PRD Enhancement Checklist (above) as a final quality gate before handoff.

---

## References

- [Decision Matrices: Junior vs Senior PM](references/decision-matrices.md) - Complete comparison tables
- [Metrics Playbook: PMPVH Framework](references/metrics-playbook.md) - Full metrics definitions and targets
- [Data Architecture Patterns](references/data-architecture.md) - ETOU implementation details
- Related skills: `prd-development`, `prd`, `speckit.specify`, `speckit.plan`
