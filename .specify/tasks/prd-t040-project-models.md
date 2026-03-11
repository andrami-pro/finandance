# PRD: T040 Implement Project + ProjectMember Models

## Status: DONE (2026-03-03)

## Implementation Notes

**Backend**: `backend/app/models/projects.py`
- `MemberRole` enum, `ProjectCreate`, `ProjectUpdate`, `InviteMemberRequest`, `RespondToInviteRequest`, `AssignFundingSourceRequest`
- `ProjectMemberResponse`, `ProjectFundingSourceResponse`, `ProjectResponse`, `ProjectListItem`
- Added `funding_strategy: str | None` to `ProjectCreate`, `ProjectUpdate`, `ProjectResponse`, and `ProjectListItem`. Valid values: `'fiat'` or `'crypto'`. Field is optional (nullable) to preserve backwards compatibility with projects created before this field was introduced.

**Frontend**: `frontend/src/types/projects.ts`
- `ProjectCategory`, `ProjectCurrency` (EUR|USD|BTC), `MemberRole`, `Provider`
- `ProjectDetails`, `ProjectMember`, `FundingSourceOption`, `ProjectResponse`, `ProjectListItem`
- Added `FundingStrategy = 'fiat' | 'crypto'` union type.
- Added `funding_strategy: FundingStrategy | null` field to `ProjectResponse` and `ProjectListItem`.

**Mock data**: `frontend/src/mocks/projects.ts` — all mock project entries updated to include `funding_strategy`.

## Acceptance Criteria
- [x] Backend models defined and import cleanly.
- [x] Frontend types defined and used across wizard + detail page.
- [x] `FundingStrategy` type defined in `frontend/src/types/projects.ts`.
- [x] `funding_strategy` field present in backend Pydantic models (`ProjectCreate`, `ProjectUpdate`, `ProjectResponse`, `ProjectListItem`).
- [x] `funding_strategy` field present in frontend TypeScript types (`ProjectResponse`, `ProjectListItem`).
- [x] Mock data updated to include `funding_strategy`.
