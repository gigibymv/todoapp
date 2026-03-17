# OPEN_QUESTIONS.md

## High priority

### 1. Task time semantics
- Is `due_date` a deadline only?
- Are `scheduled_date` and `scheduled_time` planning fields only?
- Should a computed `scheduled_at` exist for sorting/querying?
- If both due and scheduled values exist, which one controls Today ordering?
- What happens when only time is present and timezone changes?

### 2. Briefing persistence model
- Are Do / Maybe / Skip assignments persisted per briefing, per task, or derived each day?
- If a user moves a task between sections, is that a task property change or a briefing-instance change?

### 3. Project/board assignment model
- Can a task exist in a project without a board?
- Is board required only if project is set?
- What happens to tasks when a board is deleted?

### 4. Calendar event dismissal
- Is dismissal tied to event instance, source event UID, or date-specific occurrence?
- Where is dismissal stored?
- How is recurring-event dismissal handled?

### 5. Edge-function contracts
Need exact typed request/response definitions for:
- `parse-task`
- `generate-briefing`
- `sync-calendar`
- `sync-all-calendars`
- `prepare-coffee-chat`

## Medium priority

### 6. Context visibility policy
- Are hidden contexts selectable anywhere in the UI?
- Should existing hidden-context tasks still be editable without exposing those contexts broadly?

### 7. Coffee-chat scope
- What external research sources are allowed?
- Are research links mandatory?
- What are the privacy and hallucination boundaries?

### 8. Empty and failure states
- What should users see when parsing fails?
- What should users see when briefing generation fails?
- What should users see when calendar sync partially fails?

