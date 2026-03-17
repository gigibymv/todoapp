# Gigi — PRD: User Journeys

## Journey 1: First-Time Access

```
Landing (/welcome)
  │  User types passphrase "lolo"
  ▼
Auth (/auth)
  │  User signs up with email + password
  │  User verifies email
  │  User signs in
  ▼
Onboarding (/onboarding)
  │  Step 1: Enter display name
  │  Step 2: Select deep-work preference (Morning/Afternoon/Evening)
  │  Step 3: Confirm timezone (auto-detected) → Finish
  ▼
Today (/)
  │  App is ready. Empty state with briefing prompt.
```

## Journey 2: Returning User

```
Landing (/welcome)
  │  Passphrase "lolo"
  ▼
Auth (/auth)
  │  Sign in with email + password
  ▼
Today (/)
  │  Daily briefing loads (or generates if not yet created)
  │  Shows Do / Maybe / Skip sections
  │  Calendar events in timeline
```

## Journey 3: Quick Task Capture

```
Any page
  │  Tap floating orange (+) FAB
  ▼
Capture Dialog opens
  │  Type natural language: "Review case study for FIN by Thursday 4pm"
  │  AI parses → shows suggestion chips:
  │    [Context: MBA] [Priority: P2] [Energy: Deep Work] [Due: Thu 4pm]
  │  User can override any chip by tapping
  │  User can independently set date (📅) and time (🕐)
  │  User can assign to project / board
  │  Tap Send (→)
  ▼
Task created → toast confirmation
  │  Task appears in appropriate section
```

### Inline Capture (Desktop)
```
Top bar on any page
  │  Type directly in the capture input
  │  Same AI parsing + chip flow
  │  Press Enter or click Send
  ▼
Task created inline → input clears
```

## Journey 4: Daily Triage (Today Page)

```
Today (/)
  │  Morning: AI briefing auto-generates
  │  Shows 3 sections:
  │
  ├─ DO (must_do)
  │    Tasks AI thinks you should do today
  │    Orange completion ring shows progress
  │
  ├─ MAYBE (should_do / backlog)
  │    Lower priority, could be done today
  │
  └─ SKIP
       Tasks AI suggests deferring

  Desktop: Drag tasks between sections
  Mobile: Tap ⋮ → Move to Do / Maybe / Skip

  Completing a task:
    Tap checkbox → task fades out → marked done
    Progress ring updates
```

## Journey 5: Task Management

```
Tasks (/tasks)
  │  Full list of all non-archived tasks
  │  Filter by context, priority, status
  │  Tap task → TaskEditDialog opens
  │
  ▼ Edit Dialog
  │  Change: title, description, location, context,
  │  priority (urgent toggle), energy, duration,
  │  due date, recurrence, category
  │  Save → updates task
  │  Delete → removes task
```

## Journey 6: Project & Board Management

```
Projects (/projects)
  │  View all active projects
  │  Create new project (name, color, icon)
  │  Tap project → see boards
  │
  ├─ Boards (Kanban columns within project)
  │    Create boards (e.g., "To Do", "In Progress", "Done")
  │    Tasks assigned to board show in columns
  │
  └─ Assign tasks to project/board via Capture or Edit dialog
```

## Journey 7: Calendar Integration

```
Settings (/settings)
  │  Add Calendar section
  │  Enter name + ICS URL → Save
  │  Tap Sync → events fetched via edge function
  ▼
Today (/) or Calendar (/calendar)
  │  Synced events appear in timeline
  │  Events show: time, title, location
  │  Can be dismissed (hidden from today view)
```

## Journey 8: Focus Mode

```
Any task card
  │  Tap "Focus" / navigate to /focus
  ▼
Focus Mode (/focus)
  │  Full-screen timer (no nav, no distractions)
  │  Pomodoro duration from profile settings
  │  Linked to specific task (optional)
  │  Tracks completed pomodoros
  │  Session saved to focus_sessions table
```

## Journey 9: Coffee Chat Prep

```
Coffee Chats (/coffee-chats)
  │  Select upcoming calendar event with people
  │  AI researches participants via edge function
  ▼
Meeting Brief
  │  Person name, role, company
  │  Background summary
  │  Talking points
  │  Research links
```

## Journey 10: Settings & Preferences

```
Settings (/settings)
  │
  ├─ Profile: display name, timezone, deep-work preference
  ├─ Work hours: start/end time
  ├─ Pomodoro: duration setting
  ├─ Notifications: enable/disable
  ├─ Calendars: add/remove/sync ICS feeds
  ├─ AI Patterns: view learned categorization patterns
  └─ Sign out
```

## State Transitions

### Task Lifecycle
```
[created] → todo → in_progress → done → archived
                                    ↑
                        (completed via checkbox)
```

### Briefing Lifecycle
```
[none] → generated (AI) → acknowledged (user interacts)
  ↑
  └── regenerate (pull-to-refresh or manual)
```

### Onboarding Gate
```
profile.onboarding_completed === false
  → redirect to /onboarding from any protected route
profile.onboarding_completed === true
  → redirect to / from /onboarding
```
