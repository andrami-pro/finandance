# PRD: T056 Build Budget UI

## Status: DONE (2026-03-02) — hardcoded data, not yet wired to API

## Introduction
Create the budget page UI with charts and summary.

## Goals
- Display budget summary and charts.
- Show category breakdown.

## User Stories

### US-001: Budget page UI
**Description:** As a user, I want to see a budget summary so I can understand spending at a glance.

**Acceptance Criteria:**
- [x] `frontend/src/app/(dashboard)/budget/page.tsx` exists.
- [x] Page shows summary metrics and charts.
- [x] Category breakdown is visible.

## Implementation Details

### File
`frontend/src/app/(dashboard)/budget/page.tsx` — Server component (no API calls yet, hardcoded data matching `contexto/prototipos-html/budget.html`).

### Sections
1. **Header**: Title "Budget & Spending" + period toggle pills (Monthly / Quarterly / Yearly)
2. **Summary cards** (3-col grid):
   - Monthly Budget (€4,500) with trend indicator
   - Actual Spending (€3,120.50) with progress bar (69% used)
   - Savings Rate (31%) with mini bar chart
3. **Budget vs Actual** (2/3 width): SVG area chart with planned (dashed) vs actual (emerald) lines, week labels
4. **Zero-Based Budget** (1/3 width): Conic gradient donut chart, category legend (Housing, Food, Savings, Lifestyle)
5. **Smart Insights**: Weekend spending alert, coffee habit insight cards
6. **Upcoming Bills**: Spotify, Electricity, Internet with due dates and amounts

### Style Compliance
- SSR Phosphor icons from `@phosphor-icons/react/dist/ssr`
- Semantic tokens only (no hardcoded Tailwind palette)
- `rounded-md` and `shadow-sm` throughout
- `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `text-primary`

### Remaining Work
- Wire to real API when `backend/app/api/v1/budget.py` (T054) is implemented
- Replace hardcoded data with `useBudget` hook (T058)

## Non-Goals
- No advanced filtering beyond spec.

## Success Metrics
- Page renders within performance expectations.
