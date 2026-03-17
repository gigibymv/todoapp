# Gigi — PRD: Design Guidelines

## 1. Design Philosophy

**Aesthetic**: Minimalist warmth. Inspired by Apple's design language — every pixel intentional, every element earns its place. The UI should feel like a premium leather notebook, not a SaaS dashboard.

**Tone**: Calm, confident, intelligent. No playfulness, no gamification, no emoji overload. Restrained use of color — orange accent is surgical.

## 2. Typography

| Role | Spec |
|------|------|
| Font family | Inter Tight (all weights 100–900) |
| Headings | 16–24px, `font-bold`, `tracking-[-0.04em]` to `[-0.02em]` |
| Body text | 13px, normal weight |
| Labels / meta | 10–11px, uppercase, `tracking-wider`, `text-muted-foreground` |
| Monospace / codes | 10px, medium weight, uppercase, `bg-foreground/5` pill |

**Rule**: No other font is ever used. Inter Tight is the brand.

## 3. Color System

### Light Mode
| Token | HSL | Usage |
|-------|-----|-------|
| `--background` | `37 14% 90%` | Page background — warm paper |
| `--foreground` | `0 0% 7%` | Primary text — near black |
| `--card` | `37 14% 93%` | Cards, elevated surfaces |
| `--secondary` | `37 10% 86%` | Input backgrounds, subtle fills |
| `--muted-foreground` | `0 0% 45%` | Secondary text |
| `--accent` | `24 85% 55%` | Orange — CTAs, active states, priority |
| `--border` | `37 8% 82%` | Subtle warm borders |
| `--destructive` | `0 72% 51%` | Errors, delete actions |

### Dark Mode
| Token | HSL | Usage |
|-------|-----|-------|
| `--background` | `30 6% 8%` | Deep charcoal |
| `--foreground` | `37 14% 90%` | Light text |
| `--card` | `30 6% 10%` | Slightly raised |
| `--secondary` | `30 6% 14%` | Inputs, fills |
| `--accent` | `24 85% 55%` | Same orange (consistent) |

### Context Colors
| Context | Token | HSL |
|---------|-------|-----|
| Work | `--gigi-work` | `214 82% 51%` (blue) |
| MBA | `--gigi-mba` | `271 69% 49%` (purple) |
| Personal | `--gigi-personal` | `152 69% 31%` (green) |
| Finance | `--gigi-finance` | `24 85% 55%` (orange) |
| Health | `--gigi-health` | `142 64% 40%` (teal) |

**Rule**: Never use raw Tailwind colors (`text-red-500`, `bg-blue-200`). Always reference design tokens.

## 4. Spacing & Layout

- **Border radius**: `0.625rem` (10px) — uniform across cards, inputs, buttons
- **Page padding**: `px-5 py-6` mobile, `px-10 py-8` desktop
- **Card padding**: `p-3` to `p-4`
- **Gap between elements**: `gap-2` to `gap-4` (8–16px)
- **Section spacing**: `space-y-4` to `space-y-6`

## 5. Components

### Cards (Task, Event)
- Background: `bg-card` with `border border-border`
- Hover: subtle lift or background shift
- Active/selected: `ring-1 ring-accent/30`
- Priority dot: 6px circle, color from `--gigi-p{n}` tokens

### Buttons
- Primary: `bg-accent text-accent-foreground` (orange)
- Secondary/Ghost: `bg-secondary` or transparent
- Size: `h-10` standard, `h-12` for prominent CTAs
- Active feedback: `active:scale-95`

### Inputs
- Background: `bg-secondary border-0`
- Height: `h-10`
- Text: `text-[13px]`
- Focus: `ring-2 ring-accent/30`

### Navigation
- Desktop sidebar: 56px collapsed → 176px expanded (hover)
- Active indicator: 3px orange bar (left on desktop, top on mobile)
- Icons: 18px, `strokeWidth` 1.5 normal / 2 active
- Labels: 13px, hidden when collapsed

### Floating Action Button
- 48px circle, `bg-accent`, bottom-right
- Mobile: `bottom-20` (above nav), Desktop: `bottom-6`
- Icon: Plus, 20px, `strokeWidth` 2.5

## 6. Motion & Transitions

- **Duration**: 200–300ms for UI transitions
- **Easing**: `ease-out` for expansions, `ease-in-out` for state changes
- **Entry animations**: `animate-fade-in` for page content
- **Scale feedback**: `active:scale-95` on tappable elements
- **Sidebar**: `transition-all duration-300 ease-out`

## 7. Iconography

- **Library**: Lucide React exclusively
- **Size**: 18px nav, 14px inline, 12px compact
- **Stroke**: 1.5 default, 2 for active/emphasis
- **Brand icon**: `Type` (typewriter) in accent color

## 8. Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| < 768px (md) | Mobile: bottom nav, no sidebar, no DnD, FAB above nav |
| ≥ 768px | Desktop: sidebar, DnD enabled, FAB bottom-right |

## 9. Accessibility

- All interactive elements have visible focus states
- Color is never the sole differentiator (text labels accompany color indicators)
- Touch targets ≥ 44px on mobile
- Proper `aria-label` on icon-only buttons
