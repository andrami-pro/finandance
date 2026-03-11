# PRD: T035 Build Connect Modal Components

> **Post-completion update (2026-03-02) -- Design Token Cleanup:**
> ConnectModal component was updated as part of a project-wide design token cleanup:
> 1. Hardcoded Tailwind color classes replaced with semantic token classes.
> 2. All `font-lato`/`font-lora` replaced with `font-sans`/`font-serif`.
> Component now derives all colors from CSS custom properties, consistent with the design token system.

## Introduction
Create UI components for the provider connect modal.

## Goals
- Provide modal UI for entering provider credentials.
- Support multiple providers.

## User Stories

### US-001: Connect modal UI
**Description:** As a user, I want a modal to enter provider credentials so I can connect my account.

**Acceptance Criteria:**
- [ ] `frontend/components/integrations/ConnectModal.tsx` exists.
- [ ] Modal supports provider selection and input fields.
- [ ] Basic validation is present.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements
- FR-1: Modal UI with form fields.
- FR-2: Hook into submit handler (stub allowed if API not ready).

## Non-Goals
- No backend integration.

## Success Metrics
- Modal opens and accepts input.

## Assumptions
- UI component library is configured.
