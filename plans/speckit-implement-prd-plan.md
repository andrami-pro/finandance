# Plan: Task-by-task PRD + Implement Workflow

## Goals
- Clarify when to run `/implement` per task and per phase.
- Define PRD file structure and naming under `.specify/tasks/`.
- Provide a repeatable step-by-step flow from plan/specify/tasks to per-task PRD to implement.
- Include an example mapping from a task ID to a PRD filename.

## Proposed Workflow
1. **Generate spec artifacts (once per feature):**
   - Run `/speckit.plan` to create `plan.md` if missing.
   - Run `/speckit.specify` to create `spec.md` if missing.
   - Run `/speckit.tasks` to create `tasks.md`.
2. **Work task-by-task:**
   - Select a task ID from `specs/001-finandance-mvp/tasks.md`.
   - Generate a PRD for that single task using the `prd` skill.
   - Save the PRD at `.specify/tasks/prd-[id]-[slug].md`.
   - Run `/implement` for that single task using the PRD as input context.
3. **Repeat:**
   - Move to the next task ID and repeat PRD -> implement.

## Naming Convention
- Folder: `.specify/tasks/`
- Filename: `prd-[id]-[slug].md`

## Example
- Task: `T025` (Integrations models)
- PRD file: `.specify/tasks/prd-t025-integrations-models.md`

## Guidance on `/implement`
- Use `/implement` **per task** (one task at a time), not per phase.
- This keeps changes scoped and traceable, and aligns with a PRD-per-task approach.

## Notes
- The `prd` skill currently targets `tasks/` by default; plan will include an adjustment to save into `.specify/tasks/`.
- If needed, we can add a lightweight wrapper instruction to ensure PRDs follow the `.specify/tasks/` path.
