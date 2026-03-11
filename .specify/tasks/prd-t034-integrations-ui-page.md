# PRD: T034 Build Integrations UI Page

> **Post-completion update (2026-03-02) -- Design Token Cleanup:**
> The integrations page was updated as part of a project-wide design token cleanup:
> 1. Hardcoded Tailwind color classes replaced with semantic token classes across the page and provider cards.
> 2. Provider logo background colors now use chart tokens (`bg-chart-1`, `bg-chart-3`, `bg-chart-5`) instead of hardcoded palette values.
> 3. Status badges use semantic tokens (e.g. `text-destructive`, `bg-muted`) instead of direct color classes.
> 4. All `font-lato`/`font-lora` replaced with `font-sans`/`font-serif`.

## Introduction
Create the integrations page with provider cards.

## Goals
- Display available providers.
- Provide a starting point for connect flow.

## User Stories

### US-001: Integrations page UI
**Description:** As a user, I want to see available integrations so I can start connecting accounts.

**Acceptance Criteria:**
- [ ] `frontend/app/(dashboard)/integrations/page.tsx` exists.
- [ ] Provider cards are displayed for Wise, Kraken, and Ledger.
- [ ] Page uses shared layout and styles.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements
- FR-1: Render provider cards.
- FR-2: Provide connect action entry point.

## Non-Goals
- No actual connect logic (handled in modal/flow tasks).

## Success Metrics
- Integrations page renders consistently.

## Assumptions
- Dashboard layout exists.
