# PRD: T072 Build 2FA Setup/Verify/Recover Pages

## Introduction
Create UI pages for 2FA setup, verification, and recovery.

## Goals
- Provide 2FA UI flows.

## User Stories

### US-001: 2FA pages UI
**Description:** As a user, I want 2FA setup and verification pages so I can secure my account.

**Acceptance Criteria:**
- [ ] `frontend/app/(auth)/2fa/setup/page.tsx` exists.
- [ ] `frontend/app/(auth)/2fa/verify/page.tsx` exists.
- [ ] `frontend/app/(auth)/2fa/recover/page.tsx` exists.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements
- FR-1: Implement setup page UI with QR display placeholder.
- FR-2: Implement verify and recover form UIs.

## Non-Goals
- No backend integration in this task.

## Success Metrics
- Pages render and validate inputs.

## Assumptions
- UI component library exists.
