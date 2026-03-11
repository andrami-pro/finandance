# PRD: T075 Document APScheduler Single-Instance Requirement

## Introduction
Document the requirement that APScheduler must run as a single instance.

## Goals
- Update quickstart documentation with the requirement.

## User Stories

### US-001: APScheduler documentation
**Description:** As a developer, I want documentation on APScheduler single-instance requirements so deployments avoid duplicate jobs.

**Acceptance Criteria:**
- [ ] `specs/001-finandance-mvp/quickstart.md` includes APScheduler single-instance note.

## Functional Requirements
- FR-1: Add a clear note about single-instance constraints.

## Non-Goals
- No code changes.

## Success Metrics
- Documentation includes the requirement.

## Assumptions
- APScheduler is used for background jobs.
