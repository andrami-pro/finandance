# Data Architecture Patterns: ETOU Framework

Single-Origin Transaction Structure (Estructura Transaccional de Origen Unico) implementation patterns for Finandance. These are non-negotiable rules for any feature that touches monetary data.

---

## Pillar 1: Minor Units as Inviolable Standard

### Rule
ALL monetary values entering Finandance are processed and stored as integers (BIGINT) representing the smallest fractional unit of the currency.

### Implementation

```
10.50 EUR -> stored as 1050 (integer) + "EUR" (ISO 4217)
0.00500000 BTC -> stored as 500000 (integer in satoshis) + "BTC"
100 JPY -> stored as 100 (integer, JPY has no subunit) + "JPY"
```

### Schema Pattern

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_minor BIGINT NOT NULL,          -- Value in minor units
  currency_code VARCHAR(3) NOT NULL,     -- ISO 4217: "EUR", "USD", "BTC"
  -- NEVER: amount FLOAT/DOUBLE/DECIMAL
);
```

### Why Not DECIMAL/NUMERIC?
While DECIMAL avoids floating-point errors, integer minor units are:
- Faster for arithmetic operations
- Impossible to accidentally introduce decimal precision bugs
- Standard across payment processors (Stripe, Wise, banking APIs all use minor units)
- Simpler to serialize/deserialize across API boundaries

### Display Conversion
Conversion to display format happens ONLY at the presentation layer (frontend), never stored:
```typescript
// Frontend only
const displayAmount = (amountMinor: number, currency: string) => {
  const decimals = currency === 'JPY' ? 0 : currency === 'BTC' ? 8 : 2;
  return (amountMinor / Math.pow(10, decimals)).toFixed(decimals);
};
```

---

## Pillar 2: Immutable Raw Payload Preservation (Event Sourcing)

### Rule
Preserve the original raw transaction payload from every source (bank aggregator, blockchain indexer, exchange API) in a separate table from the processed/displayed data.

### Architecture

```
┌─────────────────────┐     ┌──────────────────────┐
│  raw_transactions    │     │  transactions         │
│  (immutable log)     │────>│  (processed display)  │
│                      │     │                       │
│  - source_payload    │     │  - amount_minor       │
│  - source_provider   │     │  - currency_code      │
│  - received_at (UTC) │     │  - category           │
│  - idempotency_key   │     │  - display_name       │
│  - processing_status │     │  - state (enum)       │
└─────────────────────┘     └──────────────────────┘
```

### Why
- If an AI categorization algorithm makes a mass classification error, you can reprocess from raw data
- Regulatory audit trail: raw bank payloads prove data provenance
- Debugging: compare what the bank sent vs. what the system interpreted
- Bulk rollback capability without data loss

---

## Pillar 3: Transaction State Machine

### States

```
INITIATED -> PROCESSING -> PENDING -> SUCCESSFUL -> FAILED
                                  \-> REVERSED
```

### Critical Dedup Logic

The most common data integrity failure in PFM platforms:

1. Bank sends transaction in "PENDING" state (authorization hold)
2. Hours/days later, same transaction arrives as "CLEARED/SUCCESSFUL"
3. Naive systems create TWO records, doubling the expense

**Solution:** Every incoming transaction is matched against existing records using:
- Bank's original transaction ID (primary match)
- Amount + merchant + date within tolerance window (fuzzy fallback)
- State transitions update the existing record, never create duplicates

```sql
-- Idempotent upsert pattern
INSERT INTO transactions (idempotency_key, amount_minor, state, ...)
VALUES ($1, $2, $3, ...)
ON CONFLICT (idempotency_key)
DO UPDATE SET
  state = EXCLUDED.state,
  updated_at = NOW()
WHERE transactions.state != 'SUCCESSFUL';  -- Don't regress settled transactions
```

### UI Treatment by State

| State | Visual Treatment | User Action |
|-------|-----------------|-------------|
| PENDING | Greyed out, italic, "(pending)" label | View only |
| SUCCESSFUL | Full opacity, normal styling | Categorize, split, comment |
| FAILED | Red accent, strikethrough | Dismiss or report |
| REVERSED | Strikethrough with reversal note | View only |

---

## Pillar 4: Idempotency Keys

### Rule
Every write operation is protected by a deterministic idempotency key derived from the source's original identifier.

### Key Generation

```python
# Deterministic: same input always produces same key
def generate_idempotency_key(
    provider: str,           # "wise", "kraken", "bnp_paribas"
    source_transaction_id: str,  # Bank's original ID
    event_type: str          # "transaction", "balance_update"
) -> str:
    raw = f"{provider}:{source_transaction_id}:{event_type}"
    return hashlib.sha256(raw.encode()).hexdigest()
```

### Protection Pattern

```python
async def process_webhook(payload: dict):
    key = generate_idempotency_key(
        provider=payload["provider"],
        source_id=payload["transaction_id"],
        event_type="transaction"
    )

    # Check if already processed
    existing = await db.get_by_idempotency_key(key)
    if existing:
        # Already processed - safe to ignore (network retry, duplicate webhook)
        return existing

    # Process within atomic transaction
    async with db.transaction():
        result = await db.insert_transaction(key, payload)
        return result
```

### Scenarios Protected

| Scenario | Without Idempotency | With Idempotency |
|----------|-------------------|------------------|
| Webhook delivered twice (network glitch) | Duplicate transaction created | Second delivery safely ignored |
| Cron job overlaps with webhook | Same data imported twice | Conflict detected, single record maintained |
| User triggers manual sync during auto-sync | Race condition, potential duplicates | Deterministic key prevents double-write |

---

## Pillar 5: Timezone Dimensional Mapping

### Rule
Store the raw UTC timestamp AND the IANA timezone identifier as separate fields. NEVER store bare UTC offsets.

### Why Not Offsets?

```
# Paris in winter: UTC+1
# Paris in summer: UTC+2 (DST)

# If you store offset "+01:00", you lose DST awareness
# Transaction on March 30 at 01:30 local time becomes ambiguous during spring-forward
```

### Schema Pattern

```sql
CREATE TABLE transactions (
  -- ...
  executed_at TIMESTAMPTZ NOT NULL,        -- Raw UTC from source
  user_timezone VARCHAR(50) NOT NULL,      -- IANA: "Europe/Paris"
  -- NEVER: timezone_offset VARCHAR(6)     -- "+01:00" breaks on DST
);
```

### Display Logic

```typescript
// Always convert at display time using IANA zone
import { formatInTimeZone } from 'date-fns-tz';

const displayDate = formatInTimeZone(
  transaction.executed_at,    // UTC timestamp
  transaction.user_timezone,  // "Europe/Paris"
  'dd MMM yyyy HH:mm'
);
```

### Budget Cycle Alignment
Monthly budget boundaries (e.g., "March 2026") must be calculated using the user's IANA timezone, not UTC. A transaction at 23:30 Paris time on March 31 is March in the user's budget, even though it's April 1 in UTC.

---

## FX Rate Architecture

### Caching Strategy

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  FX Provider │────>│  FX Cache    │────>│  Portfolio   │
│  API (hourly)│     │  (backend)   │     │  Calculator  │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────┴──────┐
                     │  Historical │
                     │  FX Rates   │
                     │  (immutable)│
                     └─────────────┘
```

### Two FX Contexts

| Context | Rate Source | Mutability |
|---------|-----------|------------|
| **Transaction-time rate** | Locked at execution moment | Immutable (audit trail) |
| **Portfolio valuation rate** | Latest cached rate (hourly refresh) | Updated periodically |

### Weekend Gap Policy

| Asset Type | Saturday-Sunday Behavior |
|-----------|------------------------|
| Fiat (EUR, USD, CHF) | Frozen at Friday 17:00 EST market close rate |
| Crypto (BTC, ETH) | Live via real-time oracle (24/7 markets) |
| Hybrid portfolio total | Calculated using respective rates per asset type |

### Daily Mark-to-Market
- Cutoff: **00:00 UTC daily**
- Creates a static portfolio snapshot for reporting
- Prevents illusory wealth jumps in weekend/holiday periods
- Documented in terms of service
