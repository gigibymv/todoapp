# Gigi Spec Audit for Claude Code

## What was reviewed

This audit is based on the uploaded planning/specification files, not the application source code. That means this document evaluates product clarity, architectural readiness, implementation risk, and Claude Code handoff quality. It does **not** verify whether the current Lovable project already implements these decisions correctly.

Reviewed inputs:
- `plan (1).md`
- `source-of-truth (1).md`
- `prd-user-journeys (1).md`
- `prd-design.md`
- `working_with_mv_guidelines.md`

---

## Executive judgment

The product direction is strong. The documentation is unusually coherent for an early-stage app. The app has a clear product thesis, clear core flows, a real visual system, and a strong set of invariants.

But the spec package is **not yet Claude-Code-ready** in its current form.

The main problem is not vision. The problem is **missing implementation contracts**. Claude Code will do much better if you give it exact schemas, route guards, edge-function contracts, folder conventions, and a ranked build order. Right now the docs describe what the app should feel like and what must be true, but they leave too much room for interpretation in the actual build.

My recommendation:
1. Keep the current docs as product/spec inputs.
2. Add a repo-level `CLAUDE.md` to tell Claude how to operate inside the codebase.
3. Add a `MEMORY.md` to persist current-state architectural decisions.
4. Add an `ARCHITECTURE.md` and `IMPLEMENTATION_PLAN.md` to bridge vision into execution.
5. Expect to revamp parts of the current docs, not because they are bad, but because they are written more like strategy/PRD artifacts than engineering control documents.

---

## File-by-file analysis

## 1. `plan (1).md`

### What is good
- Strong product thesis and clear identity.
- Reasonable initial architecture choice: React + Vite + TypeScript + Supabase/Lovable.
- Good high-level route map.
- Strong feature inventory.
- Good persistence of major decisions.

### What is weak
- It blends **vision, architecture, schema summary, navigation, and decision log** in one file.
- The database section lists tables, but not fields, relationships, constraints, or lifecycle ownership.
- Edge functions are named but not contract-defined.
- “AI gateway” is mentioned, but model selection, fallback policy, retry behavior, and cost boundaries are not specified.
- “Recent decisions” are useful, but there is no explicit “supersedes previous assumptions” language.

### Verdict
Keep it, but **downgrade it to product context**, not engineering source of truth.

### Revamp needed?
**Yes, light revamp.**
Rename its role conceptually to “master context” and stop treating it as enough for implementation.

---

## 2. `source-of-truth (1).md`

### What is good
- Best file in the bundle from an engineering-control standpoint.
- Strong invariant framing.
- Good separation of auth, RLS, task model, capture, briefing, calendar, design, mobile, and navigation.
- This is the right instinct: make non-negotiables explicit.

### What is weak
- Several invariants are still too abstract to be testable.
- Some invariants are product rules, some are UI rules, some are data rules, but they are not mapped to enforcement layers.
- Several items should be backed by database constraints or runtime validation, but the file does not say where each invariant lives.
- There is no conflict-resolution rule when docs disagree.

### Missing engineering conversions
For each invariant, Claude Code needs one of these labels:
- enforced in DB
- enforced in app logic
- enforced in UI only
- enforced in edge function
- tested but not enforced

Without that, the file is strong conceptually but weak operationally.

### Verdict
This should become the **real canonical file**, but only after being upgraded into a stricter engineering contract.

### Revamp needed?
**Yes, medium revamp.**
Not because the content is wrong, but because it needs enforcement mapping and testability.

---

## 3. `prd-user-journeys (1).md`

### What is good
- Excellent for product thinking and first-pass UX sequencing.
- Clear end-to-end flows.
- Good distinction between desktop and mobile interaction for triage.
- Good flow coverage across onboarding, capture, tasks, projects, calendar, focus, coffee chats, settings.

### What is weak
- It defines user flows, but not unhappy paths.
- No loading/error/empty-state coverage except lightly in first-use.
- No latency assumptions.
- No permissions/state branching for partial setup states.
- No explicit analytics events for key journey checkpoints.
- No references to which components own each part of the flow.

### Hidden risk
This document is clean enough that an LLM may over-assume implementation details that are not actually specified. Example: “AI parses → shows suggestion chips” sounds straightforward, but the real questions are:
- Is parse optimistic or debounced?
- Does parse happen client-side via edge function or server-side after submit?
- What is shown when parse fails?
- Is task creation blocked if parse fails?

### Verdict
Keep as UX input, but it is **not sufficient as build guidance**.

### Revamp needed?
**No full rewrite.** Add a companion execution doc instead of overloading this file.

---

## 4. `prd-design.md`

### What is good
- Strong design language.
- Very good token discipline.
- The “no raw Tailwind colors” rule is exactly the kind of thing that prevents visual drift.
- Component specs are practical enough to implement.
- Good mobile/desktop differences.
- Good accessibility baseline.

### What is weak
- Some guidelines still read as aesthetic preferences rather than tokenized implementation rules.
- There is no component inventory or state matrix.
- No formal naming convention for CSS variables, semantic tokens, or component variants.
- No dark-mode coverage for all context colors and priority states.
- No explicit spacing scale source of truth beyond examples.

### Engineering risk
Claude Code can follow this well if the codebase already has disciplined tokens. If not, it may produce partial compliance: semantic colors in some places, raw utility colors in others.

### Verdict
Strong document. This one needs the least rewriting.

### Revamp needed?
**Yes, light revamp.** Mostly convert parts into an enforceable design-system contract.

---

## 5. `working_with_mv_guidelines.md`

### What is good
- Excellent collaboration protocol.
- Strong epistemic standards.
- Very useful for another AI agent working inside the repo.
- Particularly valuable for preventing shallow agreement and weak architectural reasoning.

### What is weak
- It is collaboration-level guidance, not repo-level coding guidance.
- It does not tell Claude how to navigate this specific codebase.
- It does not define implementation guardrails, test expectations, migration policy, or edit discipline.

### Verdict
Do **not** merge this into product docs. Use it as input to a repo-specific `CLAUDE.md`.

### Revamp needed?
**No rewrite needed.** It should be referenced, not repurposed.

---

## Cross-document consistency check

## What is internally consistent

These points align well across the docs:
- Product identity and brand direction
- Warm minimalist design system
- Password-gated landing -> auth -> onboarding -> app
- Today page as primary operating surface
- AI-powered capture and briefing
- Mobile behavior differences
- Core contexts and energy taxonomy
- Calendar sync via ICS

## What is underspecified or inconsistent enough to matter

### 1. `due_date` vs `scheduled_date` / `scheduled_time`
This is the biggest modeling ambiguity.

Current rule set implies:
- `due_date` is a timestamp
- `scheduled_date` is a date string
- `scheduled_time` is a time string
- manual time selection can override AI-parsed `due_date`

That is workable, but only if the semantics are explicit:
- Is `due_date` deadline semantics?
- Is `scheduled_date/time` intended-start semantics?
- Can both coexist?
- If a task has both, which one drives Today placement and calendar-style sorting?

Right now the docs imply the answer, but they do not lock it down.

**Recommendation:**
- `due_at`: optional deadline timestamp
- `scheduled_date`: optional planned day
- `scheduled_time`: optional planned start time
- `scheduled_at`: computed nullable timestamp for query ergonomics

If you keep the current model, Claude needs very explicit handling rules.

### 2. Context visibility vs valid DB values
The docs say only 3 contexts are visible in UI while 6 exist in DB. That is acceptable, but only if there is an explicit policy for:
- creation of hidden contexts
- editing tasks already assigned to hidden contexts
- analytics and filtering behavior
- whether onboarding/profile uses only visible contexts

### 3. Briefing terminology
The master plan says “Do / Maybe / Skip”; the source-of-truth says `must_do`, `should_do`, `skip`; user journeys say “DO / MAYBE / SKIP”. That is fine if one is UI language and one is storage language, but Claude needs that distinction stated once, clearly.

### 4. Project boards
The docs mention projects and boards, but there is not yet a clear statement of whether a task can exist:
- outside any project
- inside a project but outside any board
- inside one board only
- in multiple boards

The likely answer is obvious, but “obvious” is where codebase drift starts.

### 5. Calendar dismissal model
The docs say events can be dismissed but not deleted because they re-sync. That means dismissal state must live separately from synced event records. The docs imply the behavior, but they do not define the data model needed to support it.

### 6. Coffee chat prep scope
The spec says AI researches participants and produces summaries, talking points, and links. That is product-clear but implementation-vague. This feature is likely the most volatile and should not be built as if it were core-path stable.

---

## What Claude Code will struggle with unless you add missing files

Claude Code generally performs best when these things are explicit:

## 1. Repo operating rules
What files it may edit, what it must never change casually, how to handle migrations, whether to preserve generated Lovable code patterns, naming rules, testing expectations.

## 2. Data contracts
Exact table schemas, foreign keys, indexes, enums, nullable fields, derived fields, RLS policies, and how edge functions interact with them.

## 3. Execution order
What should be built first, what is blocked by backend work, and what is explicitly deferred.

## 4. “Done” definitions
What counts as complete for each feature.

## 5. Memory of current decisions
Without a memory file, LLMs regress into previous assumptions.

---

## Recommended file set for this repo

These are the key files I recommend you add immediately.

### 1. `CLAUDE.md`
Purpose: repo-level operating manual for Claude Code.

Should include:
- product summary
- non-negotiable invariants
- architecture assumptions
- file edit rules
- migration rules
- design-system rules
- coding conventions
- feature priorities
- what not to refactor opportunistically
- testing expectations

### 2. `MEMORY.md`
Purpose: current-state durable decisions.

Should include:
- settled terminology
- current task model semantics
- route ownership
- mobile constraints
- known deferrals
- active open questions
- recent superseding decisions

### 3. `ARCHITECTURE.md`
Purpose: implementation contract.

Should include:
- component boundaries
- app shell layout
- client/server responsibilities
- edge function contracts
- database/entity relationships
- data flow by feature

### 4. `IMPLEMENTATION_PLAN.md`
Purpose: build order for Claude.

Should include:
- phase breakdown
- critical path
- dependencies
- acceptance criteria per phase
- explicit deferrals

### 5. `SCHEMA.md`
Purpose: human-readable schema contract.

Should include:
- every table
- every field
- type
- nullability
- constraints
- indexes
- ownership notes
- lifecycle notes

### 6. `OPEN_QUESTIONS.md`
Purpose: isolate unresolved architecture decisions so Claude does not silently invent answers.

---

## What should be revamped before heavy Claude Code usage

## Revamp immediately

### A. Task scheduling semantics
This is the most important one.
Lock the meaning of:
- due date
- scheduled date
- scheduled time
- task ordering on Today
- defaulting behavior
- overdue behavior
- conflict between due and scheduled values

### B. Edge function contracts
For each function, define:
- input payload
- output payload
- auth expectations
- timeout/retry behavior
- failure behavior
- idempotency requirements

Especially for:
- `parse-task`
- `generate-briefing`
- `sync-calendar`
- `sync-all-calendars`
- `prepare-coffee-chat`

### C. RLS policy inventory
Saying “RLS on every table” is directionally good but not enough. Claude needs exact policy patterns per table, especially for joins, inserts, updates, and any service-role edge-function behavior.

### D. Project and board ownership model
State explicitly whether boards are optional, unique per project, reorderable, deletable, and whether deleting a board unassigns or archives tasks.

## Revamp soon, but not before first implementation pass

### E. Calendar sync data model
You need explicit identifiers, dedupe rules, refresh semantics, dismissed-event storage, and timezone normalization.

### F. Design token enforcement
Translate design guidance into concrete token names and linter/review rules.

### G. Error/loading/empty states
Especially for onboarding, capture parse failure, empty Today, calendar sync failures, and briefing generation failures.

---

## Suggested build order for Claude Code

## Phase 1 — Foundation
- App shell
- Auth gates
- Onboarding gate
- Design tokens
- Core route scaffolding
- Profiles table contract

## Phase 2 — Tasks core
- Task schema and migrations
- Task CRUD
- Tasks page
- Edit dialog
- Context/priority/energy controls
- Due/schedule semantics

## Phase 3 — Universal capture
- Capture UI
- Parse-task edge function contract
- Manual override flow
- Inline + modal variants

## Phase 4 — Today page and briefing
- Today query model
- Briefing generation
- Do/Maybe/Skip rendering
- Completion behavior
- Mobile move menu
- Desktop DnD last

## Phase 5 — Projects and boards
- Projects CRUD
- Boards CRUD
- Task assignment
- Board rendering

## Phase 6 — Calendar sync
- ICS link storage
- Sync functions
- Event persistence
- Timeline rendering
- Dismiss model

## Phase 7 — Focus mode
- Focus sessions
- Task linkage
- Minimal full-screen mode

## Phase 8 — Coffee chats
- Build only after event and participant models are stable

This sequencing matters. Building coffee chats too early is a mistake.

---

## Hard truths / pushback

## 1. The feature set is ambitious for a first Claude-driven implementation
You are trying to build:
- tasks
- AI capture
- AI briefing
- projects/boards
- calendar sync
- focus mode
- coffee chat research
- onboarding/auth/security
- multi-device behavior

That is not a small v1. It is a product platform. If Claude is working from ambiguous docs, quality will degrade fast.

## 2. Coffee chats is not core-path MVP
It is useful, but it is the easiest place to burn time and introduce messy external-dependency behavior. It should be explicitly deferred unless the base productivity loop is already solid.

## 3. The docs over-index on product polish relative to implementation precision
That is normal from a founder/spec perspective. But for Claude Code, ambiguous architecture is more dangerous than incomplete polish.

## 4. “Use Claude Code” is not the risk; “use Claude Code with under-specified contracts” is the risk
The model can move fast. The real issue is whether you constrain it tightly enough.

---

## Final recommendation

Use Claude Code, but do **not** hand it only the current files.

Hand it at minimum:
- `CLAUDE.md`
- `MEMORY.md`
- `ARCHITECTURE.md`
- `IMPLEMENTATION_PLAN.md`
- `SCHEMA.md`
- the current product docs

The current docs are a strong strategic base. They are not yet a sufficient engineering operating system.

