# PRD: T074 Wire Supabase Auth Client and Session Handling

## Introduction
Set up Supabase auth client and session handling in frontend.

## Goals
- Provide a Supabase client wrapper.
- Manage auth session state.

## User Stories

### US-001: Supabase auth client
**Description:** As a developer, I want a Supabase auth client so the frontend can authenticate users.

**Acceptance Criteria:**
- [ ] `frontend/lib/supabaseClient.ts` exists.
- [ ] Client is configured with env vars.
- [ ] Session handling utilities are provided.

## Functional Requirements
- FR-1: Initialize Supabase client.
- FR-2: Expose session helpers.

## Non-Goals
- No UI changes.

## Success Metrics
- Client can be imported without runtime errors.

## Assumptions
- Supabase project keys exist.
