# IMPLEMENTATION_PLAN.md

## Goal
Ship Gigi in a sequence that protects the core productivity loop and reduces rework.

## Phase 1 — Foundation
Deliver:
- app shell
- auth flow
- password-gated landing
- onboarding gate
- design-token base
- route scaffolding

Acceptance criteria:
- unauthenticated users cannot access protected routes
- onboard-incomplete users are redirected to `/onboarding`
- semantic design tokens are in place before major UI work spreads

## Phase 2 — Task core
Deliver:
- task schema and migrations
- task CRUD
- tasks page
- task edit dialog
- typed domain constants

Acceptance criteria:
- tasks can be created, edited, completed, archived, and deleted safely
- domain values stay consistent across DB and UI
- sorting/filtering works for core fields

## Phase 3 — Universal capture
Deliver:
- capture modal
- desktop inline capture
- `parse-task` function contract
- manual override UI
- final-save pipeline

Acceptance criteria:
- user can create tasks without AI
- AI suggestions are visible but never mandatory
- manual overrides always win

## Phase 4 — Today page and briefing
Deliver:
- Today query layer
- briefing generation flow
- Do / Maybe / Skip rendering
- completion interactions
- mobile move menu

Acceptance criteria:
- Today page can function with and without an AI-generated briefing
- moving/completing tasks updates persistent state correctly
- mobile path works without drag-and-drop

## Phase 5 — Projects and boards
Deliver:
- project CRUD
- board CRUD
- task assignment to project/board
- project screens

Acceptance criteria:
- tasks can be assigned and reassigned cleanly
- board behavior is explicit, not inferred

## Phase 6 — Calendar sync
Deliver:
- calendar link storage
- sync jobs/functions
- normalized event persistence
- timeline rendering
- dismissal persistence model

Acceptance criteria:
- repeated syncs do not duplicate events
- dismissed events remain hidden according to defined rules
- event timing is normalized for timezone correctness

## Phase 7 — Focus mode
Deliver:
- timer flow
- optional task linkage
- session persistence

Acceptance criteria:
- focus sessions persist reliably
- focus mode remains simple and isolated

## Phase 8 — Coffee chats
Deliver only after calendar/event foundations are stable.

Acceptance criteria:
- participant sourcing is defined
- AI output contract is defined
- feature does not destabilize core productivity flows

## Explicit deferrals
- advanced analytics
- complex automation rules
- broad collaboration/multi-user features
- aggressive AI memory/pattern learning beyond clear MVP use cases

## Default implementation rule
When a feature depends on an unresolved semantic decision, stop expanding that feature and document the unresolved point in `OPEN_QUESTIONS.md`.

