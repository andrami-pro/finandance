# PRD: T021 Unit Tests for Encryption Helpers

## Introduction
Add unit tests for encryption helpers to ensure correct encrypt/decrypt behavior.

## Goals
- Validate encryption and decryption with valid inputs.
- Ensure failures are handled predictably.

## User Stories

### US-001: Encryption helper tests
**Description:** As a developer, I want unit tests for encryption helpers so I can trust credential storage logic.

**Acceptance Criteria:**
- [ ] `backend/tests/unit/test_crypto.py` exists.
- [ ] Tests cover encrypt/decrypt round-trip.
- [ ] Tests cover invalid input handling.
- [ ] Tests are deterministic and isolated.

## Functional Requirements
- FR-1: Add tests for `encrypt` and `decrypt` functions.
- FR-2: Mock keys or use test keys safely.

## Non-Goals
- No integration tests.

## Success Metrics
- All crypto unit tests pass reliably.

## Assumptions
- Encryption helpers are defined in `backend/app/core/crypto.py`.
