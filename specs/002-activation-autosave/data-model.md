# Data Model: Activation Flow + Auto-Save (DCA)

## Overview

This document defines the new `funding_plans` entity added by feature `002-activation-autosave`. It extends the existing data model from `001-finandance-mvp`.

## Entity Relationship (extension to existing model)

```
┌─────────────────┐
│    projects     │
├─────────────────┤
│ id (PK)         │◄──────────┐
│ ...             │           │
└─────────────────┘           │
                              │
┌─────────────────┐    ┌──────┴──────────────┐    ┌──────────────────────┐
│     users       │    │   funding_plans     │    │   funding_sources    │
├─────────────────┤    ├─────────────────────┤    ├──────────────────────┤
│ id (PK)         │◄───│ user_id (FK)        │    │ id (PK)              │
│ ...             │    │ project_id (FK)     │    │ ...                  │
└─────────────────┘    │ funding_source_id   │───►│                      │
                       │   (FK, nullable)    │    └──────────────────────┘
                       │ plan_type           │
                       │ amount              │
                       │ currency            │
                       │ frequency           │
                       │ next_reminder_at    │
                       │ is_active           │
                       │ created_at          │
                       │ updated_at          │
                       └─────────────────────┘
```

## New Entity: `funding_plans`

Stores savings plan configurations (Auto-Save / DCA). MVP scope: plan + in-app reminders only (no automated transfers).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique plan identifier |
| `project_id` | UUID | NOT NULL, FK → projects(id) ON DELETE CASCADE | Associated project |
| `user_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | Plan owner |
| `funding_source_id` | UUID | FK → funding_sources(id) ON DELETE SET NULL | Source to fund from (nullable — cleared if source disconnected) |
| `plan_type` | VARCHAR(20) | NOT NULL, DEFAULT 'dca', CHECK IN ('dca', 'lump_sum') | Type of savings plan |
| `amount` | NUMERIC(18,8) | NOT NULL, CHECK (amount > 0) | Contribution amount per period |
| `currency` | VARCHAR(10) | NOT NULL | Currency of the contribution (typically matches project target_currency) |
| `frequency` | VARCHAR(20) | CHECK IN ('weekly', 'biweekly', 'monthly') | Contribution frequency (required for DCA, null for lump_sum) |
| `next_reminder_at` | TIMESTAMPTZ | | Next scheduled reminder timestamp |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Whether the plan is active |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp (auto-updated via trigger) |

### Constraints

| Constraint | Type | Description |
|-----------|------|-------------|
| `chk_dca_has_frequency` | CHECK | `plan_type != 'dca' OR frequency IS NOT NULL` — DCA plans must have a frequency |
| `amount > 0` | CHECK | Amount must be positive |
| `plan_type IN ('dca', 'lump_sum')` | CHECK | Only valid plan types |
| `frequency IN ('weekly', 'biweekly', 'monthly')` | CHECK | Only valid frequencies |

### Indexes

| Index | Columns | Filter | Purpose |
|-------|---------|--------|---------|
| `idx_funding_plans_project` | project_id | — | Fast lookup by project |
| `idx_funding_plans_user` | user_id | — | Fast lookup by user |
| `idx_funding_plans_next_reminder` | next_reminder_at | WHERE is_active = true | Efficient reminder queries |

### Cascade Behavior

| FK Target | On Delete | Rationale |
|-----------|-----------|-----------|
| projects(id) | CASCADE | If project is deleted, plans are deleted |
| users(id) | CASCADE | If user is deleted, plans are deleted (GDPR) |
| funding_sources(id) | SET NULL | If source is disconnected, plan survives but source reference clears. UI prompts user to re-link. |

### RLS Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `funding_plans_select_own` | SELECT | `user_id = auth.uid()` |
| `funding_plans_select_project_member` | SELECT | `project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())` |
| `funding_plans_insert_own` | INSERT | `user_id = auth.uid()` |
| `funding_plans_update_own` | UPDATE | `user_id = auth.uid()` |
| `funding_plans_delete_own` | DELETE | `user_id = auth.uid()` |

### Reminder Calculation Logic

When a plan is created or a reminder is acknowledged:

| Frequency | Next Reminder |
|-----------|---------------|
| `weekly` | current + 7 days |
| `biweekly` | current + 14 days |
| `monthly` | current + 1 calendar month |

Initial `next_reminder_at` is set to the first interval from plan creation time.

### Relationship to Existing Entities

- **projects**: One project can have multiple funding plans (one per member). Plans are per-user, per-project.
- **users**: A user can have plans across multiple projects.
- **funding_sources**: A plan optionally references a source. If the source is disconnected, `SET NULL` keeps the plan active but source-less — the UI shows "Source disconnected, please re-link."
