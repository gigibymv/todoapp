# Gigi — Source of Truth

> What must always be true. Validate against this file before every change.

## Invariants

### Authentication & Access
- [ ] Landing page requires passphrase `lolo` to proceed to Auth
- [ ] Users must sign up with email + password (no anonymous sign-ups)
- [ ] Email verification is required before sign-in
- [ ] Onboarding must be completed before accessing the app
- [ ] All protected routes redirect to `/welcome` if unauthenticated

### Data Isolation (RLS)
- [ ] Every table has RLS enabled
- [ ] Every table enforces `auth.uid() = user_id` on SELECT, INSERT, UPDATE, DELETE
- [ ] No user can ever read, write, or delete another user's data

### Task Model
- [ ] A task always has: `title`, `status`, `priority`, `context`, `energy_type`, `user_id`
- [ ] Valid statuses: `todo`, `in_progress`, `done`, `archived`
- [ ] Valid priorities: `p1` (urgent), `p2`, `p3`, `p4`
- [ ] Valid contexts: `work`, `mba`, `personal`, `finance`, `health`, `legal`
- [ ] Valid energy types: `deep_work`, `shallow`, `admin`, `quick_win`
- [ ] `due_date` is ISO 8601 timestamp (nullable)
- [ ] `scheduled_date` is YYYY-MM-DD string (nullable)
- [ ] `scheduled_time` is HH:MM string (nullable)

### Universal Capture
- [ ] Natural language input → AI parse via `parse-task` edge function
- [ ] AI suggestions are overridable by manual chip selection
- [ ] Manual time selection overrides AI-parsed `due_date`
- [ ] If only time is set (no date), defaults to today
- [ ] If only date is set (no time), due_date is set to 23:59:59 of that date

### Daily Briefing
- [ ] Generated via `generate-briefing` edge function
- [ ] Produces: `must_do`, `should_do`, `skip` sections + `energy_sequence` + `intention`
- [ ] Tasks can be dragged between Do/Maybe/Skip (desktop) or moved via menu (mobile)
- [ ] Completing a task in Do/Maybe marks it `done` with `completed_at` timestamp

### Calendar
- [ ] Calendars are added via ICS URL in Settings
- [ ] Events synced via `sync-calendar` edge function
- [ ] Events display on Today page timeline and Calendar page
- [ ] Events can be dismissed but not deleted (they re-sync)

### Design System
- [ ] Font: Inter Tight (exclusively)
- [ ] Background: warm gray `hsl(37, 14%, 90%)` light / `hsl(30, 6%, 8%)` dark
- [ ] Accent: orange `hsl(24, 85%, 55%)`
- [ ] All colors use HSL via CSS custom properties
- [ ] No raw color classes in components — always semantic tokens
- [ ] Border radius: `0.625rem` (10px)
- [ ] Brand mark: `Type` icon from Lucide

### Mobile
- [ ] Touch targets minimum 44px
- [ ] No drag-and-drop on mobile (scroll conflicts)
- [ ] Move menu (⋮) replaces DnD on mobile
- [ ] Bottom tab nav: Today, Calendar, Tasks, Projects, Coffee Chats, Settings
- [ ] Floating orange FAB (+) for capture

### Navigation
- [ ] Desktop: collapsible sidebar (56px → 176px on hover)
- [ ] Orange left-bar indicator on active nav item (desktop)
- [ ] Orange top-bar indicator on active tab (mobile)
- [ ] Footer "MV Intelligence © YYYY" on desktop only
