# PRD: T013 Implement DB Session + Base Repository

## Introduction
Create a database session utility and base repository abstraction.

## Goals
- Provide a reusable DB session helper.
- Implement a base repository class for data access.

## User Stories

### US-001: Shared DB access layer
**Description:** As a developer, I want a shared DB session and repository layer so all services use consistent patterns.

**Acceptance Criteria:**
- [ ] `backend/app/core/db.py` provides DB session creation utilities.
- [ ] `backend/app/core/repository.py` defines a base repository with common CRUD patterns.
- [ ] Utilities are importable without side effects.

## Functional Requirements
- FR-1: Add DB session factory and lifecycle helpers.
- FR-2: Add base repository abstraction.

## Non-Goals
- No domain-specific repositories.

## Success Metrics
- Repository can be subclassed without modification.

## Assumptions
- SQLAlchemy or chosen ORM is defined in plan.
