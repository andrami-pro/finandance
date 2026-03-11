---
description: "Task list for Post-Creation Activation Flow + Auto-Save (DCA)"
---

# Tasks: Activation Flow + Auto-Save (DCA)

**Input**: Design documents from `/specs/002-activation-autosave/`
**Prerequisites**: spec.md (required), data-model.md (required), contracts/api-contracts.md (required)
**Depends on**: `001-finandance-mvp` Phase 4 (US2) must be complete (DONE)

**Tests**: Integration tests for funding plan API + frontend flow tests for activation page.

**Organization**: Tasks are dependency-ordered across 5 phases (DB → Backend → Frontend Types/Hooks → UI Components → Wiring).

## Format: `[ID] [P?] [US6] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[US6]**: All tasks belong to User Story 6 (Activation Flow + Auto-Save)
- **Include exact file paths in descriptions**

---

## Phase A: Database Migration

**Purpose**: New `funding_plans` table with RLS policies

- [x] T081 [US6] Create `funding_plans` table migration with constraints, indexes, RLS policies, and updated_at trigger in `supabase/migrations/007_funding_plans.sql`
  - Table: `funding_plans` per `data-model.md`
  - Constraints: `amount > 0`, `chk_dca_has_frequency`, plan_type/frequency CHECK enums
  - Indexes: `idx_funding_plans_project`, `idx_funding_plans_user`, `idx_funding_plans_next_reminder` (filtered)
  - RLS: 5 policies (select_own, select_project_member, insert_own, update_own, delete_own)
  - Trigger: `update_funding_plans_updated_at` using existing `update_updated_at_column()` function

**Checkpoint**: Migration applies cleanly. `funding_plans` table exists with RLS enabled.

---

## Phase B: Backend (Models, Service, Endpoints)

**Purpose**: CRUD API for funding plans

- [x] T082 [P] [US6] Implement FundingPlan Pydantic models in `backend/app/models/funding_plans.py`
  - Enums: `PlanType` (dca, lump_sum), `PlanFrequency` (weekly, biweekly, monthly)
  - Request: `FundingPlanCreate`, `FundingPlanUpdate`
  - Response: `FundingPlanResponse`
  - Follow conventions from `backend/app/models/projects.py`

- [x] T083 [P] [US6] Implement funding plan service in `backend/app/services/funding_plan_service.py`
  - Functions: `create_funding_plan()`, `get_funding_plans_for_project()`, `get_funding_plan()`, `update_funding_plan()`, `delete_funding_plan()`
  - Helper: `compute_next_reminder(frequency, from_date)` — weekly +7d, biweekly +14d, monthly +1 calendar month
  - On create: set `next_reminder_at` to first interval from now
  - On update (resume or frequency change): recalculate `next_reminder_at` from now
  - Audit log entries: `FUNDING_PLAN_CREATED`, `FUNDING_PLAN_UPDATED`, `FUNDING_PLAN_DELETED`
  - Follow conventions from `backend/app/services/project_service.py`

- [x] T084 [US6] Implement funding plan API endpoints in `backend/app/api/v1/funding_plans.py`
  - 5 endpoints per `contracts/api-contracts.md`:
    - `POST /api/v1/funding-plans` (201)
    - `GET /api/v1/funding-plans?project_id=X` (200, items + count)
    - `GET /api/v1/funding-plans/{id}` (200)
    - `PUT /api/v1/funding-plans/{id}` (200)
    - `DELETE /api/v1/funding-plans/{id}` (204)
  - Auth: all require JWT. Verify caller is project member for create/list. Verify plan ownership for update/delete.
  - Register router in `backend/app/main.py`
  - Follow conventions from `backend/app/api/v1/projects.py`

- [x] T085 [US6] Extend ProjectResponse to include funding plans
  - Modify `backend/app/models/projects.py`: add `funding_plans: list[FundingPlanResponse]` to `ProjectResponse`
  - Modify `backend/app/services/project_service.py`: in `get_project()`, fetch funding plans for the project and include in response

**Checkpoint**: All 5 funding-plans endpoints work. `GET /api/v1/projects/{id}` includes `funding_plans` array. Verify at `/docs`.

---

## Phase C: Frontend Types + Hooks + Utilities

**Purpose**: TypeScript types, React hooks, and projection calculator

- [x] T086 [P] [US6] Add funding plan TypeScript types in `frontend/src/types/projects.ts`
  - Types: `PlanType = 'dca' | 'lump_sum'`, `PlanFrequency = 'weekly' | 'biweekly' | 'monthly'`
  - Interface: `FundingPlanResponse` (id, project_id, user_id, funding_source_id, plan_type, amount, currency, frequency, next_reminder_at, is_active, created_at, updated_at)
  - Update `ProjectResponse`: add `funding_plans: FundingPlanResponse[]`

- [x] T087 [P] [US6] Create funding plan React hooks in `frontend/src/hooks/useFundingPlans.ts`
  - `useFundingPlans(projectId)`: list plans for project (stale-while-revalidate pattern from `useProjects.ts`)
  - `useCreateFundingPlan()`: POST + invalidate cache
  - `useUpdateFundingPlan()`: PUT + invalidate cache
  - `useDeleteFundingPlan()`: DELETE + invalidate cache
  - All auth-aware (wait for session before fetching)

- [x] T088 [P] [US6] Create projection calculator utility in `frontend/src/lib/projections.ts`
  - Pure function `calculateProjection(input)` — no API calls
  - Input: `{ currentBalance, targetAmount, contributionAmount, frequency, startDate? }`
  - Output: `{ estimatedCompletionDate, monthsToGoal, milestones[], dataPoints[] }`
  - Logic:
    - Normalize frequency to monthly rate (weekly * 4.333, biweekly * 2.167, monthly * 1)
    - `monthsToGoal = ceil((target - current) / monthlyRate)`
    - Milestones at 25%, 50%, 75%, 100% with dates
    - Data points: one per month, capped at 120 months
  - Edge cases: goal already reached, zero amount, target < current

**Checkpoint**: Types compile (`npx tsc --noEmit`). Hooks ready. Projection function handles all edge cases.

---

## Phase D: Frontend UI Components

**Purpose**: Activation page and all sub-components

- [x] T089 [US6] Build activation interstitial page in `frontend/src/app/(dashboard)/shared-projects/[id]/get-started/page.tsx`
  - Client component using `useProjectDetail(id)` + `useFundingSources()`
  - State: `activePanel: 'none' | 'link-sources' | 'auto-save'`
  - Default view: success header + 3 option cards in responsive grid
  - Cards: Link Sources (Link icon), Auto-Save (Timer icon), Explore First (ArrowRight icon)
  - Selecting a card renders corresponding panel inline (replaces cards)
  - "Explore First" navigates to `/shared-projects/[id]`
  - Style: `bg-card rounded-md shadow-sm`, Phosphor SSR icons, semantic tokens only
  - Back button in panels to return to card view

- [x] T090 [P] [US6] Build LinkSourcesPanel component in `frontend/src/components/projects/activation/LinkSourcesPanel.tsx`
  - Reuse checkbox toggle pattern from project detail page Connected Sources section
  - Show available funding sources with checkboxes, provider brand colors, and balance
  - Running total: "Initial tracked balance: [sum of selected]"
  - Save button: calls `useUpdateProject` with `funding_source_ids` array, navigates to detail page
  - "Back" button to return to card view

- [x] T091 [US6] Build AutoSavePanel component in `frontend/src/components/projects/activation/AutoSavePanel.tsx`
  - Section 1: Explanation card — "What is Auto-Save?" (for `funding_strategy === 'crypto'`: DCA framing)
  - Section 2: Amount input — numeric with currency symbol prefix (project's target_currency)
  - Section 3: Frequency pills — `weekly | biweekly | monthly` as selectable pill buttons (default: monthly)
  - Section 4: Source selector — dropdown/list of user's connected funding sources
  - Section 5: Projection chart — uses `ProjectionChart` component with real-time updates via `calculateProjection()`
  - Section 6: Summary text — "At [amount]/[frequency], you'll reach [target] by [date]"
  - Save button: calls `useCreateFundingPlan()`, navigates to detail page
  - All inputs update projection in real-time (no debounce needed — pure client-side calc)

- [x] T092 [P] [US6] Build ProjectionChart SVG component in `frontend/src/components/projects/activation/ProjectionChart.tsx`
  - Props: `dataPoints[], targetAmount, currency, milestones[]`
  - SVG viewBox responsive via container width
  - Single `<polyline>` for projected balance line (stroke: `var(--primary)`)
  - Horizontal dashed line at target amount (stroke: `var(--muted-foreground)`)
  - Milestone dots at 25/50/75/100% with small date labels
  - Axes labels: months on X, amounts on Y
  - All colors via CSS custom properties — no hardcoded Tailwind
  - Accessible: `<title>` and `<desc>` on SVG element

- [x] T093 [US6] Build SavingsPlanSection for project detail page in `frontend/src/components/projects/SavingsPlanSection.tsx`
  - If no active plan: muted card with "No savings plan configured" + "Set Up Auto-Save" link to `/shared-projects/[id]/get-started`
  - If active plan:
    - Summary: amount/frequency/source name
    - Next reminder indicator (pulsing dot: overdue=destructive, due=primary, upcoming=muted)
    - Estimated completion date (calculated via `calculateProjection()`)
    - Actions: Edit plan (modal or inline), Pause/Resume toggle, Delete (with confirmation)
  - Reminder status logic:
    - overdue: `next_reminder_at < now`
    - due: `next_reminder_at` within 24 hours
    - upcoming: within 7 days
    - none: > 7 days away

**Checkpoint**: All components render correctly. Activation page shows 3 paths. Auto-Save panel updates projection in real-time.

---

## Phase E: Wiring + Integration

**Purpose**: Connect activation flow to existing wizard and detail page

- [x] T094 [US6] Change wizard redirect to activation page
  - Modify `frontend/src/components/projects/CreateProjectWizardShell.tsx` line 17:
    - Change `router.push(\`/shared-projects/${project.id}\`)` to `router.push(\`/shared-projects/${project.id}/get-started\`)`
  - Single line change — this activates the entire flow

- [x] T095 [US6] Add SavingsPlanSection to project detail page
  - Modify `frontend/src/app/(dashboard)/shared-projects/[id]/page.tsx`
  - Import and render `SavingsPlanSection` between the progress section and the two-column layout
  - Pass project data and funding plans

- [x] T096 [US6] Verify end-to-end flow and type check
  - Create project via wizard → verify redirect to `/get-started`
  - Test all 3 paths: Link Sources, Auto-Save, Explore First
  - Verify savings plan appears on detail page with correct reminder indicator
  - Run `npx tsc --noEmit` — must pass
  - Run `npm run lint` — must pass

**Checkpoint**: Full feature functional end-to-end.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase A (DB)
  └─► Phase B (Backend) — needs table to exist
       └─► Phase C (Types + Hooks + Utils) — needs API contract
            └─► Phase D (UI Components) — needs hooks + projection util
                 └─► Phase E (Wiring) — needs all components ready
```

### Parallel Opportunities

- **Phase B**: T082 and T083 can run in parallel (models + service). T084 depends on both. T085 depends on T082.
- **Phase C**: T086, T087, T088 can ALL run in parallel (types, hooks, projections are independent files)
- **Phase D**: T090 and T092 can run in parallel (LinkSourcesPanel + ProjectionChart). T091 depends on T092 (uses ProjectionChart). T093 can run in parallel with T089-T091 (separate component).

### Within Each Phase

- Models/types before services/hooks
- Services before endpoints
- Endpoints before UI that calls them
- All components before wiring (Phase E)

---

## Task Summary

| Phase | Tasks | New Files | Modified Files |
|-------|-------|-----------|----------------|
| A: Database | T081 | 1 | 0 |
| B: Backend | T082–T085 | 3 | 3 |
| C: Frontend Types/Hooks | T086–T088 | 2 | 1 |
| D: Frontend UI | T089–T093 | 5 | 0 |
| E: Wiring | T094–T096 | 0 | 2 |
| **Total** | **16 tasks** | **11 new** | **6 modified** |
