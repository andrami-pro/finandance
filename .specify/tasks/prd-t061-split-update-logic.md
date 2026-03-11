# PRD: T061 Implement Split Update Logic

## Introduction
Implement split update logic in transactions service.

## Goals
- Add backend logic to store split allocations.

## User Stories

### US-001: Split update service
**Description:** As a developer, I want split update logic so transactions can be shared among collaborators.

**Acceptance Criteria:**
- [ ] `backend/app/services/transactions_service.py` includes split update logic.
- [ ] Validations enforce sum of splits and participants.

## Functional Requirements
- FR-1: Implement split update method.
- FR-2: Validate input and persist splits.

## Non-Goals
- No UI changes.

## Success Metrics
- Logic passes unit/integration tests.

## Assumptions
- Split rules are defined in specs.
