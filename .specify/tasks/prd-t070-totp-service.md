# PRD: T070 Implement 2FA TOTP Service

## Introduction
Implement TOTP setup and verification logic.

## Goals
- Generate TOTP secrets and QR codes.
- Verify TOTP codes.

## User Stories

### US-001: TOTP service
**Description:** As a developer, I want a TOTP service so 2FA codes can be generated and verified.

**Acceptance Criteria:**
- [ ] `backend/app/services/totp_service.py` exists.
- [ ] Service can generate TOTP secrets and QR data.
- [ ] Service validates codes correctly.

## Functional Requirements
- FR-1: Generate TOTP secret and QR.
- FR-2: Verify TOTP codes with time drift tolerance.

## Non-Goals
- No UI changes.

## Success Metrics
- Service passes unit/integration tests.

## Assumptions
- TOTP library is approved in plan.
