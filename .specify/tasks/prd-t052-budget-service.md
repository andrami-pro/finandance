# PRD: T052 Implement Budget Summary + Categories Services

## Introduction
Implement backend services for budget summary and categories.

## Goals
- Provide budget summary calculations.
- Provide budget categories breakdown.

## User Stories

### US-001: Budget service
**Description:** As a developer, I want budget services so the API can return summary and category data.

**Acceptance Criteria:**
- [ ] `backend/app/services/budget_service.py` exists.
- [ ] Service returns summary totals and category breakdowns.
- [ ] Performance is acceptable for expected data sizes.

## Functional Requirements
- FR-1: Implement summary calculations.
- FR-2: Implement category aggregation.

## Non-Goals
- No UI changes.

## Success Metrics
- Budget service outputs correct totals with test data.

## Assumptions
- Transactions data is available.
