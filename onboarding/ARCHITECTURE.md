# ARCHITECTURE.md

## Purpose
This file translates product intent into implementation contracts. It should stay close to reality and be updated when data shape or responsibility boundaries change.

## System boundaries

### Client
Responsible for:
- route rendering
- auth/session-aware navigation
- local interaction state
- optimistic UI where safe
- invoking typed backend helpers and edge functions

### Database
Responsible for:
- persistence
- relational integrity
- user data isolation with RLS
- indexes and query performance
- durable feature state

### Edge functions
Responsible for:
- AI-assisted parsing and planning
- external fetch/sync logic
- privileged operations that should not live in the client
- normalization of imported external data

## Core entities

### profiles
Owns:
- display name
- timezone
- onboarding state
- deep-work preference
- work hours
- pomodoro duration
- notification preferences

### tasks
Owns:
- title and description
- status
- priority
- context
- energy_type
- scheduling/deadline fields
- project and board assignment
- completion metadata

### projects
Owns:
- project-level grouping
- active/completed/archived state
- display metadata

### project_boards
Owns:
- per-project board columns
- board order
- board identity

### task_categories / tags / task_tags
Own:
- hierarchical categories
- optional flat tags

### calendar_links
Owns:
- ICS subscriptions
- sync metadata

### calendar_events
Owns:
- normalized synced events
- source identifiers
- event timing/location fields

### briefings
Owns:
- generated Do/Maybe/Skip outputs
- energy sequence
- daily intention
- generation timestamp

### focus_sessions
Owns:
- focus timer sessions
- optional linked task
- duration/completion metadata

### meeting_briefs
Owns:
- generated coffee-chat prep content
- source event linkage

## Responsibility rules by feature

### Universal capture
Flow:
1. user enters natural language
2. client sends parse request to `parse-task`
3. edge function returns structured suggestions
4. client renders suggestion chips
5. user overrides any field as needed
6. client writes final task record

Rule: AI output is advisory only. The saved payload reflects final user-selected values.

### Today page and briefing
Flow:
1. client loads today's task candidates and calendar events
2. client loads existing briefing or requests generation
3. briefing output maps storage values to UI sections Do / Maybe / Skip
4. user interactions may update task status or section placement

Rule: UI labels may differ from stored keys, but mappings must be explicit and centralized.

### Calendar sync
Flow:
1. user saves ICS link
2. sync function fetches and parses source feed
3. event records are normalized and upserted
4. Today and Calendar pages query normalized events
5. dismissal state is stored separately from source records if dismissals are supported

Rule: never treat synced events as user-authored tasks.

### Focus mode
Flow:
1. user starts session optionally linked to task
2. local timer runs in UI
3. session result persists to `focus_sessions`

Rule: focus mode must work without introducing app-wide state complexity.

### Coffee chats
Flow should be built only after event models and participant extraction are stable.

Rule: treat this as an extension feature, not part of the foundational architecture.

## Cross-cutting rules
- Every user-owned query must be scoped by authenticated user.
- Client must never trust writable ownership fields from user input.
- Enum-like values must be shared across DB types, runtime validators, and UI controls.
- Any field that drives sorting/filtering heavily should be indexed or denormalized deliberately.
- If semantics are unresolved, do not encode them in multiple places; centralize first.

## Contracts still to define precisely
- exact tasks schema
- exact project/board assignment model
- exact briefing payload shape
- exact event dedupe keys for ICS sync
- exact dismissal storage model
- exact request/response schemas for all edge functions

