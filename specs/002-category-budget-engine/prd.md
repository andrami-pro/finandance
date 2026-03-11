# PRD: Category-Based Budget Engine

**Feature ID:** F002-CATEGORY-BUDGET
**Author:** Andres Ramirez
**Date:** 2026-03-11
**Status:** Draft
**Priority:** P1 (Core monetization & retention lever)
**Applicable Frameworks:** ETOU (data integrity), ASR (async resilience), PMPVH (metrics)

---

## 0. Context Framing (Fintech-Specific)

### Classification
- **Type:** Pure aggregation + analytics
- **External dependencies:** None new (reads from already-synced transactions)
- **Regulatory touchpoints:** GDPR (spending analytics = personal data processing; legal basis: legitimate interest for service delivery)

### Current State
- **Categories on transactions:** DONE — 16 categories available (Housing, Transfer, Investment, Income, Food & Drink, Groceries, Travel, Transport, Entertainment, Shopping, Health, Subscriptions, Savings, Family & Gifts, Other, Uncategorized)
- **PATCH endpoint:** DONE — users can assign categories from table + detail panel
- **Budget UI:** DONE (hardcoded) — shows donut chart, area chart, summary cards, smart insights
- **Budget API:** NOT IMPLEMENTED — T052 (service), T054 (endpoints) pending
- **Budget hooks:** NOT IMPLEMENTED — T058 pending

### What This PRD Covers
How transaction categories feed into a **category-based budgeting system** that lets users set monthly spending limits per category, track actual vs planned, receive alerts, and visualize trends — replacing the current hardcoded Budget page with real data.

---

## 1. Problem Statement

### User Pain
Users can now categorize transactions, but the information is **decorative** — it doesn't feed into any actionable budgeting. The Budget page shows fake data. Users cannot:
- Set a monthly budget per category
- See how much they've spent vs their budget in real time
- Get alerts when approaching or exceeding limits
- Understand spending trends over time by category

### Business Pain
- The Budget page is the #2 navigation item but delivers zero value
- Without category-budget tracking, there's no reason for users to maintain categories (reducing engagement with the categorization feature we just built)
- No data foundation for future "Smart Insights" (which require historical category spending patterns)

### Hypothesis
> If users can set per-category spending limits and see real-time progress against them, they will categorize more transactions (target: >70% categorized within 30 days) and visit the Budget page at least 3x/week.

---

## 2. User Stories

### US-B1: Set Category Budgets
**As a** user who tracks spending
**I want to** set a monthly spending limit for each category
**So that** I can control my finances by expense type

**Acceptance Criteria:**
- User can assign a monthly EUR amount to any category
- Budget limits persist across months (auto-renew unless changed)
- Setting a budget to €0 or removing it excludes the category from budget tracking
- Budget amounts stored as integer minor units (ETOU compliance)
- "Uncategorized" spending is trackable but not budget-assignable

### US-B2: View Budget Progress
**As a** user with active budgets
**I want to** see how much I've spent vs my budget per category in the current period
**So that** I can adjust my spending before exceeding limits

**Acceptance Criteria:**
- Budget page shows a progress bar per active category (spent / budgeted)
- Color coding: green (<70%), amber (70-90%), red (>90%), over-budget (pulsing red)
- Total budget summary: total budgeted, total spent, remaining
- Zero-based budget donut chart populated with real category data
- Period toggle (Monthly / Quarterly / Yearly) recalculates proportionally

### US-B3: Budget Alerts
**As a** user who wants to stay within limits
**I want to** receive visual alerts when I'm close to or over my budget
**So that** I can take corrective action

**Acceptance Criteria:**
- In-app badge on "Budget" sidebar item when any category exceeds 90%
- Category cards show warning state at 90% and over-budget state at 100%+
- Smart Insights section shows actionable alerts (e.g., "Food & Drink is 92% of budget with 8 days left")
- No push notifications in MVP (future consideration)

### US-B4: Spending Trends by Category
**As a** user who wants to understand patterns
**I want to** see how my spending per category evolves over time
**So that** I can identify trends and adjust budgets

**Acceptance Criteria:**
- "Budget vs Actual" area chart shows real data for current period
- Comparison with previous period available (dotted line overlay)
- Category breakdown supports Monthly, Quarterly, Yearly views

---

## 3. Data Model

### New Table: `budget_limits`

```sql
CREATE TABLE public.budget_limits (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category        VARCHAR(100)    NOT NULL,
    amount_cents    BIGINT          NOT NULL,  -- ETOU: integer minor units
    currency        VARCHAR(10)     NOT NULL DEFAULT 'EUR',
    period          VARCHAR(10)     NOT NULL DEFAULT 'monthly',  -- monthly | quarterly | yearly
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_user_category_period UNIQUE (user_id, category, period)
);

-- RLS: users can only read/write their own budget limits
ALTER TABLE public.budget_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own budgets"
    ON public.budget_limits
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_budget_limits_user ON public.budget_limits(user_id, is_active);
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Money storage** | `BIGINT` (cents) | ETOU framework — no float drift. €45.00 = 4500 |
| **Period as column** | `monthly\|quarterly\|yearly` | Users may want different budgets for different timeframes |
| **Unique constraint** | `(user_id, category, period)` | One budget per category per period per user |
| **No budget history table** | Update in place + `updated_at` | MVP simplicity. History tracking deferred to audit_log events |
| **Category as string** | VARCHAR, not FK | Categories are freeform (same as transactions). No separate categories table needed yet |

---

## 4. API Design

### 4.1 `GET /api/v1/budget/summary`

Returns the user's budget overview for a given period.

**Query params:**
- `period`: `monthly` | `quarterly` | `yearly` (default: `monthly`)
- `month`: ISO month `2026-03` (default: current month). For quarterly/yearly, determines the containing quarter/year.

**Response:**
```json
{
  "period": "monthly",
  "period_label": "Mar 2026",
  "since": "2026-03-01T00:00:00Z",
  "until": "2026-03-31T23:59:59Z",
  "total_budgeted_cents": 450000,
  "total_spent_cents": 312050,
  "remaining_cents": 137950,
  "savings_rate": 30.7,
  "currency": "EUR",
  "categories": [
    {
      "category": "Housing",
      "budgeted_cents": 150000,
      "spent_cents": 140000,
      "remaining_cents": 10000,
      "percent_used": 93.3,
      "transaction_count": 2,
      "status": "warning"
    },
    {
      "category": "Food & Drink",
      "budgeted_cents": 60000,
      "spent_cents": 45020,
      "remaining_cents": 14980,
      "percent_used": 75.0,
      "transaction_count": 12,
      "status": "on_track"
    }
  ],
  "unbudgeted_spent_cents": 5400,
  "uncategorized_spent_cents": 8200
}
```

**Status values:** `on_track` (<70%), `caution` (70-90%), `warning` (90-100%), `over_budget` (>100%)

### 4.2 `GET /api/v1/budget/categories`

Returns spending breakdown by category (for donut chart + trends), including categories without a budget.

**Query params:**
- `period`: `monthly` | `quarterly` | `yearly`
- `month`: ISO month
- `compare`: `true` | `false` (include previous period for comparison)

**Response:**
```json
{
  "current": {
    "period_label": "Mar 2026",
    "categories": [
      {
        "category": "Housing",
        "spent_cents": 140000,
        "percent_of_total": 35.0,
        "transaction_count": 2
      }
    ],
    "total_spent_cents": 400000
  },
  "previous": {
    "period_label": "Feb 2026",
    "categories": [...],
    "total_spent_cents": 380000
  }
}
```

### 4.3 `PUT /api/v1/budget/limits`

Create or update budget limits (bulk upsert).

**Request:**
```json
{
  "period": "monthly",
  "limits": [
    { "category": "Housing", "amount_cents": 150000 },
    { "category": "Food & Drink", "amount_cents": 60000 },
    { "category": "Transport", "amount_cents": 15000 }
  ]
}
```

**Response:** Returns the full updated budget summary (same as GET /summary).

**Idempotency:** Upsert on `(user_id, category, period)`. Setting `amount_cents: 0` deactivates the budget for that category.

### 4.4 `DELETE /api/v1/budget/limits/{category}`

Remove a single category budget.

**Query params:** `period` (default: `monthly`)

---

## 5. Frontend UX

### 5.1 Budget Page — Wired to Real Data

Replace hardcoded values in `budget/page.tsx`:

**Summary Cards:**
- Monthly Budget → `total_budgeted_cents / 100`
- Actual Spending → `total_spent_cents / 100` + progress bar (`percent_used`)
- Savings Rate → `savings_rate`%

**Budget vs Actual Chart:**
- X-axis: weeks of the period
- Dashed line: linear projection of `total_budgeted_cents` spread across weeks
- Solid emerald line: cumulative `total_spent_cents` by week (from transaction dates)
- Data source: `GET /budget/categories?compare=true`

**Zero-Based Budget Donut:**
- Segments from `categories[].percent_of_total`
- Colors from `CATEGORY_STYLES` map (already defined in transactions page — extract to shared constant)
- Center: remaining budget amount

**Smart Insights:**
- Generated client-side from budget data:
  - "Housing is at 93% with 20 days remaining"
  - "Food & Drink trending 15% higher than last month"
  - "You have €1,379 remaining this month"

### 5.2 Category Budget Editor

New component accessible from Budget page ("Edit Budgets" button):

- Modal or expandable section
- List of all categories with input fields for amount (€)
- Pre-filled with existing limits
- Categories without a budget show as "No limit set"
- Bulk save via `PUT /api/v1/budget/limits`
- Visual feedback: progress bars update in real-time as limits change

### 5.3 Category Badge Enhancement

In the transactions table, category badges for over-budget categories should show a subtle warning indicator (small dot or ring) to reinforce budget awareness.

### 5.4 Shared Constants

Extract `CATEGORIES` and `CATEGORY_STYLES` from `transactions/page.tsx` into `lib/categories.ts` for reuse in Budget page, ensuring style consistency.

---

## 6. Computation Logic

### Budget Summary Calculation

```
For a given user + period:
1. Fetch all active budget_limits for the period
2. Fetch all transactions within the date range where direction = 'OUT'
3. Group transactions by category
4. For each budgeted category:
   - spent_cents = SUM(abs(amount) * 100) for that category
   - remaining_cents = budgeted_cents - spent_cents
   - percent_used = (spent_cents / budgeted_cents) * 100
   - status = on_track | caution | warning | over_budget
5. unbudgeted_spent_cents = spending in categories without a budget
6. uncategorized_spent_cents = spending where category IS NULL
7. savings_rate = ((total_budgeted - total_spent) / total_budgeted) * 100
```

### Important: Amount Conversion

Current transactions store `amount` as `NUMERIC(18,8)` in EUR (not cents). The budget service must convert:
- Transaction amounts → multiply by 100 and round to get cents
- Budget limits are natively in cents (new table)
- API responses always return cents; frontend divides by 100 for display

This prevents float drift across the computation chain (ETOU compliance).

---

## 7. Metrics (PMPVH Framework)

### Infrastructure (Leading)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Budget API p95 latency | <200ms | Server-side timing |
| Category coverage rate | >70% of transactions categorized within 30d | `COUNT(WHERE category IS NOT NULL) / COUNT(*)` |

### Friction (Mid)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first budget | <3 min from Budget page visit | Client event tracking |
| Budget setup completion rate | >60% of users who open editor complete it | Funnel: open → save |

### Value (North Star)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Budget page weekly active rate | >3 visits/week per active user | Page view analytics |
| Budget adherence rate | >50% of categories within budget at month-end | `categories WHERE status != over_budget` |
| Category re-assignment rate | <15% (low = good initial categorization) | PATCH calls that change existing category |

---

## 8. Fintech Validation Checklist

### Data Integrity Gate
- [x] Monetary values as integer minor units (cents) in `budget_limits.amount_cents`
- [x] Idempotency via UNIQUE constraint `(user_id, category, period)` + upsert
- [x] No float arithmetic — transactions converted to cents at computation boundary
- [x] Currency code stored alongside amounts
- [ ] N/A: No FX conversion needed (single-currency EUR budgets for MVP)
- [ ] N/A: No timezone edge cases (budgets are month-level, not hour-level)

### Trust Engineering Gate
- [x] Progress bars and color coding surface budget health transparently
- [x] Smart Insights translate data into actionable language
- [x] No destructive actions without confirmation (deleting a budget limit)
- [ ] N/A: No SCA impact

### Async Resilience Gate
- [x] Budget computation reads from already-synced local transactions (no external API calls)
- [x] Stale data handled: "Last synced X ago" indicator carried from sync layer
- [x] If no transactions exist for a category, budget shows €0 spent (not error)
- [ ] N/A: No webhook/polling for this feature

---

## 9. Implementation Sequence

Builds on existing pending tasks (T052, T054, T058):

| Step | What | Depends On | Maps To |
|------|------|------------|---------|
| 1 | DB migration: create `budget_limits` + RLS | — | New |
| 2 | `budget_service.py`: summary + category computation | Step 1 | T052 |
| 3 | `budget.py` endpoints: GET summary, GET categories, PUT limits, DELETE | Step 2 | T054 |
| 4 | Extract `CATEGORIES` + `CATEGORY_STYLES` to `lib/categories.ts` | — | New |
| 5 | `useBudget.ts` hook | Step 3 | T058 |
| 6 | Wire Budget page to real data + add category budget editor | Steps 4, 5 | T056 update |
| 7 | Integration tests | Steps 3, 6 | T050, T051 |

### Out of Scope (Future)
- Multi-currency budgets (EUR-only for MVP)
- Recurring budget templates ("copy last month's budgets")
- Budget sharing in shared projects (RCP framework — separate PRD)
- Push notifications for budget alerts
- AI-powered budget suggestions based on spending history
- Rollover (unused budget carries to next month)

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users don't categorize transactions | Budget page shows mostly "Uncategorized" | Show prominent "X transactions uncategorized" banner with quick-assign CTA |
| Large transaction volumes slow budget computation | >200ms API latency | Aggregate with SQL `GROUP BY` in Supabase, not in Python. Index on `(funding_source_id, category, transaction_date)` |
| Category name mismatch between transactions and budgets | Orphaned budget limits | Use same `CATEGORIES` constant on frontend; backend validates against allowed list |
| Users set unrealistic budgets | Poor experience, feature abandonment | Show "vs last month actual" hint next to each budget input field |
