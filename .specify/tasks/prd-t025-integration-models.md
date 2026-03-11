# PRD: T025 Implement Integration + FundingSource Models

## Introduction
Implement Integration and FundingSource models for the backend.

## Goals
- Add models mapping to database tables.
- Enable use in services and endpoints.

## User Stories

### US-001: Integration model
**Description:** As a developer, I want an Integration model so I can store provider connection data.

**Acceptance Criteria:**
- [ ] `backend/app/models/integrations.py` defines Integration model.
- [ ] Fields align with data model.

### US-002: FundingSource model
**Description:** As a developer, I want a FundingSource model so synced accounts can be stored.

**Acceptance Criteria:**
- [ ] `backend/app/models/funding_sources.py` defines FundingSource model.
- [ ] Fields align with data model.

## Functional Requirements
- FR-1: Map models to database schema.
- FR-2: Include relationships where needed.

## Non-Goals
- No service logic.

## Success Metrics
- Models import cleanly and map to schema.

## Assumptions
- Schema exists from T011.
