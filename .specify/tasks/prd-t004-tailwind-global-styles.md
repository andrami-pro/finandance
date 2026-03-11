# PRD: T004 Configure Tailwind + Global Styles and Fonts

> **Post-completion update (2026-03-02) -- Design Token Cleanup:**
> A major design token cleanup was applied on top of this task's original implementation:
> 1. `globals.css` fully rewritten: all CSS variables now use OKLCH values sourced directly from `design-tokens-nova.json`. Previous implementation had manual HSL conversions with bugs (e.g. `--ring` incorrectly pointed to emerald instead of warm gray).
> 2. `tailwind.config.ts` updated: color wrapper function switched from `hsl()` to `oklch()`, and missing sidebar tokens were added.
> 3. All `font-lato`/`font-lora` hardcoded class references replaced with semantic `font-sans`/`font-serif` across the codebase.
> This cleanup ensures T004's deliverables are now fully aligned with `design-tokens-nova.json` as the single source of truth.

## Introduction
Set up Tailwind CSS and baseline global styles and fonts for the frontend.

## Goals
- Configure Tailwind CSS in the frontend.
- Define global styles and fonts in `frontend/app/globals.css` and `frontend/app/layout.tsx`.

## User Stories

### US-001: Tailwind configuration
**Description:** As a developer, I want Tailwind configured so I can use utility classes in the UI.

**Acceptance Criteria:**
- [ ] Tailwind is configured and wired into the build pipeline.
- [ ] `frontend/app/globals.css` includes Tailwind base layers.
- [ ] Typecheck passes.

### US-002: Global fonts and layout
**Description:** As a developer, I want global fonts and base layout styles applied so UI has consistent typography.

**Acceptance Criteria:**
- [ ] `frontend/app/layout.tsx` applies the selected global font(s).
- [ ] Global styles are applied across pages.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements
- FR-1: Add Tailwind config and PostCSS integration.
- FR-2: Define Tailwind directives in `frontend/app/globals.css`.
- FR-3: Apply font setup in `frontend/app/layout.tsx`.

## Non-Goals
- No component-level styling or custom themes beyond base setup.

## Design Considerations
- Align with design tokens if already defined.

## Technical Considerations
- Follow Next.js 14 recommended Tailwind setup.

## Success Metrics
- Tailwind classes render as expected on a baseline page.

## Open Questions
- None.

## Assumptions
- Tailwind is the chosen CSS framework per plan.
