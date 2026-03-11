# PRD: T047 Build Project Detail View UI

## Status: DONE (2026-03-04)

## Implementation Notes

**File**: `frontend/src/app/(dashboard)/shared-projects/[id]/page.tsx`

Sections (based on goal-details.png mockup):
- **Breadcrumb**: Dashboard > Shared Projects > Project Name
- **Page header**: Back arrow + title + Edit/Save/Cancel/Delete buttons (owner only)
- **Stats row**: Total Project Balance, Progress to Goal, Target Amount (3 cards)
- **Progress bar**: visual bar with saved/goal labels
- **General Info**: category icon + name + target + date + currency (view mode + inline edit mode)
- **Asset Allocation**: SVG donut chart by provider with legend — **uses `balanceInBaseCurrency` for correct EUR proportions across mixed currencies**
- **Connected Funding Sources**: table with provider logo, asset type, currency, balance, toggle checkbox
- **Members**: list with role badges + email invite form at bottom
- **Delete Project**: AlertDialog confirmation (shadcn `alert-dialog` component)

**Dependencies**:
- `useProjectDetail(id)` — fetch project (includes `current_amount` with EUR-converted balance)
- `useUpdateProject(id)` — save changes (PUT)
- `useDeleteProject(id)` — delete with confirmation (DELETE)
- `useFundingSources()` — all available sources for toggle UI (includes `balanceInBaseCurrency`)

**State management**: Local state for edit mode (draft), linked source IDs (Set), dirty tracking. Save button appears only when changes detected.

### Project Card context menu (2026-03-11)
`frontend/src/app/(dashboard)/shared-projects/page.tsx` — Added a 3-dot dropdown menu (⋯) to each `ProjectCard` with three actions:
- **Edit Project** — navigates to the project detail page (`/shared-projects/[id]`)
- **Copy Share Link** — copies the project URL to clipboard (shows "Link Copied!" feedback for 2s via `navigator.clipboard`)
- **Delete Project** — opens an `AlertDialog` confirmation dialog, then calls `useDeleteProject(id)` which invalidates the project cache

**Component changes**:
- Card converted from `<Link>` to clickable `<div>` (with `role="button"` + keyboard support) so the dropdown doesn't trigger navigation
- Uses `e.stopPropagation()` on menu trigger and content to isolate dropdown clicks from card navigation
- New shadcn component: `frontend/src/components/ui/dropdown-menu.tsx` (Radix `@radix-ui/react-dropdown-menu`, icons swapped from lucide to Phosphor)
- Phosphor icons used: `DotsThree`, `PencilSimple`, `LinkSimple`, `Check`, `Trash`

### Asset Allocation fix (2026-03-04)
`AssetAllocationSection` now uses `balanceInBaseCurrency ?? currentBalance` for both total and per-provider calculations. Previously used raw `currentBalance` which mixed EUR and BTC amounts.

## Acceptance Criteria
- [x] Page renders at `/shared-projects/[id]`.
- [x] All sections from mockup implemented.
- [x] Edit mode for project info (owner only).
- [x] Funding source toggle (link/unlink).
- [x] Delete with AlertDialog confirmation.
- [x] Invite member via email.
- [x] Type check passes.
- [x] Total Project Balance includes all currencies converted to EUR.
- [x] Asset Allocation donut uses EUR-converted balances for correct proportions.
- [x] Project cards in list view have context menu with Edit, Copy Share Link, and Delete actions.
- [x] Delete from card shows confirmation dialog and removes project from list.
