# Gigi UI Audit

Audited against: `tasks/ui-standards.md`, `CLAUDE.md`
Scope: All active screens and shared components.
Last updated: 2026-03-18

---

## Systemic Issues (cross-component)

### S1. `border-l-3` used in CalendarDayTimeline — silently invalid — FIXED (2026-03-18)
- **Status:** Fixed. Replaced with `border-l-[3px]`.

### S2. Finance context color = Accent color — FIXED (2026-03-18)
- **Status:** Fixed. `--gigi-finance` changed from `24 85% 55%` (same as accent) to `38 90% 48%` (amber/gold).

### S3. `bg-accent/8` opacity is nearly invisible — FIXED (2026-03-18)
- **Status:** Fixed. Changed to `bg-accent/15` background and `border-accent/20` border.

---

## AppLayout

### AL1. Sidebar settings button position — FIXED (2026-03-18)
- **Status:** Fixed. Removed `flex-1` from `<nav>`. Settings button now sits directly below nav tabs.

### AL2. No active visual state for Coffee Chats in mobile bottom nav
- **File:** `src/components/AppLayout.tsx`
- **Issue:** The mobile bottom nav has 5 items (Today, Calendar, Tasks, Projects, Coffee Chats) + Settings. On smaller phones (320–375px wide), 6 icons in a horizontal row become very compressed (~53px each). Labels truncate or overlap.
- **Severity:** MEDIUM
- **Fix:** Either hide labels on very small screens and rely on icons only, or reduce to 4 items in the bottom nav with Coffee Chats accessible from a secondary location.

---

## TaskCard

### TC1. `boardName` prop accepted but never rendered
- **File:** `src/components/TaskCard.tsx`
- **Issue:** `boardName?: string` is in the props interface but the component never renders it. Board context is displayed in the *parent* (Tasks.tsx, Today.tsx) as a pill below the card, not inside the card itself. This is inconsistent — some parents show it, some don't. The prop is misleading.
- **Severity:** MEDIUM
- **Fix:** Either render `boardName` inside TaskCard (below the metadata row) or remove the prop and always render board info in the parent. Pick one pattern.

### TC2. Swipe gesture conflicts with vertical scroll on Android
- **File:** `src/components/TaskCard.tsx`
- **Issue:** Framer Motion `drag="x"` with `touch-pan-y` should allow vertical scroll, but on some Android browsers the horizontal drag capture threshold fires before the scroll recognizer, causing tasks to drag when the user intends to scroll.
- **Severity:** MEDIUM
- **Fix:** Increase the drag threshold or add `dragMomentum={false}` and `dragElastic={0}`. Consider disabling swipe entirely on desktop since hover actions are available there.

### TC3. Action tray after swipe-left has inconsistent button sizing
- **File:** `src/components/TaskCard.tsx`
- **Issue:** The swipe-left action tray shows Reschedule, Edit, Archive, Delete, Cancel as `p-2 rounded-lg` buttons. These are approximately 36×36px — under the 44px minimum touch target.
- **Severity:** MEDIUM
- **Fix:** Change to `p-3` or add `min-h-[44px] min-w-[44px]` to each action button.

---

## UniversalCapture

### UC1. `inline` prop is accepted but never used
- **File:** `src/components/UniversalCapture.tsx`
- **Issue:** `CaptureForm` accepts `inline?: boolean` (default `true`) but the prop is never referenced in the render logic. It was likely added for future layout differentiation but is currently dead.
- **Severity:** LOW
- **Fix:** Remove the prop and its default value, or implement the intended layout difference.

### UC2. Section picker chips below minimum touch target height
- **File:** `src/components/UniversalCapture.tsx`
- **Issue:** Section chips (`Do`, `Maybe`, `Skip`) use `min-h-[44px]` ✓ and `min-w-[52px]` ✓ — these are fine. Time and date pickers also have `min-h-[44px]` ✓. This is correct.
- **Severity:** None — compliant.

### UC3. Project/Board picker dropdowns have no keyboard navigation
- **File:** `src/components/UniversalCapture.tsx`
- **Issue:** The custom project and board pickers are `<div>` with `<button>` children, but typing in the search input doesn't move focus to the list. There is no `aria-listbox`, `role="option"`, or keyboard arrow navigation.
- **Severity:** MEDIUM
- **Fix:** Either use the shadcn `Command` component (which has built-in keyboard navigation) or add `onKeyDown` arrow-key handling to the picker.

---

## CalendarDayTimeline

### CDT1. `border-l-3` silently invalid — see S1 above
- **Status:** Tracked under S1.

### CDT2. Hour labels use `text-[9px]` — below minimum for content text
- **File:** `src/components/CalendarDayTimeline.tsx`
- **Issue:** Hour ruler labels (`6 AM`, `9 AM`, etc.) use `text-[9px]`. Per standards, 9px is only acceptable here given extreme space constraints, but on low-DPI screens this may be illegible.
- **Severity:** LOW
- **Note:** Acceptable given the space constraint. Monitor user feedback.

### CDT3. Drag-to-reschedule has no visual affordance for non-touch users
- **File:** `src/components/CalendarDayTimeline.tsx`
- **Issue:** Task blocks show `cursor-grab` on hover, but there is no tooltip or label indicating they are draggable. Users may not discover the reschedule-by-drag feature.
- **Severity:** LOW
- **Fix:** Add a drag handle icon on hover, or a tooltip "Drag to reschedule."

---

## CalendarView

### CV1. Grid view has no mobile column layout
- **File:** `src/pages/CalendarView.tsx`
- **Issue:** The 7-column weekly grid uses `minWidth: 560` inside an `overflow-x-auto` wrapper (added 2026-03-18). This is acceptable as a short-term solution but provides a poor mobile experience — users horizontally scroll a 7-column grid that is too small to read.
- **Severity:** MEDIUM
- **Fix (future):** On mobile, switch grid to a 1-day or 3-day view, or default to agenda view on mobile.

### CV2. Week navigation uses `new Date()` directly in render
- **File:** `src/pages/CalendarView.tsx`
- **Issue:** `const viewStart = addDays(new Date(), weekOffset * 7)` is computed on every render. If the component stays mounted across midnight, `viewStart` becomes stale (shows yesterday as "today"). Minor.
- **Severity:** LOW
- **Fix:** Derive `viewStart` from a memoized base date or re-compute on focus/tab-visible.

---

## Tasks Page

### TP1. Segmented date sections can show overlapping tasks
- **File:** `src/pages/Tasks.tsx`
- **Issue:** A task appears in "Today" if `brief_action === 'do'` OR if its date matches today. A task with `brief_action === 'do'` but a future `scheduled_date` will appear in both Today (via `brief_action`) and potentially Later (via date). The `isTaskToday` predicate needs to take precedence.
- **Severity:** MEDIUM
- **Fix:** Ensure tasks are exclusive across segments — a task matched by `isTaskToday` should be excluded from Later/Someday regardless of its date.

### TP2. Quick-add creates tasks with no AI parse
- **File:** `src/pages/Tasks.tsx`
- **Issue:** The inline quick-add input creates tasks with hardcoded `priority: 'p3'`, `context: 'personal'`, `energy_type: 'shallow'`. There is intentionally no AI parse for the quick-add (it's meant to be instant). This is by design, but users may not realize the capture bar at the top does parse.
- **Severity:** LOW — design choice, not a bug.

---

## Projects Page

### PP1. Kanban board has no mobile adaptation — FIXED (2026-03-18)
- **Status:** Fixed. Wrapped kanban in `overflow-x-auto` container; grid has `min-w-[480px]` so columns remain readable on scroll.

### PP2. Delete project doesn't warn about task deletion
- **File:** `src/pages/Projects.tsx`
- **Issue:** `confirm('Delete this project and all its tasks?')` is used — correct text. The confirmation is browser-native, not a styled dialog. Minor UX inconsistency.
- **Severity:** LOW

---

## Coffee Chats

### CC1. Manual brief has no duplicate guard
- **File:** `src/pages/CoffeeChats.tsx`
- **Issue:** When adding a person manually (no `calendar_event_id`), rapid double-clicks on "Generate Brief" create multiple rows because there is no `existing_brief_id` in the initial creation flow. The `handleManualSubmit` closes the dialog and clears the form, but if the user submits before the dialog closes, a second insert can fire.
- **Severity:** MEDIUM
- **Fix:** Disable the Generate button while `preparing === 'manual'` ✓ (already done). Additionally, debounce or set a short-circuit on the submit handler.

### CC2. `eventsWithoutBrief` filter uses string equality on `calendar_event_id`
- **File:** `src/pages/CoffeeChats.tsx`
- **Issue:** `briefs.some(b => b.calendar_event_id === ev.id)` — this is correct. However, if a brief was created for the event but later regenerated (new row — before the upsert fix), duplicate briefs meant events stayed in the "needs prep" list. Now fixed with the upsert change.
- **Status:** Resolved as a side-effect of the upsert fix (2026-03-18).

### CC3. No empty state for "no upcoming coffee chats" when `eventsWithoutBrief` is empty
- **File:** `src/pages/CoffeeChats.tsx`
- **Issue:** When `eventsWithoutBrief.length === 0`, the "Upcoming Meetings" section is simply absent. There is no message explaining why — users who have no calendar connected, or no meetings in the next 7 days, see just the briefs list with no context.
- **Severity:** LOW
- **Fix:** Add a subtle note when the section is empty: "No upcoming meetings detected. Add a person manually or connect a calendar."

---

## Settings

### ST1. Timezone field is free-text with no validation — FIXED (2026-03-18)
- **Status:** Fixed. Replaced plain `<Input>` with a `<Popover>` + `<Command>` searchable combobox over `Intl.supportedValuesOf('timeZone')`. Only valid IANA timezones can be selected; no free-text entry.

### ST2. Work hours save on every `onChange`, not on blur — FIXED (2026-03-18)
- **Status:** Fixed. Both `work_hours_start` and `work_hours_end` inputs changed to `onBlur`.

---

## Summary

### By severity

| Severity | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| HIGH | 4 | 4 | 0 |
| MEDIUM | 10 | 4 | 6 |
| LOW | 7 | 0 | 7 |
| **Total** | **21** | **8** | **13** |

### Fixed (8)
AL1 (settings button position), CC2 (brief duplicate side-effect), S1 (border-l-3), S2 (finance color), S3 (bg-accent/8), PP1 (kanban mobile), ST1 (timezone combobox), ST2 (work hours onBlur)

### Remaining HIGH
All HIGH items resolved as of 2026-03-18.

### Top priority fixes — all done
| Priority | Fix | IDs resolved | Status |
|----------|-----|-------------|--------|
| 1 | Replace `border-l-3` with `border-l-[3px]` | S1, CDT1 | ✅ Done |
| 2 | Differentiate `gigi-finance` hue from accent | S2 | ✅ Done |
| 3 | Validate timezone input (IANA combobox) | ST1 | ✅ Done |
| 4 | Add `overflow-x-auto` + mobile layout to Projects kanban | PP1 | ✅ Done |
| 5 | Fix work hours save from `onChange` to `onBlur` | ST2 | ✅ Done |
| 6 | Replace `bg-accent/8` with `bg-accent/15` | S3 | ✅ Done |
