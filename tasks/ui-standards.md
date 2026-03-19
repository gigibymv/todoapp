# Gigi UI Standards

## Purpose
This document defines Gigi's visual rules for layout, typography, color, spacing, component patterns, and responsive behavior.
It is the visual source of truth for this project. Use it together with `CLAUDE.md`, not instead of it.

---

## Design System

### Token source
All design tokens are CSS custom properties defined in `src/index.css`.
Tailwind is configured in `tailwind.config.ts` to consume these variables.
**There is no separate tokens.js.** Do not create one.

### Theme
Gigi has two themes — light and dark — both warm-toned.
- **Light:** warm paper background (`hsl(37 14% 90%)`), near-black ink (`hsl(0 0% 7%)`)
- **Dark:** warm dark ground (`hsl(30 6% 8%)`), warm cream text (`hsl(37 14% 90%)`)
- **Accent:** orange across both themes (`hsl(24 85% 55%)`)

Use `bg-background`, `text-foreground`, `bg-card`, `bg-secondary`, `text-muted-foreground` — not hardcoded HSL or hex values.

---

## Color Rules

### Context colors
Each task context has a dedicated Tailwind token:

| Context | Token | Hue | Notes |
|---------|-------|-----|-------|
| Work | `gigi-work` | Blue | |
| MBA | `gigi-mba` | Purple | |
| Personal | `gigi-personal` | Green (dark) | |
| Finance | `gigi-finance` | Orange | **Same hue as accent** — use carefully |
| Health | `gigi-health` | Green (bright) | Close to Personal — distinguish by saturation |
| Legal | `muted-foreground` | Gray | No dedicated token |

Use context colors **only** for context indicators (dots, left-border accents, subtle backgrounds via `/5` or `/10` opacity). Never use them as primary UI chrome.

**Finance = Accent conflict:** `gigi-finance` and `accent` share the same hue. Do not place finance-context indicators next to urgency/action elements that also use `accent`. Add visual separation (different shape, label, or placement).

### Priority colors
| Priority | Token | Meaning |
|----------|-------|---------|
| p1 | `gigi-p1` (red) | Urgent |
| p2 | `gigi-p2` (orange = accent) | High |
| p3 | `gigi-p3` (muted) | Normal |
| p4 | `gigi-p4` (faded) | Low |

p1 is red. p2 shares the accent color. Do not display p2 in a way that makes it look like an error state.

### Opacity modifiers
Standard opacity steps for token-based overlays:
- `/5` — barely-there wash (use sparingly, almost invisible)
- `/8` — very subtle (avoid — nearly invisible; prefer `/10`)
- `/10` — soft wash (default for context backgrounds)
- `/15` — medium (hover states, chips)
- `/20` — stronger (selected states)
- `/30` — visible fill (timeline blocks, alert backgrounds)

Never use `/8` — it produces ~3% opacity which is visually indistinguishable from transparent.

---

## Typography

### Font
**Inter Tight** across all text. Do not introduce a second typeface.
Body default tracking: `-0.011em`. Headings: `-0.025em`.

### Type scale (actual usage in codebase)

| Class | Size | Role |
|-------|------|------|
| `text-2xl` | 24px | Page title (h1) |
| `text-xl` | 20px | Section title, kanban header |
| `text-base` / `text-sm` | 16px / 14px | Dialog titles, body prose |
| `text-[13px]` | 13px | Primary task text, input fields, card main text |
| `text-[12px]` | 12px | Secondary task metadata, table cells |
| `text-[11px]` | 11px | Labels, timestamps, section sub-headers |
| `text-[10px]` | 10px | Micro-badges, priority labels, pill text |
| `text-[9px]` | 9px | Timeline hour marks only — avoid elsewhere |

**Do not introduce sizes outside this scale.** If a new size is needed, choose the nearest step and document why.

`text-[9px]` is only acceptable in the timeline hour ruler where screen real-estate is extremely constrained. Do not use it for interactive elements or meaningful content.

### Section labels
Use this pattern consistently for all section headers:
```
text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground
```
Do not invent per-screen variants of section labels.

---

## Spacing

Tailwind's default spacing scale applies (`p-1` = 4px, `p-2` = 8px, `p-3` = 12px, etc.).

### Common patterns
| Pattern | Value | Usage |
|---------|-------|-------|
| Page horizontal padding | `px-5 md:px-10` | All page content |
| Page vertical padding | `py-6 md:py-8` | All page content |
| Card internal padding | `px-4 py-3` | Standard cards |
| Task item padding | `px-3 py-3` (normal) / `py-1.5` (compact) | TaskCard |
| Section gap | `mb-6` | Between page sections |
| Item gap in list | `space-y-px` or `space-y-0.5` | Task lists |

Do not use negative margins to fix alignment. Fix the structural spacing instead.

---

## Layout

### Page max widths
| Surface | Max width |
|---------|-----------|
| Single-column pages (Tasks, Settings, Coffee Chats) | `max-w-xl mx-auto` |
| Today (with sidebar timeline) | `max-w-6xl mx-auto` |
| Calendar / Projects | `max-w-4xl` / `max-w-5xl mx-auto` |

Do not widen single-column task pages. The `max-w-xl` constraint is intentional for readability.

### Sidebar (desktop)
- Collapsed: `w-14`. Expanded on hover: `w-44`.
- Nav items appear directly after the logo. Settings/profile appears directly below nav items (not pushed to bottom).
- Do not add `flex-1` between nav and settings — it pushed settings off-screen for users with many nav items.

### Mobile bottom nav
Fixed at bottom, `z-50`, `backdrop-blur-xl`. Always visible on mobile.
FAB (floating action button) sits at `bottom-20 right-4` on mobile, `bottom-6 right-6` on desktop.

### Capture bar
Sticky top bar, `z-40`, `backdrop-blur-xl`. Always visible. Max width `max-w-xl` centered.

---

## Component Patterns

### TaskCard
- Swipe right → complete (green flash). Swipe left → action tray.
- Desktop: hover shows edit/archive/delete actions (hidden on mobile via `hidden md:flex`).
- `compact` mode: reduced padding, no metadata row.
- Context dot is `w-1.5 h-1.5 rounded-full` with `bg-gigi-{context}`.
- Overdue dates shown in `text-destructive`. Normal dates in `text-muted-foreground`.

### Dialogs
- `sm:max-w-lg` for edit dialogs. `sm:max-w-md` for detail/confirm dialogs.
- Use shadcn `Dialog` + `DialogContent` + `DialogHeader`.

### Filters / pills
Small toggle pills:
```
text-[11px] px-2.5 py-1 rounded-md capitalize transition-colors
active: bg-foreground text-background font-medium
inactive: text-muted-foreground hover:text-foreground
```

### Section labels (inside cards/briefs)
```
text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1.5
```

### Empty states
Center-aligned, `py-12` to `py-20`, icon at `/30` opacity, short description, optional CTA button.

### Loading skeletons
`h-12 rounded-lg bg-secondary animate-pulse` — match the height of what they replace.

---

## Mobile vs Desktop Rules

- **Desktop:** sidebar nav, hover actions on cards, drag-and-drop on boards and timeline.
- **Mobile:** bottom nav, swipe gestures on TaskCard, MoveMenu button (⋮) instead of drag.
- Do not implement mobile and desktop as identical layouts. Adapt intentionally.
- Touch targets must be minimum **44px** in height for any interactive element on mobile. Buttons under the 44px minimum must be wrapped in a larger hit area.
- Never use `cursor-grab` or drag interaction as the **only** way to perform an action on mobile.
- Horizontal-scroll containers (`overflow-x-auto`) are acceptable for dense grid views (Calendar grid, kanban columns) but must be explicitly set — never let content overflow invisibly.

---

## Animation

Use the defined keyframes from `tailwind.config.ts`:
- `animate-fade-in` — new content appearing (lists, dialogs)
- `animate-scale-in` — popovers, dropdowns
- `animate-slide-up` — bottom sheets, toasts
- `animate-pulse-dot` — live section indicator on Today page

Do not add raw CSS `@keyframes` inline for one-off effects. Use the defined tokens.

---

## Forbidden Behaviors

- Do not hardcode HSL/hex colors. Use CSS variable-based Tailwind tokens.
- Do not introduce font sizes outside the defined scale.
- Do not use `bg-*/8` opacity — it is nearly transparent. Use `/10` minimum.
- Do not use `border-l-3` — it is not a Tailwind built-in and silently does nothing. Use `border-l-2` or `border-l-4`, or `border-l-[3px]` as an arbitrary value.
- Do not use negative margins to fix spacing collisions.
- Do not skip mobile verification after desktop-only changes.
- Do not make the Settings button unreachable by using `flex-1` spacers in the sidebar.
- Do not add `flex-1` between nav items and the settings button in the sidebar.

---

## Verification Checklist

After any UI change:

**Layout**
- [ ] Does anything overlap or clip?
- [ ] Do surrounding elements still align correctly?
- [ ] Does the container expand/reflow as expected?

**Typography**
- [ ] Is the text role consistent with similar text elsewhere?
- [ ] Are line breaks readable?
- [ ] Is any text below 10px (except timeline hour marks)?

**Color**
- [ ] Is any context color causing confusion with the accent or another context?
- [ ] Are opacity modifiers >= `/10`?

**Responsive**
- [ ] Verified on desktop?
- [ ] Verified on mobile?
- [ ] Are all interactive elements ≥ 44px tall on mobile?
- [ ] Does any horizontal overflow need `overflow-x-auto`?

**Interaction**
- [ ] Are mobile users not locked out of any action?
- [ ] Were any duplicate controls introduced?
