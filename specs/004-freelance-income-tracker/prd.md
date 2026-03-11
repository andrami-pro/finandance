# PRD: Freelance Income Tracker

**Feature ID:** F004-FREELANCE-INCOME
**Author:** Andres Ramirez
**Date:** 2026-03-11
**Status:** Draft
**Priority:** P1 (Revenue visibility — core for budget-to-income comparison)
**Applicable Frameworks:** ETOU (data integrity), ASR (async resilience), PMPVH (metrics), FSM (friction-security)

---

## 0. Context Framing (Fintech-Specific)

### Classification
- **Type:** Analytics + manual data entry (hybrid)
- **External dependencies:** None new (reads from already-synced transactions for matching)
- **Regulatory touchpoints:** GDPR (client names = personal data; legal basis: user-entered data for service delivery)

### Current State
- **Transactions with direction='IN':** Synced and displayed in the transactions table
- **Income category:** Exists in the 16-category system, can be assigned manually
- **Budget system:** Tracks outflows only (F002). No income-side tracking.
- **Dashboard:** Shows net worth and project progress, but no income aggregation or forecast
- **Freelance/client management:** NOT IMPLEMENTED — no concept of clients, expected income, or income matching

### What This PRD Covers
A **Freelance Income Tracker** module that lets users manage active clients, define expected monthly income per client, track received vs expected payments, and compare total expected income against their monthly budget — creating a complete **income ↔ expense** financial picture.

---

## 1. Problem Statement

### User Pain
Freelancers and independent workers using Finandance can see transactions flowing in, but have **zero visibility into**:
- Who owes them money and when
- Whether expected payments have arrived
- How their expected income compares to their budget (can I afford my spending plan?)
- Monthly income trends per client over time

The Budget page answers "am I spending within limits?" but never "can I actually afford those limits?"

### Business Pain
- The Budget feature operates in a vacuum without income context — users set budgets they may not be able to sustain
- No reason for users to return daily (budgets are set-and-forget) — income tracking adds a **daily check-in** habit
- Missing the freelancer persona entirely (a large segment of EU digital finance users)
- No foundation for future cash flow forecasting or tax estimation features

### Hypothesis
> If freelancers can track expected vs received income per client alongside their budget, they will visit the app 5x/week (vs 3x for budget-only users) and achieve >80% income confirmation rate within 5 business days of expected date.

---

## 2. User Stories

### US-F1: Manage Clients
**As a** freelancer
**I want to** maintain a list of my active clients with their expected monthly payment
**So that** I know my total expected income at a glance

**Acceptance Criteria:**
- User can create a client with: name, expected monthly amount (EUR cents), payment frequency (monthly/biweekly/weekly/one-time), expected payment day (1-31), and optional notes
- Client list shows active/inactive toggle
- Inactive clients are hidden from income projections but preserved for history
- Client names are user-entered free text (not linked to any external entity)
- Expected amounts stored as integer minor units (ETOU compliance)

### US-F2: View Income Dashboard
**As a** user with active clients
**I want to** see a summary of expected vs received income for the current period
**So that** I know my financial position before the month ends

**Acceptance Criteria:**
- Income section shows: total expected, total received, total pending, total overdue
- Per-client rows show: client name, expected amount, status (received/pending/overdue/partial), received amount, variance
- Status logic:
  - **Received:** A matching income transaction has been linked (within ±5% tolerance or exact match)
  - **Pending:** Expected payment day hasn't passed yet
  - **Overdue:** Expected payment day has passed without a matched transaction
  - **Partial:** Received amount is >0 but below expected (outside tolerance)
- Period toggle (Monthly) aligned with budget period
- "Income vs Budget" comparison card: expected income vs total budgeted spending

### US-F3: Link Income Transactions to Clients
**As a** user who receives payments
**I want to** associate incoming transactions with specific clients
**So that** I can confirm payments and track who has paid

**Acceptance Criteria:**
- From the income dashboard: "Match Payment" action per client opens a picker showing recent unmatched `direction='IN'` transactions
- From the transaction detail panel: new "Link to Client" dropdown for `direction='IN'` transactions
- When linked:
  - The transaction's `client_id` field is populated
  - The expected income entry status updates to "received" or "partial"
  - The transaction is visually marked as client-linked in the transactions table
- A single expected income entry can be matched to one or multiple transactions (partial payments)
- Matching is manual (user confirms), not automatic — builds trust (FSM: positive friction)
- Unmatched income transactions are still visible and functional (no forced linking)

### US-F4: Income Trends
**As a** user tracking freelance income
**I want to** see how my income per client evolves over time
**So that** I can identify reliable clients and seasonal patterns

**Acceptance Criteria:**
- Monthly income history per client (last 6 months)
- Total income trend line
- Payment reliability score per client: % of on-time payments over the last 6 months
- Comparison: current month income vs previous month

### US-F5: Income vs Budget Insight
**As a** user with both budgets and income tracking
**I want to** see whether my expected income covers my planned spending
**So that** I can adjust budgets proactively

**Acceptance Criteria:**
- On the Budget page: new "Income Coverage" card showing `expected income / total budgeted` as percentage
- On the Income page: "Budget Gap" indicator showing surplus or deficit
- Smart Insight (Budget page): "Your expected income covers X% of your budget this month" or "You have a projected surplus/deficit of €X"
- Color coding: green (income > budget), amber (income covers 80-100%), red (income < 80% of budget)

---

## 3. Data Model

### New Table: `clients`

```sql
CREATE TABLE public.clients (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name            VARCHAR(200)    NOT NULL,
    expected_amount_cents BIGINT    NOT NULL DEFAULT 0,
    currency        VARCHAR(10)     NOT NULL DEFAULT 'EUR',
    payment_frequency VARCHAR(20)   NOT NULL DEFAULT 'monthly',
    expected_day    SMALLINT        DEFAULT 1,
    notes           TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT chk_client_frequency CHECK (
        payment_frequency IN ('monthly', 'biweekly', 'weekly', 'one_time')
    ),
    CONSTRAINT chk_expected_day CHECK (expected_day BETWEEN 1 AND 31),
    CONSTRAINT chk_amount_non_negative CHECK (expected_amount_cents >= 0)
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_select_own ON public.clients FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY clients_insert_own ON public.clients FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY clients_update_own ON public.clients FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY clients_delete_own ON public.clients FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX idx_clients_user_active ON public.clients(user_id, is_active)
    WHERE is_active = TRUE;
```

### New Table: `expected_incomes`

Tracks per-period expected income entries (one row per client per month).

```sql
CREATE TABLE public.expected_incomes (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    client_id       UUID            NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    period_start    DATE            NOT NULL,
    expected_amount_cents BIGINT    NOT NULL,
    received_amount_cents BIGINT   NOT NULL DEFAULT 0,
    currency        VARCHAR(10)     NOT NULL DEFAULT 'EUR',
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending',
    confirmed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_client_period UNIQUE (client_id, period_start),
    CONSTRAINT chk_income_status CHECK (
        status IN ('pending', 'partial', 'received', 'overdue')
    )
);

ALTER TABLE public.expected_incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY expected_incomes_select_own ON public.expected_incomes FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY expected_incomes_insert_own ON public.expected_incomes FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY expected_incomes_update_own ON public.expected_incomes FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY expected_incomes_delete_own ON public.expected_incomes FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX idx_expected_incomes_user_period
    ON public.expected_incomes(user_id, period_start);
CREATE INDEX idx_expected_incomes_status
    ON public.expected_incomes(status) WHERE status IN ('pending', 'overdue');
```

### New Table: `income_transaction_links`

Join table linking income transactions to expected income entries.

```sql
CREATE TABLE public.income_transaction_links (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    expected_income_id  UUID        NOT NULL REFERENCES public.expected_incomes(id) ON DELETE CASCADE,
    transaction_id      UUID        NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    amount_cents        BIGINT      NOT NULL,
    linked_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_txn_link UNIQUE (expected_income_id, transaction_id)
);

ALTER TABLE public.income_transaction_links ENABLE ROW LEVEL SECURITY;

-- RLS via expected_incomes ownership (join-based)
CREATE POLICY income_links_select ON public.income_transaction_links FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.expected_incomes ei
            WHERE ei.id = expected_income_id AND ei.user_id = auth.uid()
        )
    );
CREATE POLICY income_links_insert ON public.income_transaction_links FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expected_incomes ei
            WHERE ei.id = expected_income_id AND ei.user_id = auth.uid()
        )
    );
CREATE POLICY income_links_delete ON public.income_transaction_links FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.expected_incomes ei
            WHERE ei.id = expected_income_id AND ei.user_id = auth.uid()
        )
    );
```

### Transactions Table Modification

Add optional `client_id` column for quick lookups:

```sql
ALTER TABLE public.transactions
    ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_client ON public.transactions(client_id)
    WHERE client_id IS NOT NULL;
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Separate `expected_incomes` table** | Not just a field on `clients` | Enables per-period tracking, historical comparison, and partial payment matching |
| **Join table for links** | `income_transaction_links` | One expected income can match multiple transactions (partial payments); one transaction could theoretically split across entries |
| **`client_id` on transactions** | Denormalized FK | Fast filtering of "all transactions from client X" without joining through links table |
| **Manual matching only** | No auto-match | FSM positive friction — user confirms payment receipt explicitly, building trust in the data |
| **Status on expected_incomes** | `pending/partial/received/overdue` | State machine, not binary. Allows partial payments and overdue tracking |
| **`period_start` as DATE** | First day of the month | Simple monthly bucketing. Weekly/biweekly clients generate multiple expected_incomes per month |
| **Amount tolerance ±5%** | Frontend display hint | Not enforced in DB — frontend shows "close match" indicator but user decides |

---

## 4. API Design

### 4.1 `GET /api/v1/clients`

List active clients for the authenticated user.

**Query params:**
- `include_inactive`: `true` | `false` (default: `false`)

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Acme Corp",
    "expected_amount_cents": 350000,
    "currency": "EUR",
    "payment_frequency": "monthly",
    "expected_day": 15,
    "notes": "Net 30 from invoice date",
    "is_active": true,
    "created_at": "2026-01-15T10:00:00Z"
  }
]
```

### 4.2 `POST /api/v1/clients`

Create a new client.

**Request:**
```json
{
  "name": "Acme Corp",
  "expected_amount_cents": 350000,
  "currency": "EUR",
  "payment_frequency": "monthly",
  "expected_day": 15,
  "notes": "Net 30 from invoice date"
}
```

### 4.3 `PUT /api/v1/clients/{client_id}`

Update client details.

### 4.4 `DELETE /api/v1/clients/{client_id}`

Soft-delete (sets `is_active = false`). Preserves history.

### 4.5 `GET /api/v1/income/summary`

Returns the income overview for a given period.

**Query params:**
- `month`: ISO month `2026-03` (default: current month)

**Response:**
```json
{
  "period_label": "Mar 2026",
  "since": "2026-03-01",
  "until": "2026-03-31",
  "total_expected_cents": 750000,
  "total_received_cents": 350000,
  "total_pending_cents": 350000,
  "total_overdue_cents": 50000,
  "currency": "EUR",
  "income_vs_budget": {
    "total_budgeted_cents": 450000,
    "coverage_percent": 166.7,
    "surplus_cents": 300000,
    "status": "healthy"
  },
  "clients": [
    {
      "client_id": "uuid",
      "client_name": "Acme Corp",
      "expected_amount_cents": 350000,
      "received_amount_cents": 350000,
      "status": "received",
      "expected_day": 15,
      "confirmed_at": "2026-03-14T16:30:00Z",
      "linked_transactions": [
        {
          "transaction_id": "uuid",
          "amount_cents": 350000,
          "description": "SEPA Acme Corp Invoice #42",
          "transaction_date": "2026-03-14T12:00:00Z"
        }
      ]
    },
    {
      "client_id": "uuid",
      "client_name": "Beta LLC",
      "expected_amount_cents": 200000,
      "received_amount_cents": 0,
      "status": "pending",
      "expected_day": 25,
      "confirmed_at": null,
      "linked_transactions": []
    },
    {
      "client_id": "uuid",
      "client_name": "Old Client",
      "expected_amount_cents": 200000,
      "received_amount_cents": 150000,
      "status": "partial",
      "expected_day": 5,
      "confirmed_at": null,
      "linked_transactions": [
        {
          "transaction_id": "uuid",
          "amount_cents": 150000,
          "description": "Transfer Old Client partial",
          "transaction_date": "2026-03-06T09:00:00Z"
        }
      ]
    }
  ],
  "unlinked_income_count": 3,
  "unlinked_income_cents": 85000
}
```

**Status logic (computed server-side):**
- `received`: `received_amount_cents >= expected_amount_cents * 0.95` (5% tolerance)
- `partial`: `received_amount_cents > 0` but below tolerance
- `overdue`: `status == 'pending'` AND current date > `period_start + expected_day`
- `pending`: default, payment day hasn't passed

**`income_vs_budget`:** Cross-references with budget_limits to show coverage:
- `healthy`: income > budget (green)
- `tight`: 80-100% coverage (amber)
- `deficit`: < 80% coverage (red)

### 4.6 `POST /api/v1/income/link`

Link a transaction to an expected income entry.

**Request:**
```json
{
  "expected_income_id": "uuid",
  "transaction_id": "uuid",
  "amount_cents": 350000
}
```

**Behavior:**
1. Creates row in `income_transaction_links`
2. Updates `expected_incomes.received_amount_cents` (sum of all linked amounts)
3. Updates `expected_incomes.status` based on new total
4. Sets `transactions.client_id` to the client_id from the expected_income
5. Returns updated expected income entry

### 4.7 `DELETE /api/v1/income/link/{link_id}`

Unlink a transaction. Reverses the status + amount updates.

### 4.8 `GET /api/v1/income/unmatched`

List recent `direction='IN'` transactions not linked to any expected income.

**Query params:**
- `month`: ISO month (default: current)
- `limit`: max results (default: 20)

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "amount": "3500.00",
      "amount_cents": 350000,
      "currency": "EUR",
      "description": "SEPA Acme Corp Invoice #42",
      "transaction_date": "2026-03-14T12:00:00Z",
      "source_name": "Wise EUR",
      "provider_name": "WISE",
      "category": "Income"
    }
  ],
  "total": 3
}
```

### 4.9 `POST /api/v1/income/generate`

Auto-generate expected income entries for the current month based on active clients.

**Behavior:**
- For each active client, create an `expected_incomes` row for the target month if one doesn't already exist
- Weekly/biweekly clients generate multiple entries (with incrementing `period_start` dates)
- Idempotent: skips if entry for that client+period already exists (UNIQUE constraint)

**Response:** List of generated expected_income entries.

---

## 5. Frontend UX

### 5.1 Income Page — New Route `/income`

New sidebar item "Income" positioned between "Budget" and "Shared Projects" with a Phosphor `Invoice` or `CurrencyEur` icon.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  Freelance Income              Mar 2026    [Monthly] │
│  ─────────────────────────────────────────────────── │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐ │
│  │ Expected │  │ Received │  │ Pending  │  │Over- │ │
│  │ €7,500   │  │ €3,500   │  │ €3,500   │  │due   │ │
│  │          │  │  46.7%   │  │  46.7%   │  │€500  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────┘ │
│                                                       │
│  ┌─ Income vs Budget ──────────────────────────────┐ │
│  │  Expected: €7,500  │  Budget: €4,500             │ │
│  │  ████████████████████████████ 166% coverage      │ │
│  │  Surplus: €3,000 ✓                               │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─ Clients ──────────────── [+ Add Client] ───────┐ │
│  │  ✅ Acme Corp     €3,500  Received   Mar 14     │ │
│  │  ⏳ Beta LLC      €2,000  Pending    Due Mar 25  │ │
│  │  ⚠️ Old Client    €1,500  Partial    €500 short │ │
│  │  🔴 Gamma SA      €500    Overdue    Due Mar 5   │ │
│  │                                                   │ │
│  │  [Match Payment]  [Match Payment]  ...           │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─ Unmatched Income ──────────────────────────────┐ │
│  │  3 income transactions (€850) not linked         │ │
│  │  ▸ SEPA Transfer — €400 — Mar 12 — Wise EUR     │ │
│  │  ▸ Crypto deposit — €300 — Mar 10 — Kraken      │ │
│  │  ▸ Bank transfer — €150 — Mar 8 — Wise EUR      │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 5.2 Summary Cards

Four cards at top:
- **Expected Income:** `total_expected_cents / 100` (neutral foreground)
- **Received:** `total_received_cents / 100` + percentage of expected (primary/emerald)
- **Pending:** `total_pending_cents / 100` (muted foreground)
- **Overdue:** `total_overdue_cents / 100` (destructive/red, only visible if > 0)

### 5.3 Income vs Budget Card

Horizontal comparison bar:
- Left segment: total expected income
- Right segment: total budgeted spending
- Overlap visualization showing coverage
- Color: green (>100%), amber (80-100%), red (<80%)
- Text: "Your income covers X% of your planned spending" + surplus/deficit amount

### 5.4 Client List

Each client row shows:
- Status icon (checkmark green, clock muted, warning amber, X red)
- Client name (bold)
- Expected amount
- Status badge (Received/Pending/Overdue/Partial) with `CATEGORY_STYLES`-like coloring
- Received amount if partial
- Expected day or confirmed date
- **"Match Payment"** button (opens transaction picker drawer)

### 5.5 Match Payment Drawer

Slide-in panel (reuse transaction detail panel pattern) showing:
- Target client name + expected amount
- List of unmatched `direction='IN'` transactions from the current period
- Each transaction shows: description, amount, date, source
- Amount tolerance hint: transactions within ±5% of expected are highlighted
- Click to link → confirms and updates status
- Multiple transactions can be linked (partial payments)

### 5.6 Add/Edit Client Modal

Modal with:
- Client name (text input, required)
- Expected monthly amount (EUR input → stored as cents)
- Payment frequency (select: Monthly/Biweekly/Weekly/One-time)
- Expected payment day (1-31 number input)
- Notes (textarea, optional)
- Save / Cancel buttons

### 5.7 Budget Page Enhancement

Add an "Income Coverage" card in the summary row:
- Shows expected income vs total budget
- Links to `/income` page
- Smart Insight: "Your expected income covers X% of your budget this month"

### 5.8 Transaction Table Enhancement

For `direction='IN'` transactions:
- Show client name badge if `client_id` is set
- "Link to Client" quick action in the category dropdown area
- Linked transactions show a subtle chain/link icon

### 5.9 Sidebar Badge

When there are overdue expected incomes, show a badge count on the "Income" nav item (same pattern as budget alerts).

---

## 6. Computation Logic

### Expected Income Generation (Monthly)

```
On page load or via POST /income/generate:
1. For each active client with payment_frequency = 'monthly':
   - Check if expected_incomes row exists for (client_id, period_start = first_of_month)
   - If not, INSERT with expected_amount_cents from client.expected_amount_cents
2. For weekly clients:
   - Generate 4 entries per month (period_start = each Monday of the month)
3. For biweekly clients:
   - Generate 2 entries (1st and 15th, or configured days)
4. For one_time clients:
   - Generate only if no existing entry (user must manually create repeats)
```

### Status Computation

```
For each expected_income entry in the period:
1. received_amount_cents = SUM(income_transaction_links.amount_cents)
2. If received >= expected * 0.95 → status = 'received', set confirmed_at
3. Else if received > 0 → status = 'partial'
4. Else if today > period_start.day(expected_day) → status = 'overdue'
5. Else → status = 'pending'
```

### Income vs Budget Cross-Reference

```
total_expected = SUM(expected_incomes.expected_amount_cents) for period
total_budgeted = SUM(budget_limits.amount_cents) for same period
coverage_percent = (total_expected / total_budgeted) * 100
surplus_cents = total_expected - total_budgeted
status = 'healthy' if coverage > 100, 'tight' if 80-100, 'deficit' if < 80
```

---

## 7. Metrics (PMPVH Framework)

### Infrastructure (Leading)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Income API p95 latency | <200ms | Server-side timing |
| Expected income generation success rate | 100% | Cron/on-demand generation idempotency |

### Friction (Mid)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first client creation | <2 min | Client event: page visit → first client saved |
| Payment match rate | >70% of expected incomes matched within 5 business days | `received / (received + overdue)` |
| Match flow completion | >80% of users who click "Match" complete the link | Funnel: click → confirm |

### Value (North Star)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Income page weekly active rate | >5 visits/week per active freelance user | Page view analytics |
| Income confirmation rate | >80% of expected incomes confirmed by month-end | `status IN ('received','partial') / total` |
| Budget-income awareness | >60% of budget users also use income tracking | Cross-feature adoption |
| Income forecast accuracy | ±10% of actual received | `abs(expected - received) / expected` |

---

## 8. Fintech Validation Checklist

### Data Integrity Gate (ETOU)
- [x] Monetary values as integer minor units (`expected_amount_cents`, `received_amount_cents`, `amount_cents`)
- [x] Idempotency via UNIQUE constraints (`client_id, period_start` on expected_incomes; `expected_income_id, transaction_id` on links)
- [x] No float arithmetic — all comparisons in cents
- [x] Currency code stored alongside amounts
- [x] Status as state machine (`pending → partial → received`, `pending → overdue`)
- [ ] N/A: No FX conversion needed (EUR-only for MVP)

### Trust Engineering Gate (FSM)
- [x] Manual payment matching = positive friction (user confirms, not auto-assigned)
- [x] Tolerance hint (±5%) guides without overriding user judgment
- [x] No destructive actions without confirmation (deleting a client preserves history via soft-delete)
- [x] Progressive disclosure: income page is optional, doesn't gate other features
- [x] Status indicators provide transparency (overdue warnings, not hidden state)

### Async Resilience Gate (ASR)
- [x] Income computation reads from already-synced local transactions (no external API calls)
- [x] Expected income generation is idempotent (safe to call multiple times)
- [x] If no transactions exist, clients show "Pending" (not error)
- [x] Stale data handled: inherits "Last synced X ago" from integration layer

---

## 9. Implementation Sequence

| Step | What | Depends On | Effort |
|------|------|------------|--------|
| 1 | DB migration: `clients`, `expected_incomes`, `income_transaction_links` tables + RLS + `client_id` on transactions | — | S |
| 2 | Backend models: Pydantic schemas for all request/response types | — | S |
| 3 | `client_service.py`: CRUD operations for clients | Step 1 | S |
| 4 | `income_service.py`: summary computation, expected income generation, link/unlink, status updates | Steps 1, 3 | M |
| 5 | `clients.py` router: CRUD endpoints | Steps 2, 3 | S |
| 6 | `income.py` router: summary, link, unlink, unmatched, generate endpoints | Steps 2, 4 | M |
| 7 | Register routers in `main.py` | Steps 5, 6 | XS |
| 8 | Frontend types: `src/types/income.ts` | — | S |
| 9 | Frontend hooks: `useClients.ts`, `useIncome.ts` | Steps 5, 6, 8 | S |
| 10 | Sidebar: add "Income" nav item | — | XS |
| 11 | Income page: `/income` route with full UI | Steps 9, 10 | L |
| 12 | Match Payment drawer component | Step 11 | M |
| 13 | Add/Edit Client modal component | Step 11 | S |
| 14 | Budget page: add "Income Coverage" card + smart insight | Steps 6, 9 | S |
| 15 | Transaction table: client badge + "Link to Client" action | Steps 6, 9 | S |

### Out of Scope (Future)
- Invoice generation / PDF export
- Automatic transaction matching (AI-powered pattern recognition)
- Multi-currency client payments (EUR-only for MVP)
- Tax estimation / quarterly tax projections
- Recurring invoice reminders / email notifications
- Client contact details (email, address) — not a CRM
- Integration with invoicing tools (Stripe, PayPal, etc.)
- Shared project income allocation

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users don't manually match transactions | Low confirmation rate, feature becomes decorative | Show prominent "X unmatched payments" banner; suggest likely matches based on amount proximity |
| Too many unmatched income transactions create noise | Overwhelmed UI | Default to showing only last 30 days; add "Hide small amounts" filter |
| Expected income changes mid-month | Stale expected_incomes rows | Allow editing expected amount on existing entries; track original vs revised in metadata |
| Client with irregular payment amounts | Fixed expected_amount doesn't match | Show "typical range" (min/max of last 6 months) instead of fixed expected; tolerance ±5% helps |
| Users with many clients (>20) | Slow page, cluttered UI | Paginate client list; show "Top 5" in summary, full list expandable |
| Freelancers paid in multiple currencies | EUR-only limitation | Document as known limitation; future PRD for multi-currency income |
