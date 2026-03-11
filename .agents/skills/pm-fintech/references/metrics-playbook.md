# Metrics Playbook: PMPVH Framework

Hybrid Value Predictive Metrics Stack (Pila de Metricas Predictivas de Valor Hibrido) for Finandance. Organized in three tiers from infrastructure signals to business outcomes.

---

## Why Standard Metrics Fail for Fintech Aggregators

Generic SaaS metrics (DAU, MAU, click-through rates) are designed for social apps and e-commerce. Finandance competes on **psychological trust**, **data veracity**, and **monetary precision**. Metrics must reflect:

- Code robustness and infrastructure reliability
- Long-term relational engagement profitability
- Mathematical integrity and latency of aggregation engines

**Key insight:** High acquisition with high churn destroys ROI. Churn caused by API failures or SCA friction has a domino effect on revenue predictability and CAC sustainability.

---

## Tier 1: Infrastructure Metrics (Leading Indicators)

These predict future churn before users complain. Monitor continuously.

### 1.1 API Sync Failure Rate

**Definition:** Percentage of account balance update requests (manual pull + webhook push) that exceed the configured timeout threshold OR return HTTP 4xx/5xx errors from the aggregator.

**Formula:**
```
Sync Failure Rate = (Failed sync requests / Total sync requests) * 100
```

**Segmentation:**
- By provider (BNP Paribas, Societe Generale, Credit Agricole, Kraken, etc.)
- By error type (timeout, 429 rate limit, 401 auth expired, 5xx server error)
- By time window (hourly, daily, rolling 7-day)

**Thresholds:**
| Status | Rate | Action |
|--------|------|--------|
| Healthy | < 2% | Normal operations |
| Warning | 2-5% | Investigate, prepare degradation banner |
| Critical | > 5% | Activate feature flag: disable manual sync for affected provider, deploy empathetic outage banner |

**Why it matters:** If a major French bank's STET endpoint fails, users blame Finandance. This metric is the earliest signal of incoming churn.

### 1.2 Data Sync Accuracy

**Definition:** Volume and frequency of severe numerical discrepancies detected by auditor algorithms comparing the bank-reported macro balance against the internal sum of individual transaction events within the evaluated time window.

**Formula:**
```
Accuracy = 1 - (Transactions with discrepancies / Total audited transactions)
```

**Alert triggers:**
- Any single-user discrepancy > 1 EUR equivalent
- Batch discrepancy pattern affecting > 0.1% of active users
- Discrepancy persisting > 24 hours after detection

**Resolution protocol:**
- High-confidence duplicates (ML certainty > 95%): auto-merge silently
- Low-confidence discrepancies: surface to user in manual conflict resolution UI with audit trail

---

## Tier 2: Friction Metrics (Mid-level / Monitoring Indicators)

These measure regulatory and UX friction that erodes retention. Review weekly.

### 2.1 SCA Drop-off Rate

**Definition:** Percentage of enrolled users who encounter an SCA re-authentication prompt (180-day PSD2/PSD3 renewal) and fail to complete it or abandon the flow.

**Formula:**
```
SCA Drop-off = (Users who saw SCA prompt - Users who completed re-auth) / Users who saw SCA prompt * 100
```

**Segmentation:**
- By bank (some banks have notoriously worse re-auth UX)
- By notification channel (in-app vs. email vs. push)
- By days-before-expiry when notification was sent

**Target:** < 20% drop-off rate

**Optimization levers:**
- Send first notification 5 days before expiry
- Frame as "security vault renewal" not "authentication error"
- Maintain read-only cached data access during re-auth window
- Track which bank-specific flows have highest friction and compensate with UX guidance

### 2.2 Time-to-First-Link (TTFL)

**Definition:** Net time from user registration completion to confirmed encrypted connection of their first fiat bank account OR first watch-only crypto wallet mapping.

**Formula:**
```
TTFL = Timestamp(first_successful_link) - Timestamp(registration_confirmed)
```

**Segmentation:**
- By source type (bank vs. exchange vs. cold wallet)
- By onboarding path (direct link vs. explored first)
- By user cohort (organic vs. referral vs. paid)

**Target:** Median < 10 minutes

**Why it matters:** Directly correlates with activation. Users who don't link a source within 24 hours have 4x higher churn probability.

---

## Tier 3: Value Metrics (Lagging / North Star Indicators)

These are the ultimate business health signals. Review monthly.

### 3.1 LTV / Net Returning Revenue

**Definition:** Empirical financial tracking of a customer account's long-term monetary impact, measuring effective uninterrupted retention cycles across all friction points.

**Components:**
```
LTV = ARPU * (1 / Churn Rate) * Gross Margin
```

**Segmentation:**
- By user type (individual vs. collaborative/multiplayer)
- By source diversity (1 source vs. 3+ sources connected)
- By premium tier

**Key insight:** Collaborative (multiplayer) users have significantly lower churn than solo users. Incentivize the transition from solo to shared financial management through organic product mechanics, not aggressive upselling.

### 3.2 Multiplayer Depth Index (MDI)

**Definition:** Average or median count of active shared projects AND total connected funding sources controlled by a single household unit at period end.

**Formula:**
```
MDI = (Active shared projects per household + Connected sources per household) / 2
```

**Segmentation:**
- By household size (couple vs. family vs. roommates)
- By project type (budget vs. goal vs. investment)
- By engagement frequency (daily active vs. weekly vs. monthly)

**Target:** MDI > 3.0 for retained households

**Why it matters:** The data unequivocally shows that when two financially interdependent users converge on the same platform to manage their shared finances, the monthly churn rate drops dramatically compared to solo users. MDI is the strongest predictor of long-term retention.

---

## Operational Playbook: Automated Response Triggers

### Silent Degradation Detection

When observability detects a marginal drop in sync success rate OR a statistically significant latency increase over a rolling window:

1. **Do NOT wait** for support tickets to pile up
2. Activate graceful degradation feature flag for affected provider
3. Replace manual sync button with empathetic outage banner (affected users only):
   > "Your bank [Name] is experiencing temporary connectivity issues beyond our control. Your last synced data is safe and available. We'll automatically refresh when the connection is restored."
4. Log incident for post-mortem and provider SLA review

### Churn Prevention Cascade

When a user's engagement pattern signals churn risk:

1. Check infrastructure metrics first (is their bank's sync broken?)
2. Check SCA status (is re-auth pending or recently failed?)
3. Check multiplayer status (solo user who could benefit from shared features?)
4. Trigger appropriate intervention (fix technical issue / guide re-auth / promote collaborative features)

---

## Anti-Metrics (What NOT to Optimize)

| Metric | Why It's Dangerous |
|--------|-------------------|
| Total registered accounts | Incentivizes growth hacking over retention |
| Gross deposit volume | Banking vanity metric, irrelevant for aggregators |
| DAU/MAU ratio alone | Financial apps have natural low-frequency usage patterns |
| Time-in-app | More time often means confusion, not engagement |
| Manual sync button clicks | High clicks = broken auto-sync, not engagement |
