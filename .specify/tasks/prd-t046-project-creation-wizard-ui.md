# PRD: T046 Build Project Creation Wizard UI

## Status: DONE (2026-03-03)

## Implementation Notes

4-step wizard in a shadcn Dialog, managed via useReducer.

**Files**:
- `frontend/src/components/projects/CreateProjectWizard.tsx` — main container (Dialog, stepper, navigation, submit)
- `frontend/src/components/projects/WizardStepper.tsx` — horizontal step indicator with 3 states
- `frontend/src/components/projects/steps/StepDetails.tsx` — Step 1: project name, currency selector (EUR/USD/BTC), target amount, target date, category grid
- `frontend/src/components/projects/steps/StepMembers.tsx` — Step 2: email invite + member list
- `frontend/src/components/projects/steps/StepStrategy.tsx` — Step 3: two selectable cards (Fiat Strategy / Crypto Strategy) with check indicator. Replaces original `StepFunding.tsx` which linked funding sources.
- `frontend/src/components/projects/steps/StepReview.tsx` — Step 4: summary of all selections including chosen strategy label + description
- `frontend/src/components/projects/CreateProjectWizardShell.tsx` — client wrapper reading context; `onSuccess` navigates to new project detail page via `router.push`
- `frontend/src/contexts/ProjectWizardContext.tsx` — open/close wizard state

**Key decisions**:
- Step 3 was redesigned from "Funding Sources" (link existing sources) to "Funding Strategy" (choose Fiat or Crypto). This removes the dependency on pre-existing funding sources at creation time and simplifies the UX.
- The wizard no longer fetches or stores `selectedFundingSourceIds`. Instead it holds `fundingStrategy: FundingStrategy | null` (`'fiat' | 'crypto'`).
- Submit payload sends `funding_strategy` field instead of `funding_source_ids`.
- Step label in stepper changed from "Funding" to "Strategy".
- `CreateProjectWizardShell.tsx` was updated to fix a double-close bug (previously called both `onSuccess` and `handleClose`) and to navigate to the new project detail page on success.
- Currency selector added to Step 1 (EUR, USD, BTC with Phosphor currency icons).
- Wizard submits to `POST /api/v1/projects` via `useCreateProject()` hook.
- **BTC → EUR inline conversion hint** added below target amount input when BTC is selected. Uses CoinGecko free API (`useBtcPrice` hook) to fetch real-time BTC price, auto-refreshes every 60s. Shows `≈ €XX.XXX,XX @ €YY.YYY/BTC`. Graceful degradation: if API fails, hint is simply not rendered.
  - New hook: `frontend/src/hooks/useBtcPrice.ts`

## Acceptance Criteria
- [x] 4-step wizard with navigation and validation.
- [x] Currency selector in Step 1 (EUR/USD/BTC).
- [x] Step 3 presents Fiat Strategy / Crypto Strategy selectable cards.
- [x] Submit wired to backend API with `funding_strategy` payload field.
- [x] On success: wizard closes and navigates to new project detail page.
- [x] Type check passes.
- [x] When BTC selected, real-time EUR equivalent shown below target amount (CoinGecko API).
