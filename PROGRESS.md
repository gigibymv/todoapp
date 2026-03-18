# Gigi – Build Progress

## Phase Tracker

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 1 | Repo, Supabase schema, Cloudflare deploy | ✅ Done |
| 2 | Task CRUD — create, view, edit, delete, archive, filters | ✅ Done |
| 3 | Universal Capture + AI parse | ✅ Done |
| 4 | Today page + Daily Briefing | ✅ Done |
| 5 | Projects + Boards | ✅ Done |
| 6 | Calendar (ICS sync) | ✅ Done |
| 7 | Focus Mode (Pomodoro) | ❌ Killed — not needed |
| 8 | Coffee Chats | 🔧 In progress |

---

## Session Log

### 2026-03-18

#### Phase 6 — Calendar Polish
- **Fixed**: Recurring events were being collapsed to a single occurrence (dedup used `uid` only). Now keys on `uid||dtstart` so all occurrences are stored.
- **Fixed**: `dismissed`, `completed_at`, `brief_action` state was wiped on every sync (delete+insert). Now saved before delete and restored after insert.
- **Fixed**: ICS text fields (`SUMMARY`, `DESCRIPTION`, `LOCATION`) were not unescaping `\n`, `\,`, `\\`. Added `unescapeICS()`.
- **Added**: Sync button (↺) in CalendarView header — triggers sync without going to Settings.
- **Added**: Empty state in CalendarView when no calendars are connected, with link to Settings.
- **Fixed**: Grid view overflowed on mobile instead of scrolling. Wrapped in `overflow-x-auto`.

#### Phase 7 — Focus Mode
- **Killed**: Removed route and import from `App.tsx`. Removed `/focus` path guard from `AppLayout.tsx`. File kept on disk but unreachable.

#### Phase 8 — Coffee Chats
- **Fixed** (critical): `upsert({ onConflict: "id" })` was broken — `id` is auto-generated so every call inserted a new row. Regenerating accumulated duplicates. Now accepts `existing_brief_id`; uses `update` when provided, `insert` otherwise.
- **Fixed**: `key_questions` was computed in the UI but never populated (not in AI schema) and never rendered. Added to AI tool schema (3 questions with `why`). Now rendered in brief card.
- **Added**: `confidence_note` from AI response now shown at the bottom of each brief card.
- **Fixed**: Regenerate button now passes `brief.id` as `existing_brief_id` so it updates in place.
- **Fixed**: Manual brief dedup — checks existing briefs by `person_name` before inserting; passes `existing_brief_id` if found.
- **Added**: LinkedIn lookup pre-step using native Gemini API with `google_search` grounding — runs a real web search before brief generation to find a verified LinkedIn URL.

#### AI Infrastructure — Migration off Lovable Gateway (2026-03-18)
- **Migrated**: All 3 edge functions (`parse-task`, `generate-briefing`, `prepare-coffee-chat`) moved from `LOVABLE_API_KEY` + `ai.gateway.lovable.dev` to `GEMINI_API_KEY` + native Gemini API (`generativelanguage.googleapis.com`).
- **Fixed**: `response_schema` dropped (incompatible with some Gemini configurations) — using `response_mime_type: "application/json"` only with structured system prompts.
- **Fixed**: Model updated from deprecated `gemini-2.0-flash` → `gemini-2.0-flash-lite`.
- **Note**: `GEMINI_API_KEY` secret must be set in Supabase (`npx supabase secrets set GEMINI_API_KEY=...`).

#### UX / Mobile Polish
- **Fixed**: Settings/profile button in desktop sidebar was pushed to the bottom by `flex-1` on `<nav>`. Removed `flex-1` so it sits directly below the nav tabs.
- **Fixed**: `TaskEditDialog` unusable on mobile — header and Save button were off-screen. Restructured with `flex-col`, `max-h-[90dvh]`, sticky header + scrollable body + sticky footer using inline `style` to override shadcn base classes.
- **Fixed**: iOS date input overflow in task edit form — native `<input type="date">` ignores `w-full` without `min-w-0` on parent. Added `min-w-0` to each grid cell.
- **Fixed**: Date + time fields moved directly below title in TaskEditDialog.
- **Updated**: Favicon updated to T.. logo (cream background, orange serif T + two orange dots). Cache-busted with `?v=2`, added `rel="shortcut icon"` and `rel="apple-touch-icon"`.

#### UI Audit — HIGH fixes (2026-03-18)
- **Fixed S1/CDT1:** `border-l-3` → `border-l-[3px]` in `CalendarDayTimeline.tsx` (was silently 1px)
- **Fixed S2:** `--gigi-finance` changed from `24 85% 55%` (identical to accent) → `38 90% 48%` (amber/gold)
- **Fixed S3:** All-day event background `bg-accent/8` → `bg-accent/15`, border `border-accent/15` → `border-accent/20`
- **Fixed ST1:** Timezone field replaced with searchable `Command` combobox over `Intl.supportedValuesOf('timeZone')` — only valid IANA values accepted
- **Fixed ST2:** Work hours start/end save changed from `onChange` (every keystroke) → `onBlur`
- **Fixed PP1:** Projects kanban wrapped in `overflow-x-auto` with `min-w-[480px]` on the grid — horizontally scrollable on mobile

#### Drag & Drop — Killed (2026-03-18)
Diagnosed three compounding bugs in `CalendarDayTimeline` drag-to-reschedule, plus a swipe issue in `TaskCard`.

Drag-to-reschedule was fundamentally broken on mobile (browser scroll interception). Rather than continuing to fight it, drag was removed entirely. Calendar blocks and tasks now tap-to-open like events. Will be re-implemented properly in a future phase.

---

## Known Remaining Work

| Area | Item |
|------|------|
| Calendar | Recurring event expansion (RRULE) not implemented — only explicit occurrences in ICS are stored |
| Drag & Drop | CalendarDayTimeline drag-to-reschedule removed — needs proper re-implementation for a future phase |
| Coffee Chats | LinkedIn lookup relies on Gemini training data for brief content (grounding only used for URL pre-fetch) |
