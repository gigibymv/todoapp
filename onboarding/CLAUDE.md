# CLAUDE.md

## Purpose
This file is the operating manual for Claude Code working on the Gigi codebase. Follow it before making any change.

## Product summary
Gigi is a personal productivity OS for a high-performing individual managing Work, MBA, and Personal life. The core product loop is:
1. capture tasks quickly
2. structure them with AI plus manual override
3. generate a daily plan on the Today page
4. execute with calendar awareness and focus support

## Source-of-truth hierarchy
When files disagree, use this priority order:
1. `source-of-truth.md` or its latest canonical replacement
2. `MEMORY.md`
3. `ARCHITECTURE.md`
4. `IMPLEMENTATION_PLAN.md`
5. PRD / journey / design docs
6. inferred patterns from existing code

Never silently resolve a contradiction by guessing. If the repo contains conflicting assumptions, add a note to `OPEN_QUESTIONS.md` and choose the least destructive interpretation.

## Non-negotiable product invariants
- Authentication is required for all protected routes.
- Landing page is password-gated before auth.
- Onboarding must be complete before app access.
- Every user-facing record is isolated by `user_id` and RLS.
- Design system uses Inter Tight only.
- No raw Tailwind colors in components; use semantic tokens only.
- Mobile does not use drag-and-drop for task triage.
- Today page is the primary operational surface.
- Manual capture edits always override AI suggestions.

## Build priorities
Optimize for this order:
1. auth and route gating
2. task model and CRUD
3. universal capture
4. Today page and briefing
5. projects and boards
6. calendar sync
7. focus mode
8. coffee chats

Do not prioritize novelty features over the core task loop.

## Engineering principles
- Prefer explicit contracts over convenience.
- Prefer reversible decisions over clever abstractions.
- Do not introduce new libraries unless they remove real complexity.
- Keep state local unless shared state is clearly necessary.
- Keep server interactions typed and centralized.
- Respect generated code patterns from Lovable unless replacing them is clearly necessary.
- Do not refactor unrelated areas opportunistically.

## File edit discipline
- Before editing, inspect adjacent files for existing conventions.
- Make the smallest coherent change that solves the problem.
- If a change affects architecture or semantics, update `MEMORY.md`.
- If a change closes or creates an unresolved decision, update `OPEN_QUESTIONS.md`.
- If a change alters data shape or behavior, update `ARCHITECTURE.md` or `SCHEMA.md`.

## Database and migration rules
- Never change production-critical schema implicitly from UI code.
- Schema changes require explicit migration files.
- Any enum-like domain values must be defined consistently across DB, TypeScript types, validators, and UI controls.
- RLS is mandatory on every user-owned table.
- Prefer additive migrations over destructive ones.
- If a destructive migration is unavoidable, comment the risk and data impact.

## Task model semantics
Unless a newer canonical file overrides this:
- `due_at` or `due_date` means deadline semantics.
- `scheduled_date` means intended day of execution.
- `scheduled_time` means intended time of execution.
- AI may suggest values; user edits win.
- Today sorting should prioritize scheduled work first, then due-soon items, then unscheduled backlog.

If the schema still uses `due_date` instead of `due_at`, preserve current naming until a deliberate migration is approved.

## Edge-function rules
For each edge function:
- define typed request/response contracts
- validate inputs at the boundary
- return structured errors, not ad hoc strings
- never trust client-provided `user_id`
- make idempotency explicit where relevant

High-priority functions:
- `parse-task`
- `generate-briefing`
- `sync-calendar`
- `sync-all-calendars`
- `prepare-coffee-chat`

## UI and design rules
- Use semantic HSL tokens only.
- Maintain warm minimalist aesthetic.
- Respect touch targets >= 44px on mobile.
- Use desktop sidebar and mobile bottom nav patterns as specified.
- Use orange accent surgically; do not overuse.
- Preserve calm, premium tone in copy.

## Testing expectations
At minimum, validate:
- auth redirects
- onboarding gating
- task create/edit/delete flows
- capture manual override behavior
- Today page section rendering
- mobile non-DnD behavior
- calendar sync idempotency when implemented

If no formal test suite exists yet, still verify changes manually and document what was checked.

## What not to do
- Do not invent product behavior for unresolved questions.
- Do not expand scope during implementation.
- Do not mix design-token usage with raw utility colors.
- Do not build coffee-chat complexity before the productivity core is stable.
- Do not perform broad refactors without a concrete payoff.

## Preferred working loop
1. read relevant docs
2. inspect nearby implementation
3. identify the narrowest correct change
4. implement
5. validate
6. update memory/docs if architecture changed

