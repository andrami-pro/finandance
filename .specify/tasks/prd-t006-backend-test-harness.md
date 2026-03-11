# PRD: T006 Configure Backend Test Harness

## Introduction
Set up pytest, pytest-asyncio, and httpx test harness configuration for backend testing.

## Goals
- Establish a working test harness in `backend/tests/`.
- Provide shared fixtures in `backend/tests/conftest.py`.

## User Stories

### US-001: Backend test configuration
**Description:** As a developer, I want backend test tooling configured so I can write unit and integration tests.

**Acceptance Criteria:**
- [ ] `backend/tests/conftest.py` exists with baseline fixtures.
- [ ] `pytest` and `pytest-asyncio` are declared in backend dev dependencies.
- [ ] `httpx` is available for async client testing.
- [ ] Running `pytest` discovers tests without configuration errors.

## Functional Requirements
- FR-1: Add pytest-related dependencies to backend `pyproject.toml`.
- FR-2: Create `backend/tests/conftest.py` with base fixtures (e.g., event loop, app client).
- FR-3: Ensure test discovery works for future tests.

## Non-Goals
- No actual test cases implemented in this task.

## Design Considerations
- Keep fixtures minimal and reusable.

## Technical Considerations
- Prefer async fixtures compatible with FastAPI.

## Success Metrics
- `pytest` runs without errors in an empty test suite.

## Open Questions
- None.

## Assumptions
- Tests will be written using pytest with async support.
