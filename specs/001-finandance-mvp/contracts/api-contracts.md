# API Contracts: Finandance MVP

## Overview

This document defines the API contracts for external integrations and frontend-backend communication.

## Base URL

All API endpoints are versioned under `/api/v1/`. This ensures backward compatibility as the API evolves.

```
Development:  http://localhost:8000/api/v1
Production:   https://api.finandance.app/api/v1
```

## Authentication

All endpoints (except `/auth/*`) require:
- Valid Supabase JWT token in `Authorization: Bearer <token>` header
- Completed 2FA verification (mandatory per Finandance Constitution)

**FastAPI JWT validation**: The backend validates Supabase JWTs using `SUPABASE_JWT_SECRET` (RS256). A `get_current_user` FastAPI dependency handles extraction and validation on every protected route.

**Token lifecycle**: Access token expires in 1 hour. Supabase JS SDK auto-refreshes using the refresh token (7-day TTL). The FastAPI backend does not issue its own tokens.

**2FA during development**: 2FA is optional. The full TOTP flow is implemented but enforcement is disabled. Pre-launch: flip Supabase Auth MFA setting to "required" — no endpoint changes needed.

## Error Response Format

All errors follow a consistent format (FastAPI global exception handler overrides the default `{"detail": "..."}` shape):

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Malformed request body |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists (e.g., duplicate integration) |
| 422 | VALIDATION_ERROR | Pydantic/business validation failed |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

## Endpoints

### Authentication Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | /auth/signup | Register new user | No |
| POST | /auth/login | User login | No |
| POST | /auth/2fa/setup | Initialize TOTP 2FA and return recovery codes (optional during dev) | Yes (session) |
| GET | /auth/2fa/qr | Get QR code for authenticator app | Yes (session) |
| POST | /auth/2fa/verify | Submit TOTP code (required only if user has 2FA enabled) | Yes (session) |
| POST | /auth/2fa/recover | Use a one-time recovery code instead of TOTP | No |

### Dashboard Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | /api/v1/dashboard/net-worth | Get total net worth in requested currency | Yes |
| GET | /api/v1/dashboard/summary | Get dashboard overview (KPIs, projects, sources) | Yes |

### Integrations Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | /api/v1/integrations | List user integrations | Yes |
| POST | /api/v1/integrations/connect | Add new integration | Yes |
| DELETE | /api/v1/integrations/{id} | Remove integration | Yes |
| POST | /api/v1/integrations/{id}/sync | Trigger async manual sync (returns job ID) | Yes |

### Jobs Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | /api/v1/jobs/{job_id} | Poll sync job status | Yes |

### Funding Sources Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | /api/v1/funding-sources | List all funding sources | Yes |
| GET | /api/v1/funding-sources/{id} | Get source details | Yes |
| POST | /api/v1/funding-sources/{id}/assign | Assign source to a project | Yes |
| DELETE | /api/v1/funding-sources/{id}/assign/{project_id} | Unassign source from project | Yes |

### Projects Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | /api/v1/projects | List user projects | Yes |
| POST | /api/v1/projects | Create new project | Yes |
| GET | /api/v1/projects/{id} | Get project details | Yes |
| PATCH | /api/v1/projects/{id} | Update project name/target/date | Yes |
| DELETE | /api/v1/projects/{id} | Delete project (OWNER only) | Yes |
| POST | /api/v1/projects/{id}/invite | Invite collaborator by email | Yes |
| POST | /api/v1/projects/{id}/accept | Accept invitation | Yes |
| POST | /api/v1/projects/{id}/leave | Leave project | Yes |

### Transactions Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | /api/v1/transactions | List transactions (paginated) | Yes |
| GET | /api/v1/transactions/{id} | Get transaction details | Yes |
| PATCH | /api/v1/transactions/{id}/split | Split transaction | Yes |

### Budget Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | /api/v1/budget/summary | Get budget summary (income vs expenses) | Yes |
| GET | /api/v1/budget/categories | Get spending breakdown by category | Yes |

---

## Request/Response Examples

### POST /auth/2fa/setup

Returns TOTP secret, QR code URI, and one-time recovery codes. Recovery codes are hashed before storage.

**Response (200):**
```json
{
  "totp_secret": "BASE32SECRET",
  "qr_code_uri": "otpauth://totp/Finandance:user@email.com?secret=BASE32SECRET&issuer=Finandance",
  "recovery_codes": [
    "XXXX-XXXX-XXXX",
    "YYYY-YYYY-YYYY",
    "...8 codes total..."
  ],
  "warning": "Save these recovery codes now. They will not be shown again."
}
```

### POST /auth/2fa/recover

Allows login when TOTP device is unavailable. Each code is single-use.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "recovery_code": "XXXX-XXXX-XXXX"
}
```

**Response (200):**
```json
{
  "access_token": "...",
  "recovery_codes_remaining": 7,
  "warning": "Recovery code used. Generate new codes from your security settings."
}
```

### POST /api/v1/integrations/connect

**Request:**
```json
{
  "provider": "WISE",
  "api_key": "plaintext_key_from_user",
  "name": "My Wise Account"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "provider": "WISE",
  "status": "PENDING",
  "job_id": "sync-job-uuid",
  "message": "Integration created. Sync started in background."
}
```

*Note: `funding_sources` are returned via `GET /api/v1/jobs/{job_id}` once sync completes.*

### POST /api/v1/integrations/{id}/sync

Triggers an asynchronous sync. Returns immediately with a job reference.

**Response (202 Accepted):**
```json
{
  "job_id": "sync-job-uuid",
  "status": "QUEUED",
  "integration_id": "uuid"
}
```

### GET /api/v1/jobs/{job_id}

**Response (200) — in progress:**
```json
{
  "job_id": "sync-job-uuid",
  "status": "RUNNING",
  "integration_id": "uuid",
  "started_at": "2026-02-22T10:00:00Z"
}
```

**Response (200) — completed:**
```json
{
  "job_id": "sync-job-uuid",
  "status": "COMPLETED",
  "integration_id": "uuid",
  "funding_sources_synced": 3,
  "transactions_synced": 47,
  "completed_at": "2026-02-22T10:00:08Z"
}
```

**Response (200) — failed:**
```json
{
  "job_id": "sync-job-uuid",
  "status": "FAILED",
  "integration_id": "uuid",
  "error": "INVALID_API_KEY"
}
```

### GET /api/v1/dashboard/net-worth

Accepts `?currency=EUR` query param (defaults to EUR).

**Response (200):**
```json
{
  "total_balance": 15420.50,
  "currency": "EUR",
  "exchange_rates_as_of": "2026-02-22T09:45:00Z",
  "by_asset_type": {
    "fiat": 12000.00,
    "crypto": 3420.50
  },
  "by_source": [
    {
      "source_id": "uuid",
      "name": "EUR Jar",
      "balance_native": 10000.00,
      "currency_native": "EUR",
      "balance_in_eur": 10000.00
    },
    {
      "source_id": "uuid2",
      "name": "BTC Wallet",
      "balance_native": 0.05,
      "currency_native": "BTC",
      "balance_in_eur": 3420.50
    }
  ]
}
```

### POST /api/v1/projects

**Request:**
```json
{
  "name": "Vacation Fund",
  "target_amount": 5000.00,
  "target_currency": "EUR",
  "target_date": "2026-08-01"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Vacation Fund",
  "target_amount": 5000.00,
  "target_currency": "EUR",
  "current_amount": 0.00,
  "target_date": "2026-08-01",
  "created_by": "user_uuid",
  "members": [
    {
      "user_id": "user_uuid",
      "role": "OWNER"
    }
  ],
  "funding_sources": [],
  "created_at": "2026-02-22T10:00:00Z"
}
```

### POST /api/v1/funding-sources/{id}/assign

**Request:**
```json
{
  "project_id": "project_uuid",
  "allocated_amount": 1500.00
}
```

`allocated_amount` is optional — omit to allocate the full balance.

**Response (200):**
```json
{
  "funding_source_id": "uuid",
  "project_id": "project_uuid",
  "allocated_amount": 1500.00
}
```

### GET /api/v1/transactions

Supports pagination and filtering.

**Query params**: `?page=1&limit=50&sort=transaction_date&order=desc&source_id=uuid&category=food`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "funding_source_id": "uuid",
      "amount": -45.50,
      "currency": "EUR",
      "description": "Mercadona",
      "category": "food",
      "transaction_date": "2026-02-21T18:30:00Z",
      "is_split": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_count": 142,
    "total_pages": 3
  }
}
```

### PATCH /api/v1/transactions/{id}/split

**Request:**
```json
{
  "is_split": true,
  "split_with_user_id": "collaborator_uuid",
  "split_amount": 22.75
}
```

`split_amount` is optional — omit for equal 50/50 split.

**Response (200):**
```json
{
  "id": "transaction_uuid",
  "amount": -45.50,
  "is_split": true,
  "split_with_user_id": "collaborator_uuid",
  "split_amount": 22.75,
  "your_share": 22.75
}
```

---

## Rate Limiting

| Endpoint group | Limit | Notes |
|----------------|-------|-------|
| `/auth/*` | 5 req/min per IP | Brute-force protection |
| `/api/v1/integrations/{id}/sync` | 1 req/5min per integration | Prevents API abuse toward providers |
| `/api/v1/*` (general) | 100 req/min per user | Applied via JWT identity |

Rate limit responses return `429` with `Retry-After` header.

---

## Async Sync Pattern

Integration syncs (Wise, Kraken, Ledger) are non-blocking:

1. Client calls `POST /api/v1/integrations/{id}/sync` → receives `202` with `job_id`
2. Client polls `GET /api/v1/jobs/{job_id}` every 2 seconds until `status` is `COMPLETED` or `FAILED`
3. On completion, client refreshes funding sources and dashboard data

*Alternative*: Use Supabase Realtime to push job status updates to the frontend, eliminating polling. Recommended for V2.

---

## Webhooks (Future — V2)

Not in MVP scope:
- `integration.connected`
- `integration.error`
- `transaction.created`
- `project.goal_reached`
- `project.member_joined`
