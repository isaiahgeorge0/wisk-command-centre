# Admin Console — Diagnostic Audit

**Date:** August 2026
**Purpose:** First-pass diagnostic to assess whether the admin console (`/admin/*`) is stale relative to the rest of the app. This is a findings report — no changes proposed yet.

---

## 1. What exists today

### Pages (7 sections + blog sub-routes)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin` | Overview dashboard | Stat cards (requests, pending, users, this-week signups), platform metrics bar chart, quick actions, recent lists |
| `/admin/requests` | `RequestsClient` | Filterable access-request table with approve/decline, notes editing, invite email |
| `/admin/users` | `UsersHealthClient` | User table with activity status badges, project/task counts, last sign-in, AI access toggle, subscription pills, delete, digest generation |
| `/admin/announcements` | `AnnouncementsClient` | Create/list/delete announcements with expiry dates and dismissal counts |
| `/admin/feedback` | `FeedbackClient` | Filterable feedback table with status workflow (new → reviewed → resolved → archived), admin notes |
| `/admin/blog` | `BlogListClient` | Blog post list with publish/unpublish/schedule/delete. Sub-routes for `/new` and `/[id]/edit` with full markdown editor |
| `/admin/changelog` | `ChangelogAdminClient` | Create/list/delete changelog entries (feature / improvement / fix) |

### Access control

Three-layer gate: middleware (`ADMIN_EMAIL` check on `/admin/*`), server layout (`isAdminEmail()` + redirect), and every Server Action calls `requireAdmin()`.

### Actions surface (admin/actions.ts — 1,208 lines, 27 exported functions)

Covers: access requests (CRUD + approve/decline), users (list, health view, manual create, delete with 16-table cascade), announcements (CRUD), feedback (CRUD + status workflow), platform metrics (6-section counts), AI access toggle, digest generation trigger, onboarding/personalisation reset, changelog (CRUD).

Blog actions are separate (admin/blog/actions.ts — 378 lines, 11 functions).

---

## 2. Visual staleness

### What admin does right

- **Shared UI primitives:** Uses `Card`, `Badge`, `Dialog`, `Button`, `Select`, `Input`, `Textarea` from `src/components/ui/` — same as the rest of the app.
- **Dark mode support:** Most admin components include proper `dark:` variants. Orange/amber accent states have both light and dark variants.
- **Consistent table styling:** Tables use a repeated pattern (`rounded-xl ring-1 ring-foreground/10`, `bg-muted/40` headers, `px-4 py-3` cells) that's clean if simple.

### Where admin diverges

| Area | Admin | Rest of app | Gap |
|------|-------|-------------|-----|
| **Colour system** | Hardcoded Tailwind orange/amber (`text-orange-600 dark:text-orange-400`, `bg-amber-500/10`) | Section accent tokens (`wisk-section-*`), `SECTION_COLOURS_DARK`/`_LIGHT`, `getReadableTextColor()` | Admin predates the section colour system and never adopted it |
| **Motion/animation** | Static renders. No `PageTransition`, no `ExpandableSection`, no Framer Motion `layoutId` or stagger | `PageTransition` on every section page, `StaggerList`/`StaggerItem` on card grids, `ExpandableSection` on detail cards, `motion.div` with `layoutId` on Overview cards | Admin feels noticeably less polished than the rest of the app |
| **Data display** | Tables for everything (requests, users, feedback, blog) | Card grids with hover states, section accent shadows, responsive breakpoints, drag-and-drop pipelines | Tables are fine for admin, but the styling is plainer than it needs to be |
| **Platform metrics** | Fixed `text-blue-500` / `text-rose-500` without dark variants | Semantic token colours everywhere else | Minor but visible dark-mode issue |
| **Quick actions** | Plain HTML `<select>` for user picker | Shared `Select` / `ResponsiveSelect` everywhere else | Inconsistency |
| **Inline stat cards** | Raw `div` with inline border/bg colours in `users-health-client.tsx` | Shared `Card` component everywhere else | Minor duplication |
| **Custom toast** | Inline fixed-position toast in `users-health-client.tsx` | No app-wide toast system (so this is actually ahead of the rest of the app) | n/a |

**Summary:** Admin is visually functional but noticeably behind. The gap isn't broken — it's "2024 admin panel in a 2026 app." The orange accent is fine as a deliberate admin identity, but the lack of motion and the hardcoded colours make it feel like a different product.

---

## 3. Data staleness

### What admin sees

| Data area | Visibility | Notes |
|-----------|-----------|-------|
| Access requests | Full CRUD | Working |
| Users (core) | Name, email, created_at, last sign-in | Working |
| User activity status | Active/inactive/dormant badges | Based on `last_active_at` |
| Project + task counts per user | Shown per-row | Working |
| AI access toggle | Per-user boolean | Working |
| Subscriptions per user | Package name + status as badges | Shows `ai`, `ai_pro`, `properties`, `properties_pro`, `max` |
| Platform metrics | Counts for 6 sections | projects, tasks, goals, ideas, leads, content_posts |
| Announcements | Full CRUD | Working |
| Feedback | Full CRUD + status workflow | Working |
| Blog | Full CRUD + publish/schedule | Working |
| Changelog | Full CRUD | Working |

### What admin cannot see

| Data area | Table(s) | Why it matters | Gap severity |
|-----------|----------|---------------|-------------|
| **AI token usage** | `ai_usage_log` | Can't monitor cost, can't identify heavy users, can't track per-feature spend | **High** — this is a real operational blind spot, especially with 4 paid AI tiers |
| **Properties data** | `properties`, `tenants`, `maintenance_tickets`, `rent_payments`, `certificates`, `mortgages`, `insurance` | Entire Properties package is invisible to admin. Can't see how many properties are managed, tenant counts, maintenance load | **High** — Properties is a £17–32/mo paid product with zero admin visibility |
| **AI conversations** | `ai_conversations`, `ai_conversation_messages` | Can't see conversation volume, scope distribution, or whether Winston is actually being used | **Medium** — useful for understanding engagement and debugging |
| **Notes** | `notes` | No visibility into how much the Notes feature is used | **Low** — less operationally critical |
| **Calendar events** | `calendar_events` | Not counted in platform metrics | **Low** — minor gap |
| **Morning briefing** | `morning_briefing_log` | Can't see whether briefings are generating, failing, or being read | **Medium** — given the production bug history (stale time-window gate, localhost-link incident) |
| **Away summaries** | `away_summaries` | No visibility into generation or staleness | **Low** |
| **Notifications** | `notifications` | Can't see notification volume or type distribution | **Low** |
| **Integration connections** | `user_integrations` | Can't see which users have connected Gmail/Outlook/GitHub/Vercel, or whether tokens are active | **Medium** — useful for debugging email issues and understanding Pro adoption |
| **Error monitoring** | _(none)_ | `toSafeActionError` logs real errors to console/Sentry but admin has no surface for them | **Medium** — currently requires Sentry/Vercel logs to see failures |
| **Subscription aggregates** | `user_subscriptions` | Per-user badges exist, but no breakdown of how many users are on each tier, MRR approximation, or churn visibility | **High** — basic business metric with no admin surface |
| **Stripe details** | `user_subscriptions` | No `stripe_customer_id`, `stripe_subscription_id`, or `current_period_end` shown | **Medium** — needed for debugging billing issues |

### Platform metrics gap specifically

Currently counted: `projects`, `tasks`, `goals`, `ideas`, `leads`, `content_posts` (6 sections).

Not counted: `notes`, `calendar_events`, `properties`, `tenants`, `maintenance_tickets`, `contractors`, `job_sheets`, `ai_conversations` (8+ tables).

---

## 4. Structural gaps

### Missing admin capabilities

| Capability | Description | Priority |
|-----------|-------------|----------|
| **Revenue dashboard** | Users-per-tier breakdown, approximate MRR (count × price), subscription growth/churn trend | High |
| **AI cost dashboard** | Total tokens consumed (input + output), per-feature breakdown, per-user top consumers, daily/weekly trend | High |
| **Properties overview** | Portfolio count, tenant count, maintenance ticket volume, rent payment status across all users | High |
| **Winston engagement** | Conversation count by scope (global, calendar, content, notes, per-section), messages per conversation, active conversation users | Medium |
| **Integration health** | Which users have active Gmail/Outlook/GitHub/Vercel connections, token refresh failures | Medium |
| **Morning briefing monitor** | Generation success/failure rate, delivery count, last run timestamp | Medium |
| **Full platform metrics** | Add notes, calendar_events, properties, tenants, maintenance_tickets, contractors to the existing bar chart | Medium |
| **User detail view** | Click into a user to see their full data profile (projects, subscriptions, AI usage, integrations, conversations) instead of everything crammed into a table row | Medium |
| **Error log viewer** | Surface recent `toSafeActionError` / `console.error` entries from Sentry or a local log table, filterable by action/user | Low — Sentry covers this, but in-app would be convenient |
| **Research/Research Pro prep** | When the Research package ships, admin will need visibility into research job status, Tavily/Exa API usage, background-job completion | Future — not needed until the package exists |

### What's actually fine as-is

- **Access requests flow** — complete and working.
- **Feedback workflow** — status progression, admin notes, filtering all work.
- **Blog CMS** — full editor with markdown preview, publish/schedule/draft lifecycle.
- **Changelog management** — simple CRUD, does what it needs to.
- **Announcements** — create, expire, track dismissals.
- **User management basics** — create, delete (with proper cascade), toggle AI access, trigger digest.
- **Three-layer auth gate** — solid, no gaps.

---

## 5. Summary

| Dimension | Status | One-line |
|-----------|--------|----------|
| **Visual** | Behind | Functional but noticeably plainer than the rest of the app — no motion, hardcoded colours, static tables |
| **Data** | Significantly behind | Blind to Properties (entire paid product), AI usage/costs, conversations, integrations, and subscription aggregates |
| **Structural** | Behind | No revenue visibility, no AI cost monitoring, no user detail drill-down. Core CRUD sections (requests, feedback, blog, changelog) are fine |

The admin console was adequate when the app was smaller. It has not kept pace with the Properties package, the AI billing tiers, the Winston conversation system, or the brand refresh. The CRUD sections still work; the gap is in operational visibility and visual consistency.

This report is the basis for a redesign brief — not the redesign itself.
