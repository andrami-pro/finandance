# PRD: T011 Define SQL Schema + Indexes

## Introduction
Define the initial SQL schema and indexes based on the data model for Supabase.

## Goals
- Create initial tables and indexes per the data model.
- Ensure schema is ready for app development.

## User Stories

### US-001: Database schema initialization
**Description:** As a developer, I want the base SQL schema and indexes defined so backend services can store and query data.

**Acceptance Criteria:**
- [ ] `supabase/migrations/001_init.sql` exists with all tables from the data model.
- [ ] Primary keys, foreign keys, and required constraints are defined.
- [ ] Indexes for high-traffic queries are included.
- [ ] SQL executes without errors on a clean database.

## Functional Requirements
- FR-1: Create tables per `data-model.md`.
- FR-2: Add indexes per access patterns in the data model.
- FR-3: Include constraints for data integrity.

## Non-Goals
- No RLS policies (handled in T012).
- No seed data.

## Success Metrics
- Database can be initialized with the migration and pass basic integrity checks.

## Assumptions
- The data model in specs is the single source of truth.
