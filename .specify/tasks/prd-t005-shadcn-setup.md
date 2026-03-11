# PRD: T005 Add shadcn/ui Setup and UI Registry

> **Post-completion update (2026-03-02) -- Design Token Cleanup:**
> The shadcn/ui theme layer was updated as part of a project-wide design token cleanup:
> 1. `globals.css` CSS variables that shadcn components consume now use OKLCH values from `design-tokens-nova.json` (replacing buggy manual HSL conversions).
> 2. `tailwind.config.ts` color wrapper switched from `hsl()` to `oklch()`, and missing sidebar tokens were added.
> All shadcn/ui components now inherit correct semantic colors from CSS custom properties without any component-level overrides.

## Introduction
Set up shadcn/ui and a base UI registry in `frontend/components/ui/`.

## Goals
- Configure shadcn/ui in the frontend.
- Establish the base UI components registry directory.

## User Stories

### US-001: UI registry initialization
**Description:** As a developer, I want a `components/ui` registry so I can add shadcn components consistently.

**Acceptance Criteria:**
- [ ] `frontend/components/ui/` exists and matches shadcn conventions.
- [ ] Base configuration for shadcn is present (e.g., config file or registry setup).
- [ ] Typecheck passes.

### US-002: Baseline UI component verification
**Description:** As a developer, I want a minimal shadcn component available to confirm setup works.

**Acceptance Criteria:**
- [ ] At least one base component is present (e.g., button).
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements
- FR-1: Add shadcn configuration per project standards.
- FR-2: Create `frontend/components/ui/` registry.
- FR-3: Include at least one base component for validation.

## Non-Goals
- No custom theming or design variants beyond base setup.

## Design Considerations
- Align component styling with Tailwind setup.

## Technical Considerations
- Use shadcn recommended installation steps.

## Success Metrics
- Able to import a shadcn component from `frontend/components/ui/`.

## Open Questions
- None.

## Assumptions
- shadcn/ui is the agreed component library.
