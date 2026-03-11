# PRD: T014 Implement Config Loader via Pydantic Settings

## Introduction
Add configuration loading using Pydantic Settings for backend configuration.

## Goals
- Provide a centralized config object.
- Load environment variables safely.

## User Stories

### US-001: Backend configuration management
**Description:** As a developer, I want configuration loading via Pydantic so environment settings are validated.

**Acceptance Criteria:**
- [ ] `backend/app/core/config.py` exists with a Pydantic Settings class.
- [ ] Required env vars are defined with defaults where appropriate.
- [ ] Config can be imported by other modules.

## Functional Requirements
- FR-1: Add Settings class.
- FR-2: Provide a singleton or cached access pattern.

## Non-Goals
- No environment variable documentation (handled elsewhere).

## Success Metrics
- Missing required env vars raise clear errors.

## Assumptions
- Pydantic Settings is approved in the plan.
