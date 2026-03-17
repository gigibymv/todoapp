# MEMORY.md

## Current product state
- Product name: Gigi
- Legal entity reference: MV Intelligence
- Product thesis: personal productivity OS centered on AI-assisted task capture and daily planning
- Primary user framing: one high-performing user managing Work, MBA, and Personal life

## Current architecture assumptions
- Frontend: React 18 + Vite + TypeScript
- Styling: Tailwind + shadcn/ui + custom semantic tokens
- Backend: Supabase via Lovable
- Async/business logic: edge functions
- Primary AI-assisted flows: task parsing, daily briefing, calendar sync helpers, coffee-chat prep

## Core routes
- `/welcome`
- `/auth`
- `/onboarding`
- `/`
- `/tasks`
- `/projects`
- `/calendar`
- `/coffee-chats`
- `/focus`
- `/settings`

## Settled product decisions
- Landing page is password-gated before auth.
- Auth is email/password only.
- Email verification is required.
- Onboarding is mandatory before app access.
- Today page is the main operational surface.
- Daily briefing UI language is Do / Maybe / Skip.
- Desktop supports drag-and-drop triage.
- Mobile does not support drag-and-drop triage; it uses a move menu.
- Due date and scheduled time are independently selectable during capture.
- Manual time selection overrides AI-parsed time.
- Task categories support parent/child hierarchy.
- Visible UI contexts are Work, MBA, Personal, while DB may contain additional contexts.

## Task model notes
These are current assumptions, not all fully locked engineering contracts:
- task requires title, status, priority, context, energy_type, user_id
- statuses: todo, in_progress, done, archived
- priorities: p1, p2, p3, p4
- contexts: work, mba, personal, finance, health, legal
- energy types: deep_work, shallow, admin, quick_win
- `due_date` is currently documented as nullable ISO timestamp
- `scheduled_date` is currently documented as nullable YYYY-MM-DD
- `scheduled_time` is currently documented as nullable HH:MM

## Design decisions
- Font is Inter Tight only.
- Accent is orange hsl(24, 85%, 55%).
- Background is warm gray in light and deep charcoal in dark.
- All colors should come from semantic HSL design tokens.
- Border radius baseline is 10px.
- Brand icon is Lucide `Type`.

## Known deferrals / caution areas
- Coffee chats should not outrank core task-loop implementation.
- Calendar dismissal requires a dedicated model; do not fake it in UI state only.
- Task scheduling semantics need tighter locking before heavy implementation.
- Edge-function contracts remain under-specified until documented in `ARCHITECTURE.md`.

## Open questions that should not be guessed
- exact meaning and precedence of `due_date` vs `scheduled_date` and `scheduled_time`
- whether a computed `scheduled_at` should exist
- whether tasks may exist in a project without a board
- exact dismissal persistence model for synced events
- failure behavior of capture parsing and briefing generation
- how coffee-chat participant research is sourced and bounded

## Update protocol
Whenever a decision changes current state:
1. overwrite the old statement
2. do not preserve obsolete history here
3. move unresolved items to `OPEN_QUESTIONS.md` if needed

