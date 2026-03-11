---
description: Execute the implementation plan using senior-frontend and supabase-expert skills. Combines speckit.implement task execution with Finandance UI/UX guidelines and Supabase backend best practices.
---

# Workflow: speckit.implement (Fullstack - Finandance)

1. **Context Analysis**:
   - The user has provided an input prompt. Treat this as the primary input for the skill.

2. **Load Skills**:
   - Read the implement skill at: `.claude/skills/speckit.implement/SKILL.md`
   - Read the frontend skill at: `.agents/skills/senior-frontend/SKILL.md`
   - Read the supabase skill at: `.claude/skills/supabase-expert/SKILL.md`

3. **Load Domain References (on demand)**:
   - **Frontend tasks** — before implementing any UI component, read:
     - `.agents/skills/senior-frontend/references/react_patterns.md`
     - `.agents/skills/senior-frontend/references/nextjs_optimization_guide.md`
     - `.agents/skills/senior-frontend/references/frontend_best_practices.md`
     - Design tokens: `design-tokens-nova.json`
   - **Backend / DB tasks** — before implementing any Supabase work, read:
     - `.claude/skills/supabase-expert/references/best-practices.md`
     - `.claude/skills/supabase-expert/references/common-patterns.md`
   - **Migrations** — before creating any migration:
     - `.claude/skills/supabase-expert/workflows/migration-workflow.md`
     - `.claude/skills/supabase-expert/templates/migration-template.sql`
   - **RLS policies** — before writing any policy:
     - `.claude/skills/supabase-expert/workflows/rls-policies.md`
     - `.claude/skills/supabase-expert/templates/rls-policy-template.sql`
   - **Schema design** — before modifying tables:
     - `.claude/skills/supabase-expert/workflows/schema-design.md`
   - **Debugging** — when troubleshooting Supabase issues:
     - `.claude/skills/supabase-expert/workflows/debugging.md`

4. **Execute**:
   - Follow the instructions in the implement `SKILL.md` exactly (Ironclad Protocols, task phases, blast radius analysis, etc.).
   - Apply the user's prompt as the input arguments/context for the skill's logic.

5. **Fullstack Guard Rails** (apply on top of Ironclad Protocols):

   ### Frontend Rules (from senior-frontend)
   - **Light Mode Only** — no dark mode for V1.
   - **Global background**: `bg-slate-50`; cards/widgets: `bg-white`.
   - **Borders**: `rounded-2xl` or `rounded-3xl`; **Shadows**: `shadow-xl`.
   - **Colors**: Primary = Emerald (`emerald-500/600`), Text = Slate (`slate-800/500`).
   - **Typography**: Lora (serif) for headings/titles/amounts, Lato (sans-serif) for body/labels/inputs.
   - **Icons**: Phosphor Icons only.
   - **Components**: Use shadcn/ui. Reference design tokens before choosing colors/spacing.
   - Before scaffolding a new component, check if `scripts/component_generator.py` can generate it.

   ### Backend Rules (from supabase-expert)
   - Every new table MUST have RLS policies — use the RLS template.
   - Migrations follow the migration template and workflow.
   - Use Supabase client from `lib/supabaseClient.ts`.
   - Validate auth context on every server action / API route.
   - Use parameterized queries — never string-concatenate SQL.
   - Check existing migrations in `backend/migrations/` before creating new ones to avoid conflicts.

   ### Fullstack Integration Rules
   - Frontend fetches go through Supabase client or server actions — never direct DB calls from client components.
   - Type definitions must be generated from Supabase schema (`generate_typescript_types` via MCP or `supabase gen types`).
   - Auth state managed via Supabase Auth — no custom JWT handling.
   - Environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client, `SUPABASE_SERVICE_ROLE_KEY` for server only.

6. **On Error**:
   - If `tasks.md` is missing: Run `/speckit.tasks` first
   - If `plan.md` is missing: Run `/speckit.plan` first
   - If `spec.md` is missing: Run `/speckit.specify` first
   - If a Supabase migration fails: Read `.claude/skills/supabase-expert/workflows/debugging.md`
   - If a frontend component doesn't match design: Re-read `design-tokens-nova.json` and the senior-frontend SKILL.md UI/UX rules
