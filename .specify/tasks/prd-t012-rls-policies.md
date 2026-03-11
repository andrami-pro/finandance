# PRD: T012 Add RLS Policies

## Introduction
Define Row Level Security (RLS) policies based on the data model.

## Goals
- Implement RLS policies for all relevant tables.
- Enforce user-level data isolation.

## User Stories

### US-001: RLS policy enforcement
**Description:** As a developer, I want RLS policies defined so data access is restricted by user context.

**Acceptance Criteria:**
- [ ] `supabase/migrations/002_rls_policies.sql` exists with policies for all tables requiring RLS.
- [ ] Policies align with ownership rules from the data model.
- [ ] Policies compile without SQL errors.

## Functional Requirements
- FR-1: Enable RLS on required tables.
- FR-2: Add select/insert/update/delete policies per table.

## Non-Goals
- No schema changes beyond RLS statements.

## Success Metrics
- Policy definitions execute cleanly on a new database.

## Assumptions
- Ownership rules are defined in `data-model.md`.
