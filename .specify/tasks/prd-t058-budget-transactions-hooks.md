# PRD: T058 Wire Budget/Transactions API Hooks

## Introduction
Create frontend hooks for budget and transactions APIs.

## Goals
- Provide hooks for budget summary and transactions list.

## User Stories

### US-001: Budget hook
**Description:** As a developer, I want a budget hook so the UI can fetch summary data.

**Acceptance Criteria:**
- [ ] `frontend/hooks/useBudget.ts` exists.
- [ ] Hook returns summary and categories data.

### US-002: Transactions hook
**Description:** As a developer, I want a transactions hook so the UI can fetch paginated transaction data.

**Acceptance Criteria:**
- [ ] `frontend/hooks/useTransactions.ts` exists.
- [ ] Hook supports pagination parameters.

## Functional Requirements
- FR-1: Implement budget hook using API wrapper.
- FR-2: Implement transactions hook using API wrapper.

## Non-Goals
- No UI changes.

## Success Metrics
- Hooks can be imported by UI components.

## Assumptions
- API client wrapper exists.
