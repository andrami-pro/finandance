# PRD: T057 Build Transactions Table UI

## Status: DONE (2026-03-02) — wired to real API data

## Introduction
Create the transactions list page with pagination, date period filtering, and transaction detail panel.

## Goals
- Display transactions in a paginated table with real API data.
- Support period-based date filtering (This Month, Last Month, Quarter, Last Year, Custom).
- Provide transaction detail side panel.

## User Stories

### US-001: Transactions list UI
**Description:** As a user, I want to view a paginated, filterable list of transactions so I can review activity by period.

**Acceptance Criteria:**
- [x] `frontend/src/app/(dashboard)/transactions/page.tsx` exists.
- [x] Table lists transactions with key fields.
- [x] Pagination controls are present.
- [x] Period filter pills (This Month / Last Month / Quarter / Last Year / Custom).
- [x] Custom date range picker with inline date inputs.
- [x] Summary cards reflect the selected period.

## Implementation Details

### File
`frontend/src/app/(dashboard)/transactions/page.tsx` — Client component using `useAuth` + `api.get()`.

### Features
1. **Period filter pills**: 5 pill buttons following budget page pattern (active = `bg-foreground text-background`). Custom mode shows two inline `<input type="date">` pickers with CalendarBlank icons.
2. **Summary cards** (3-col grid): Total Inflows (green), Total Outflows, Net Cashflow — all scoped to selected period via `since`/`until` API params.
3. **Transactions table**: Date, Description (with provider icon), Category (badge), Source Account, Amount (green for income).
4. **Provider icons**: Wise (`bg-[#9fe870]`), Kraken (`bg-[#5741d9]`), Ledger (`bg-[#1c1c1c]`) — letter badges.
5. **Pagination**: Page numbers with smart window (shows 5 pages around current), Previous/Next buttons.
6. **Detail panel**: Slide-in side panel with backdrop blur, shows amount, date, status, source, category selector, split expense toggle, notes textarea.
7. **Empty state**: Context-aware message adapts to period ("No transactions for Mar 2026" vs "Try adjusting the dates").
8. **Loading / error states**: Skeleton text while loading, error with retry button.

### Data Fetching Pattern
```typescript
const params = new URLSearchParams();
params.set('page', String(page));
params.set('limit', String(LIMIT));
if (dateRange?.since) params.set('since', dateRange.since);
if (dateRange?.until) params.set('until', dateRange.until);
const res = await api.get<TransactionsResponse>(`/api/v1/transactions?${params}`);
```

### Period → Date Range Mapping
| Period | `since` | `until` |
|--------|---------|---------|
| This Month | 1st of current month | Last day of current month |
| Last Month | 1st of previous month | Last day of previous month |
| Quarter | 1st of current quarter | Last day of current quarter |
| Last Year | Jan 1 of previous year | Dec 31 of previous year |
| Custom | User-selected start date | User-selected end date |

### Style Compliance
- Client-side Phosphor icons from `@phosphor-icons/react`
- Semantic tokens only (no hardcoded Tailwind palette, except brand colors)
- `rounded-md` and `shadow-sm` throughout
- Period pills match budget page pattern

### Remaining Work
- Extract `useTransactions` hook (T058) if needed for reuse
- Search/filter input not yet wired (placeholder only)
- Export CSV button not yet functional

## Non-Goals
- No split UI (handled in US4 — T063).

## Success Metrics
- Transactions list is usable and responsive.
- Period filter correctly scopes data and summary.
