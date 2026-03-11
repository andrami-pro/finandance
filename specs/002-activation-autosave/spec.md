# Feature Specification: Post-Creation Activation Flow + Auto-Save (DCA)

**Feature Branch**: `002-activation-autosave`
**Created**: 2026-03-03
**Status**: Complete (2026-03-03)
**Depends on**: `001-finandance-mvp` (Phase 4 / US2 — Shared Projects)

---

## 1. Executive Summary

We're building a **post-creation activation flow** for shared project users to solve the problem of zero engagement after project creation (users land on an empty detail page and don't know what to do next). The activation interstitial captures the highest-intent moment to guide users into immediately linking funding sources or setting up a recurring savings plan (Auto-Save / DCA), which will increase project funding activation rate and time-to-first-contribution.

---

## 2. Problem Statement

### Who has this problem?
Users who just completed the 4-step project creation wizard in Finandance.

### What is the problem?
After creating a shared project, users are redirected to an empty project detail page with no balance, no funding sources linked, and no clear next step. The "Strategy" step in the wizard (fiat vs crypto) signals intent but doesn't translate into action. Users must independently discover that they need to link funding sources from the detail page's Connected Sources section.

### Why is it painful?
- **User impact**: The highest-intent moment (just created a goal) is wasted. Users see a €0 balance and no progress, which is demotivating. They don't know what to do next.
- **Product impact**: Projects without funding sources are dead on arrival — they provide no value and will likely be abandoned.
- **Behavioral gap**: The wizard collects intent (name, target, members, strategy) but doesn't bridge to the first concrete action (linking money or setting a savings plan).

### Evidence
- **UX analysis**: The current wizard redirects to `/shared-projects/[id]` — a page designed to display data, not to guide initial setup.
- **Behavioral pattern**: Fintech onboarding research consistently shows that users who complete a "first deposit" or "first link" action within the first session have 3-5x higher retention (framework: FSM — Friction-Security Matrix, positive friction quadrant).
- **Prototype gap**: The original HTML prototypes included a funding source linking step (Step 3), which was later replaced with a lighter "Strategy" step. The linking action was deferred but never re-introduced.

---

## 3. Target Users & Personas

### Primary Persona: Project Creator (Alex)
- **Role**: User who just created a shared project
- **Context**: High intent — just defined a goal, set a target amount, invited collaborators
- **Need**: Clear next step to make the project feel "real" (link money, set a plan)
- **Behavior**: Will engage with a guided flow if presented immediately; will forget or abandon if redirected to an empty page

### Secondary Persona: Returning User
- **Role**: User who skipped the activation flow and returns to their project later
- **Context**: Lower intent — might need a nudge on the detail page
- **Need**: Discoverable entry point to set up funding/auto-save from the project detail page

---

## 4. Strategic Context

### Business Goals
- **Increase project activation rate**: % of created projects that have at least one funding source linked within 24 hours
- **Introduce recurring engagement**: Auto-Save plans create a reason for users to return regularly (check reminders, track progress)
- **Foundation for premium features**: DCA/Auto-Save infrastructure enables future paid features (automated transfers, advanced projections, rebalancing alerts)

### Why Now?
- US2 (Shared Projects) is complete — projects can be created but lack the "funding activation" step
- The wizard Step 3 redesign removed the funding source linking step — this feature fills that gap
- The projection/DCA concept differentiates Finandance from simple balance trackers

### Frameworks Applied
- **FSM (Friction-Security Matrix)**: The activation flow is "positive friction" — it adds a step but at the moment of highest intent, translating to higher activation
- **ASR (Async Sync Resilience)**: Auto-Save is MVP plan-only (no async transfers). Projection is fully client-side — no external API dependency
- **VAC (Volatility Abstraction)**: For crypto projects, DCA framing explains how regular contributions smooth out volatility

---

## 5. Solution Overview

### UX Flow

```
Wizard (4 steps) --> Create Project
  --> /shared-projects/[id]/get-started  (NEW interstitial)
      |
      +-- "Link Sources"   --> checkbox list of funding sources --> save --> detail page
      |
      +-- "Set Up Auto-Save" --> amount + frequency + source + projection chart --> save plan --> detail page
      |
      +-- "Explore First"  --> detail page directly (skip)
```

### Screen 1: Activation Interstitial (`/shared-projects/[id]/get-started`)

A full-page screen within the dashboard shell (sidebar visible) showing:
- Success message: "Your project [Name] is ready!"
- Three option cards:
  1. **Link Sources** — "Connect your accounts to start tracking progress"
  2. **Set Up Auto-Save** — "Plan recurring contributions toward your goal"
  3. **Explore First** — "Go to your project dashboard"

### Screen 2a: Link Sources Panel (inline expansion)

- Shows available funding sources with checkboxes (reuses existing pattern from detail page)
- Running total: "Initial tracked balance: €X,XXX"
- Save button links selected sources to the project and navigates to detail page

### Screen 2b: Auto-Save Configuration Panel (inline expansion)

1. **Explanation card**: "What is Auto-Save?" — brief, reassuring copy. For crypto projects (`funding_strategy === 'crypto'`): DCA framing explaining how regular purchases reduce volatility impact.

2. **Amount input**: Numeric input with currency symbol (inherits project's `target_currency`).

3. **Frequency selector**: Three pill buttons:
   - Weekly (fastest growth)
   - Every 2 weeks
   - Monthly (most popular — default)

4. **Source selector**: Dropdown of user's connected funding sources.

5. **Projection chart**: Real-time SVG line chart showing:
   - Current balance → target amount over time
   - Milestone markers at 25%, 50%, 75%, 100% with estimated dates
   - Horizontal dashed line at target amount
   - Summary text: "At [amount]/[frequency], you'll reach [target] by [estimated date]"

6. **Save Plan**: Persists the savings plan to DB. Navigates to detail page.

### Screen 3: Project Detail Page Addition

New "Savings Plan" section on the existing detail page:
- **If no active plan**: Muted card with "No savings plan configured" + "Set Up Auto-Save" link
- **If active plan**: Summary (amount/frequency/source), next reminder indicator (pulsing dot when due/overdue), estimated completion date, edit/pause/delete actions

### Reminder System (MVP: In-App Only)

- `next_reminder_at` calculated on plan creation and advanced by frequency interval
- Visual indicator on detail page:
  - **Overdue** (past due): red pulsing dot + "Reminder overdue"
  - **Due today**: primary color pulsing dot + "Due today"
  - **Upcoming** (within 7 days): subtle dot + "Next: [date]"
- No email notifications in MVP — future enhancement

---

## 6. Success Metrics

### Primary Metric
**Project Funding Activation Rate** — % of newly created projects that have at least one funding source linked OR an active Auto-Save plan within 24 hours of creation.
- **Current**: ~0% (no guided activation flow exists)
- **Target**: 60%+ within 30 days of launch
- **Timeline**: Measure 30 days after feature deployment

### Secondary Metrics
| Metric | Current | Target |
|--------|---------|--------|
| Auto-Save plan creation rate | N/A | 30% of project creators set up a plan |
| Time-to-first-link | Unknown (manual) | < 2 minutes from project creation |
| Activation path distribution | N/A | Link Sources: 40%, Auto-Save: 30%, Skip: 30% |
| Projection chart interaction rate | N/A | 70% of Auto-Save users adjust amount/frequency at least once |

### Guardrail Metrics
- **Project creation completion rate**: Must not decrease (activation flow should not discourage creation)
- **Wizard drop-off rate**: Must not increase (activation is post-creation, not blocking)

---

## 7. User Stories & Requirements

### Epic Hypothesis

We believe that adding a post-creation activation flow with funding source linking and Auto-Save plan setup for project creators will increase project funding activation rate from ~0% to 60%+ because users currently lack guidance on what to do after creating a project, and the highest-intent moment is being wasted on an empty detail page.

### User Story 6 — Post-Creation Activation Flow (Priority: P1)

**Description**: After creating a shared project, the user is guided through an activation interstitial that helps them immediately link funding sources or set up a recurring savings plan (Auto-Save / DCA). The system stores savings plan configurations and displays in-app reminders.

**Why this priority**: This directly addresses the gap between project creation and project engagement. Without it, projects are "dead on arrival" with no funding sources and no plan.

**Independent Test**: Create a project via wizard, verify redirect to get-started page, test all 3 paths (link sources, auto-save, skip), verify savings plan appears on detail page with reminder indicator.

**Acceptance Scenarios**:

1. **Given** a user who just completed the project creation wizard, **When** the project is created successfully, **Then** they are redirected to `/shared-projects/[id]/get-started` (not the detail page)
2. **Given** the activation page, **When** the user sees 3 option cards (Link Sources, Auto-Save, Explore First), **Then** each card shows a clear description and icon
3. **Given** the Link Sources panel, **When** the user selects funding sources via checkboxes, **Then** a running total of tracked balance updates in real-time and saving links them to the project
4. **Given** the Auto-Save panel, **When** the user enters amount, selects frequency, and picks a source, **Then** the projection chart updates in real-time showing estimated completion date and milestones
5. **Given** a crypto project (`funding_strategy === 'crypto'`), **When** the user opens Auto-Save, **Then** the explanation card uses DCA framing ("Dollar-Cost Averaging reduces volatility impact...")
6. **Given** a saved Auto-Save plan, **When** the user navigates to the project detail page, **Then** a "Savings Plan" section shows the plan summary with amount, frequency, source, and next reminder date
7. **Given** an active savings plan with `next_reminder_at` that is overdue, **When** the user views the project detail page, **Then** a red pulsing indicator shows "Reminder overdue"
8. **Given** a user who clicks "Explore First" on the activation page, **Then** they are navigated directly to `/shared-projects/[id]` with no data loss
9. **Given** a project with no active savings plan, **When** the user views the detail page, **Then** a muted card shows "No savings plan" with a link to set one up
10. **Given** a DCA plan without a frequency value, **Then** the system rejects it with a validation error (DB constraint: `plan_type = 'dca'` requires `frequency IS NOT NULL`)

---

## 8. Out of Scope

**Not included in this release:**

| Feature | Reason |
|---------|--------|
| Automatic fund transfers | Finandance is read-only (aggregation). Users transfer money externally; we track and remind. |
| Email/push notifications for reminders | MVP uses in-app indicators only. Email infrastructure is a separate initiative. |
| Advanced investment strategies (value averaging, rebalancing) | Simplify to DCA/lump-sum only for MVP. Future enhancement. |
| Multi-currency projection (crypto price forecasting) | Projections use fixed contribution amounts in project currency. No price prediction. |
| Goal milestones with rewards/gamification | Out of scope. The projection chart shows milestones but there's no gamification. |
| Editing the savings plan from the get-started page | Edit/pause/delete only from the detail page's Savings Plan section. Get-started is create-only. |

**Future consideration:**
- Automated transfers via Wise/Kraken APIs (requires write permissions — significant scope expansion)
- Email reminder system via Supabase Edge Functions or APScheduler
- Multiple savings plans per project per user
- Savings plan sharing (visible to project collaborators)

---

## 9. Dependencies & Risks

### Dependencies
- **Phase 4 (US2) complete**: Project creation wizard, detail page, and API must be working (DONE)
- **Funding sources API**: `GET /api/v1/funding-sources` endpoint must exist (DONE — T032)
- **No new external dependencies**: Projection chart is inline SVG, no charting library needed

### Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Users skip activation flow (>70% choose "Explore First") | Low activation | Medium | Track distribution; iterate on card copy/design. Consider A/B test with/without flow. |
| Projection chart feels "too simple" (linear growth, no compounding) | User confusion | Low | Frame as "savings plan" not "investment projection". Add disclaimer: "Projection based on fixed contributions." |
| DCA framing confuses non-crypto users | Drop-off | Low | Only show DCA copy for `funding_strategy === 'crypto'` projects. Fiat projects use "Auto-Save" framing. |
| Users create plans but never fund (plan ≠ action) | False engagement | Medium | The reminder indicator nudges action. Future: track "plan vs actual" contribution delta. |

---

## 10. Open Questions

- [ ] **Q1**: Should the get-started page be revisitable from the detail page, or is it a one-time interstitial? → **Decision**: Revisitable via "Set Up Auto-Save" link on detail page. URL always works.
- [ ] **Q2**: Should we track "plan vs actual" — i.e., compare the savings plan schedule against actual balance changes? → **Deferred**: Not in MVP. Would require correlating funding source balance deltas with plan schedule.
- [ ] **Q3**: Should savings plans be visible to project collaborators? → **Decision**: Yes, read-only. Project members can see each other's plans via RLS policy.
- [ ] **Q4**: Should the projection assume linear growth or compound (for yield-bearing accounts)? → **Decision**: Linear for MVP. Compounding is a future enhancement.
