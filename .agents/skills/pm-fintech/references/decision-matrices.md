# Decision Matrices: Junior vs Senior PM

Reference tables for evaluating product decisions across all Finandance domains. When making a decision, find the relevant domain and check that your approach aligns with the Senior PM column.

---

## 1. Banking Aggregation & Sync

| Decision Area | Junior PM (Anti-pattern) | Senior PM (Target) |
|---|---|---|
| **API Response Handling** | Assumes HTTP 200 means the transaction is financially settled. | Understands processors fail; maps transactions to a business state machine (Pending -> Cleared -> Reversed). |
| **Sync UX Design** | Manual "Refresh" button that blocks screen with infinite spinner until bank responds. | Optimistic cache + silent background sync. Shows freshness markers ("Updated 2h ago"). |
| **Network Failure Resolution** | Treats all disconnections as generic errors: "Try again later." | Segments errors algorithmically: transient network (auto-retry with backoff) vs. PSD2 consent revocation (re-auth flow). |

---

## 2. Crypto / Web3 Aggregation

| Decision Area | Junior PM (Anti-pattern) | Senior PM (Target) |
|---|---|---|
| **Exchange API Key Handling** | Plain text field for pasting keys. Assumes user knows how to set permissions. | Contextual guidance: deep links to Kraken/Binance API settings, animations showing which checkboxes to uncheck, confirmation modal for read-only verification. |
| **Wallet Address Display** | Shows raw 42-char hex hashes. Confuses and alienates users. | Resolves to ENS domains or user-defined labels ("Ledger Vault - Retirement"). |
| **Price Update Strategy** | Continuous polling to show millisecond-accurate prices. Exhausts backend, stresses user with flickering numbers. | Cached institutional price oracles. Periodic controlled updates. Focus on weighted portfolio % change over time. |
| **Multi-chain Discovery** | Manual dropdown for user to select Layer 2 networks (Arbitrum, Optimism, Polygon). | Algorithmic auto-discovery across all EVM-compatible chains from a single seed address. |

---

## 3. Collaborative Finance

| Decision Area | Junior PM (Anti-pattern) | Senior PM (Target) |
|---|---|---|
| **Database Architecture** | Adds `user_id_2` column to monolithic accounts table. Limited to rigid pair configurations. | Models money as a multi-tenant ledger with relationship tables granting granular permissions (read/write/veto) per verified identity. |
| **Concurrency & Conflicts** | No conflict handling. If two users edit shared budget simultaneously, last save wins silently. | Optimistic locking at database level. Push notification for "pending modification approval" on any shared rule change. |
| **Success Metrics** | Counts "joint accounts opened" or consolidated deposit volume (banking vanity metrics). | Tracks relational engagement: shared categorization interactions per week, co-initiated financial goals, conversation threads per transaction. |
| **Expense Reconciliation** | No double-counting protection. Same expense deducted from both individual Net Worth calculations. | Zero-sum reconciliation engine: shared expense shown in joint budget at 100%, but individual Net Worth impact split per pre-agreed rule (50/50, 70/30, etc.). |

---

## 4. Security & Trust Engineering

| Decision Area | Junior PM (Anti-pattern) | Senior PM (Target) |
|---|---|---|
| **Onboarding Funnel** | Compresses KYC + address proof + facial capture + 2FA setup on first screen before any value shown. | Progressive disclosure: immediate interaction with simulators/blank dashboards. Verification gates activate only at bank-linking or binding-action moment. |
| **SCA 180-Day Renewal** | Blocks all data access on day 181. Cold error: "Authentication Error." | Proactive management: read-only access to cached historical data maintained. Friendly notification 5 days before: "Your secure connection needs a periodic renewal to protect your assets." |
| **Encryption Communication** | Hides all security infrastructure. Assumes users don't care or won't understand. | Leverages backend rigor as trust signal: "Your connection keys are fragmented and sealed with military-grade algorithms. Our team cannot decrypt them." |
| **Re-authentication Framing** | Presents mandatory re-auth as a platform bug or network disconnection. | Frames as "periodic security vault update required by law for your privacy protection." |

---

## 5. Data Architecture & Integrity

| Decision Area | Junior PM (Anti-pattern) | Senior PM (Target) |
|---|---|---|
| **Monetary Storage** | Specifies Float/Double for balance and receipt amounts. Causes rounding drift at scale. | Enforces BIGINT integer storage (minor units: 1050 = 10.50 EUR) + adjacent ISO 4217 currency column. All writes wrapped in atomic DB transactions with idempotency keys. |
| **Pending Transactions** | Hides pending transactions until settled. App balance doesn't match bank's held balance. | Shows pending transactions with attenuated visual treatment (greyed out/optimistic). Updates internal state via deduplication logic only when settlement webhook arrives. |
| **FX Rate Sync** | Forces client-side conversion at render time via synchronous external API call. Blocks and slows entire app. | Hybrid FX cache: backend syncs rates periodically (hourly). Locks historical rate at transaction execution time for immutable audit trail. |
| **Weekend Gaps** | Ignores that fiat FX markets close weekends. Crosses live crypto prices with stale/illiquid FX rates, creating phantom wealth jumps. | Freezes fiat FX at Friday market close. Lets crypto float via real-time oracles. Documents 00:00 UTC daily mark-to-market cutoff policy. |

---

## 6. Metrics & Analytics

| Decision Area | Junior PM (Anti-pattern) | Senior PM (Target) |
|---|---|---|
| **North Star Metric** | Total Revenue or total registered accounts. Drives aggressive upselling and dark patterns. | Active Subscribers with high-value action tracking: budget categorization cadence, proactive finance review, collaborative goal-setting frequency. |
| **Churn Diagnostics** | Reports a single monolithic monthly churn %. No granularity on root cause. | Instruments conditional funnels: segments churn by source institution ("Societe Generale users have 3x churn due to stricter PSD2 biometric flow"). Reallocates UX budget to compensate exogenous deficiencies. |
| **Account Health Scoring** | Single flat color-coded status (red/yellow/green) per household account. Averages dozens of fuzzy variables. | Multi-dimensional health score: granular per connected source AND per individual user within a shared household, weighted by micro-event interaction typology. |
| **Provider Outage Response** | Waits for support tickets to pile up before reacting. | Automated observability: detects silent degradation (marginal sync success drop, latency creep). Activates graceful degradation feature flags. Replaces manual sync button with empathetic outage banner for affected users only. |

---

## 7. Market Intelligence & Charting

| Decision Area | Junior PM (Anti-pattern) | Senior PM (Target) |
|---|---|---|
| **Charting Integration** | Builds custom charting engine from scratch (slow, inaccurate) OR dumps complex TradingView widgets on the home screen. | Uses lightweight TradingView components (Mini Ticker) for overview. Reserves advanced charting with technical indicators for dedicated drill-down investment views. |
| **Weekend FX/Crypto Handling** | Lets system calculate Net Worth on weekends crossing live crypto with stale/illiquid FX rates. Causes false wealth jumps triggering user panic. | Algorithmic accounting logic recognizing asymmetric weekend gaps. Fiat FX locked at last valid institutional close. Clear documentation of daily cutoff time (00:00 UTC). |
| **User Retention via Intelligence** | Forces users to leave the app for news portals or exchange sites to understand portfolio fluctuations. | Embeds market analysis, technical charting, and news flow in a single fluid interface within the app, minimizing investigative friction barriers. |
