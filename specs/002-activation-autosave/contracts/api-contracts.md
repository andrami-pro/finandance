# API Contracts: Activation Flow + Auto-Save (DCA)

## Overview

New endpoints for managing funding plans (Auto-Save / DCA). Extends the existing API from `001-finandance-mvp`.

All endpoints require JWT authentication via `Authorization: Bearer <token>`.

## Funding Plans Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | /funding-plans | Create a new funding plan | Yes |
| GET | /funding-plans?project_id={id} | List plans for a project | Yes |
| GET | /funding-plans/{id} | Get a single plan | Yes |
| PUT | /funding-plans/{id} | Update a plan | Yes |
| DELETE | /funding-plans/{id} | Delete a plan | Yes |

---

### POST /api/v1/funding-plans

Create a new funding plan for a project.

**Authorization**: Caller must be a member of the target project.

**Request Body**:
```json
{
  "project_id": "uuid",
  "funding_source_id": "uuid | null",
  "plan_type": "dca",
  "amount": 200.00,
  "currency": "EUR",
  "frequency": "monthly"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| project_id | UUID | Yes | Must exist, caller must be member |
| funding_source_id | UUID | No | Must belong to caller if provided |
| plan_type | string | Yes | `"dca"` or `"lump_sum"` |
| amount | number | Yes | > 0 |
| currency | string | Yes | ISO 4217 code (EUR, USD, BTC) |
| frequency | string | Conditional | Required if `plan_type === "dca"`. One of: `"weekly"`, `"biweekly"`, `"monthly"` |

**Response** (201 Created):
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "user_id": "uuid",
  "funding_source_id": "uuid | null",
  "plan_type": "dca",
  "amount": 200.00,
  "currency": "EUR",
  "frequency": "monthly",
  "next_reminder_at": "2026-04-03T00:00:00Z",
  "is_active": true,
  "created_at": "2026-03-03T12:00:00Z",
  "updated_at": "2026-03-03T12:00:00Z"
}
```

**Errors**:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | INVALID_REQUEST | DCA plan without frequency |
| 403 | FORBIDDEN | Caller not a member of the project |
| 404 | NOT_FOUND | Project or funding source not found |
| 422 | VALIDATION_ERROR | Amount <= 0, invalid plan_type/frequency |

---

### GET /api/v1/funding-plans?project_id={id}

List all funding plans for a project. Returns plans visible to the caller (own plans + other members' plans if member of project).

**Query Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| project_id | UUID | Yes | Filter by project |

**Response** (200 OK):
```json
{
  "items": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "user_id": "uuid",
      "funding_source_id": "uuid | null",
      "plan_type": "dca",
      "amount": 200.00,
      "currency": "EUR",
      "frequency": "monthly",
      "next_reminder_at": "2026-04-03T00:00:00Z",
      "is_active": true,
      "created_at": "2026-03-03T12:00:00Z",
      "updated_at": "2026-03-03T12:00:00Z"
    }
  ],
  "count": 1
}
```

**Errors**:
| Status | Code | Condition |
|--------|------|-----------|
| 403 | FORBIDDEN | Caller not a member of the project |

---

### GET /api/v1/funding-plans/{id}

Get a single funding plan by ID.

**Authorization**: Caller must own the plan OR be a member of the plan's project.

**Response** (200 OK): Same shape as single item in list response.

**Errors**:
| Status | Code | Condition |
|--------|------|-----------|
| 403 | FORBIDDEN | Not plan owner or project member |
| 404 | NOT_FOUND | Plan not found |

---

### PUT /api/v1/funding-plans/{id}

Update a funding plan. Only the plan owner can update.

**Request Body** (all fields optional):
```json
{
  "funding_source_id": "uuid | null",
  "amount": 300.00,
  "frequency": "biweekly",
  "is_active": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| funding_source_id | UUID / null | Change or clear the funding source |
| amount | number | New contribution amount (must be > 0) |
| frequency | string | New frequency (`"weekly"`, `"biweekly"`, `"monthly"`) |
| is_active | boolean | Pause (false) or resume (true) the plan |

When `is_active` changes from `false` to `true` or `frequency` changes, `next_reminder_at` is recalculated from now.

**Response** (200 OK): Updated plan object.

**Errors**:
| Status | Code | Condition |
|--------|------|-----------|
| 403 | FORBIDDEN | Caller is not the plan owner |
| 404 | NOT_FOUND | Plan not found |
| 422 | VALIDATION_ERROR | Invalid values |

---

### DELETE /api/v1/funding-plans/{id}

Delete a funding plan. Only the plan owner can delete.

**Response** (204 No Content)

**Errors**:
| Status | Code | Condition |
|--------|------|-----------|
| 403 | FORBIDDEN | Caller is not the plan owner |
| 404 | NOT_FOUND | Plan not found |

---

## Changes to Existing Endpoints

### GET /api/v1/projects/{id}

**Extended response**: The `ProjectResponse` now includes a `funding_plans` array:

```json
{
  "id": "uuid",
  "name": "House Down Payment",
  "target_amount": 10000,
  "target_currency": "EUR",
  "...": "...",
  "funding_plans": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "plan_type": "dca",
      "amount": 200.00,
      "currency": "EUR",
      "frequency": "monthly",
      "next_reminder_at": "2026-04-03T00:00:00Z",
      "is_active": true
    }
  ]
}
```

This includes all plans for the project visible to the caller (own + other members' plans).
