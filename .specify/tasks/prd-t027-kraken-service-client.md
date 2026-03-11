# PRD: T027 Implement Kraken Service Client

## Introduction
Implement the Kraken service client for integration syncing.

## Goals
- Provide a client to call Kraken APIs.
- Normalize responses for internal use.

## User Stories

### US-001: Kraken client
**Description:** As a developer, I want a Kraken client so I can fetch balances and transactions.

**Acceptance Criteria:**
- [ ] `backend/app/services/kraken_service.py` exists.
- [ ] Client methods cover required endpoints.
- [ ] Errors are handled consistently.

## Functional Requirements
- FR-1: Implement API calls for balances and transactions.
- FR-2: Normalize response data shapes.

## Non-Goals
- No job orchestration.

## Success Metrics
- Client works with mocked responses.

## Assumptions
- Kraken API details are defined in specs.
