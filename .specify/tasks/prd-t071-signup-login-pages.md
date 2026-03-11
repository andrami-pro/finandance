# PRD: T071 Build Signup/Login Pages

> **Post-completion update (2026-03-02) -- Design Token Cleanup:**
> Login and signup pages were updated as part of a project-wide design token cleanup:
> 1. ~180 hardcoded Tailwind color classes (e.g. `bg-emerald-600`, `text-slate-500`) replaced with semantic token classes (e.g. `bg-primary`, `text-muted-foreground`) across both pages.
> 2. All `font-lato`/`font-lora` references replaced with `font-sans`/`font-serif`.
> Pages now derive all colors from CSS custom properties defined in `globals.css`, making them automatically consistent with the design token system.

## Introduction
Create UI pages for signup and login.

## Goals
- Provide signup and login screens.

## User Stories

### US-001: Auth pages UI
**Description:** As a user, I want signup and login pages so I can access the app.

**Acceptance Criteria:**
- [ ] `frontend/app/(auth)/signup/page.tsx` exists.
- [ ] `frontend/app/(auth)/login/page.tsx` exists.
- [ ] Forms validate input.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements
- FR-1: Implement signup form UI.
- FR-2: Implement login form UI.

## Non-Goals
- No full auth wiring in this task.

## Success Metrics
- Pages render and validate input.

## Assumptions
- UI component library exists.
