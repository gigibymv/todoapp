# Gigi — Master Plan

> Persistent context document. Update this file as the product evolves.

## Vision
Gigi is a **personal productivity OS** for a high-performing individual juggling Work, MBA, and Personal life. It combines AI-powered task capture, calendar integration, daily briefings, and focus tools into one minimal, opinionated interface.

## Core Identity
- **Name**: Gigi
- **Brand mark**: Typewriter icon (`Type` from Lucide)
- **Legal entity**: MV Intelligence
- **Aesthetic**: Minimalist "Steve Jobs" warmth — Inter Tight font, warm gray palette, vibrant orange accent (`hsl(24, 85%, 55%)`), glassmorphic surfaces.
- **Access**: Password-gated landing page (passphrase: `lolo`) → Auth (email/password) → Onboarding → App.

## Architecture
| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui + custom design tokens |
| State | React Query + local state |
| Backend | Lovable Cloud (Supabase) |
| AI | Lovable AI Gateway (Gemini / GPT models) |
| Edge Functions | `parse-task`, `generate-briefing`, `sync-calendar`, `sync-all-calendars`, `prepare-coffee-chat` |

## Database Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User settings, timezone, preferences |
| `tasks` | Core task entity with priority, context, energy, scheduling |
| `projects` | Project containers (active/completed/archived) |
| `project_boards` | Kanban boards within projects |
| `task_categories` | Hierarchical category/tag system |
| `task_tags` / `tags` | Flat tagging system |
| `calendar_links` | ICS calendar subscriptions |
| `calendar_events` | Synced calendar events |
| `briefings` | Daily AI briefings (top-3, skip, intention) |
| `focus_sessions` | Pomodoro / focus tracking |
| `meeting_briefs` | AI-generated meeting prep (coffee chats) |
| `categorization_patterns` | Learned AI patterns per user |
| `weekly_reviews` | Weekly reflection data |

## Security
- RLS enabled on **every** table — `auth.uid() = user_id` policy on all CRUD operations.
- No anonymous sign-ups. Email verification required.

## Pages & Routes
| Route | Page | Description |
|-------|------|-------------|
| `/welcome` | Landing | Password gate → Auth |
| `/auth` | Auth | Sign up / Sign in |
| `/onboarding` | Onboarding | Name, deep-work preference, timezone |
| `/` | Today | Daily briefing, Do/Maybe/Skip sections, calendar timeline |
| `/tasks` | Tasks | Full task list with filters |
| `/projects` | Projects | Project + board management |
| `/calendar` | Calendar | Calendar view with synced events |
| `/coffee-chats` | Coffee Chats | AI meeting prep |
| `/focus` | Focus Mode | Pomodoro timer (no nav chrome) |
| `/settings` | Settings | Profile, calendars, patterns, sign out |

## Key Features
1. **Universal Capture** — AI-parsed task input (natural language → structured task)
2. **Daily Briefing** — AI generates Do / Maybe / Skip sections + energy sequence
3. **Drag-and-drop triage** (desktop) / Move menu (mobile)
4. **Calendar sync** via ICS URLs
5. **Focus Mode** — Pomodoro timer linked to tasks
6. **Coffee Chat prep** — AI research on meeting participants
7. **Task categories** — Hierarchical, user-created
8. **Scheduling** — Independent date + time pickers on capture and edit

## Mobile-First Principles
- Touch targets ≥ 44px
- Drag-and-drop disabled on mobile → replaced by Move menu (⋮)
- Bottom tab navigation with orange active indicator
- Floating FAB (+) for capture

## Recent Decisions
- Due date + scheduled time are independently selectable in capture
- Manual time selection overrides AI-parsed time
- DnD disabled on mobile to prevent scroll hijack
- Task categories support parent/child hierarchy
- Contexts limited to 3 visible in UI: Work, MBA, Personal (6 total in DB)
