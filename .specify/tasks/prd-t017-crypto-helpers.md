# PRD: T017 Implement Fernet MultiFernet Helpers

## Introduction
Provide encryption utilities using Fernet and MultiFernet for sensitive data.

## Goals
- Implement helper utilities for encryption and decryption.
- Support key rotation via MultiFernet.

## User Stories

### US-001: Encryption helpers
**Description:** As a developer, I want reusable encryption helpers so sensitive credentials are stored securely.

**Acceptance Criteria:**
- [ ] `backend/app/core/crypto.py` provides encrypt/decrypt helpers.
- [ ] MultiFernet is used to support key rotation.
- [ ] Errors are handled with clear exceptions.

## Functional Requirements
- FR-1: Implement encrypt(value: str) -> str.
- FR-2: Implement decrypt(value: str) -> str.
- FR-3: Load keys from configuration.

## Non-Goals
- No key management UI.

## Success Metrics
- Encrypted values can be decrypted reliably with current keys.

## Assumptions
- Key material is provided via env/config.
