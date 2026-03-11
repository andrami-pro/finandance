# PRD: T028 Implement Ledger Service Client

## Introduction
Implement the Ledger service client for integration syncing.

## Goals
- Provide a client to call Ledger APIs.
- Normalize responses for internal use.

## User Stories

### US-001: Ledger client
**Description:** As a developer, I want a Ledger client so I can fetch accounts and transactions.

**Acceptance Criteria:**
- [ ] `backend/app/services/ledger_service.py` exists.
- [ ] Client methods cover required endpoints.
- [ ] Errors are handled consistently.

## Functional Requirements
- FR-1: Implement API calls for accounts and transactions.
- FR-2: Normalize response data shapes.

## Non-Goals
- No job orchestration.

## Success Metrics
- Client works with mocked responses.

## Assumptions
- Ledger API details are defined in specs.
