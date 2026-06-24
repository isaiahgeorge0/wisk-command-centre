# WISK Architecture Overview

This document describes the technical architecture of the WISK platform: how the applications are structured, how data flows, and the key decisions that shape the system.

---

## 1. System Overview

WISK is delivered as **two separate applications** that share a single backend:

| Application | Domain | Purpose |
|-------------|--------|---------|
| **WISK Command Centre** | `app.wiskapp.com` | Authenticated personal business dashboard — projects, tasks, goals, content, leads, calendar, admin |
| **WISK Marketing** | `wiskapp.com` | Public marketing site — landing pages, blog, lead capture |

Both applications are deployed on **Vercel** and connect to the **same Supabase project** (PostgreSQL database, Auth, and RLS policies). The marketing site reads published content (e.g. `blog_posts`) from Supabase; the command centre is the primary write surface for operational data.

```
┌─────────────────────┐     ┌─────────────────────┐
│  app.wiskapp.com    │     │    wiskapp.com      │
│  (Command Centre)   │     │    (Marketing)      │
│  Next.js on Vercel  │     │  Next.js on Vercel  │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           └───────────┬───────────────┘
                       │
           ┌───────────▼───────────┐
           │   Supabase Project    │
           │  Auth · PostgreSQL    │
           │  RLS · Storage        │
           └───────────────────────┘
```

---

## 2. Tech Stack

### Frontend

| Technology | Role |
|------------|------|
| **Next.js 15** (App Router) | Routing, RSC, Server Actions, middleware |
| **TypeScript** | Type safety across the codebase |
| **Tailwind CSS v4** | Utility-first styling, design tokens via CSS variables |
| **React 19** | UI rendering |
| **Framer Motion** | Page transitions, onboarding, spotlight tour, expandable sections |
| **shadcn/ui** | Accessible UI primitives (Button, Dialog, Select, etc.) |
| **Lucide React** | Icon set |
| **Recharts** | Charts and data visualisation (admin metrics, analytics) |
| **@dnd-kit** | Drag-and-drop (content pipeline, leads pipeline) |

### Backend

| Technology | Role |
|------------|------|
| **Next.js Server Actions** | Mutations, form handling, revalidation |
| **Supabase** | Database, Auth, real-time capable Postgres |

### Database

- **PostgreSQL** via Supabase
- **Row Level Security (RLS)** on every application table
- **Sequential SQL migrations** in `supabase/migrations/`

### Authentication

- **Supabase Auth** — email/password, password reset, session cookies via `@supabase/ssr`
- **Invite-only access** — users request access; admin approves and sends invite

### Hosting

- **Vercel** — production and preview deployments, edge middleware

---

## 3. Application Structure

The command centre repository (`wisk-command-centre`) follows a feature-oriented layout:

```
src/
├── app/
│   ├── (dashboard)/          # Authenticated routes (layout, auth gate)
│   │   ├── page.tsx          # Overview
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── admin/
│   │   ├── properties/       # Properties package (gated)
│   │   └── ...
│   ├── portal/               # Tenant portal (separate auth)
│   ├── sign-in/
│   ├── welcome/
│   └── layout.tsx
├── components/
│   ├── [section]/            # Feature UI (projects/, tasks/, content/, …)
│   ├── layout/               # AppShell, TopNav, FAB
│   ├── ui/                   # shadcn primitives
│   └── ...
├── lib/
│   ├── [section]/            # Domain logic, types, selectors, formatters
│   ├── auth/
│   ├── supabase/
│   └── ...
├── services/                 # External API calls (Vercel, GitHub, …)
└── middleware.ts             # Auth session refresh, personalisation gate, admin gate
```

### Conventions

- **`src/app/(dashboard)/`** — All authenticated routes share the dashboard layout (AppShell, notifications, preferences).
- **`src/components/[section]/`** — Feature-specific UI components co-located by domain.
- **`src/lib/[section]/`** — Pure domain logic: types, constants, selectors, formatting — no React.
- **`src/services/`** — Wrappers for third-party HTTP APIs; keeps actions thin and testable.

---

## 4. Key Architectural Patterns

### Server Actions for all mutations

Create, update, and delete operations live in `actions.ts` files colocated with routes. Actions validate input, call Supabase, revalidate paths, and return a typed `ActionResult`.

### RSC + client split

- **Server components** — Fetch data, render static structure, pass props to clients.
- **Client components** — Interactivity: forms, drag-and-drop, optimistic UI, context consumers.

Naming convention: `page.tsx` (server) + `[section]-page-client.tsx` (client shell).

### Optimistic updates

Client shells apply immediate UI changes (e.g. task completion, lead stage change), then call server actions. On failure, state reverts to the previous snapshot.

### Three Supabase clients

| Client | Location | Use case |
|--------|----------|----------|
| **Session (anon + cookies)** | `lib/supabase/server.ts`, `client.ts` | User-scoped reads/writes under RLS |
| **Admin (service role)** | `lib/supabase/admin.ts` | Admin panel, access requests, middleware preference reads, operations that bypass RLS |
| **Middleware** | `middleware.ts` via `@supabase/ssr` | Session refresh; preference checks use service role helper where RLS timing is unreliable |

Never expose the service role key to the browser.

### Preferences provider

`PreferencesProvider` (React context) supplies field visibility and service types from `user_preferences` to the component tree — avoids prop drilling through deep feature trees.

### Quick-add context

`QuickAddProvider` coordinates the global FAB: which modal is open (project, task, goal, idea, lead, content) based on current route.

---

## 5. Database Architecture

### Row Level Security

Every user-owned table has RLS enabled with policies scoped to `auth.uid() = user_id`. Users can only read and write their own rows.

### Service role usage

The service role client bypasses RLS and is used **only** on the server for:

- Admin operations (users, access requests, announcements, blog CMS)
- Middleware personalisation checks (reliable read by `user_id`)
- Auth admin APIs (invite user, list users)

### Key table relationships

```
auth.users
    └── public.users (profile)
            ├── user_preferences (1:1)
            ├── projects
            │       ├── tasks (optional FK)
            │       └── project_milestones
            ├── tasks (nullable project_id)
            ├── goals
            │       └── content_posts.goal_id (content goals)
            ├── ideas
            ├── leads
            ├── content_posts
            ├── notifications
            ├── user_integrations (Vercel, GitHub tokens)
            └── feedback

Admin / platform (service role):
    ├── access_requests
    ├── announcements / announcement_dismissals
    ├── changelog_entries
    └── blog_posts (shared with marketing site)
```

### Migration strategy

Migrations are numbered sequentially in `supabase/migrations/`:

- **001–054** — Initial schema through properties
  package (foundation, portal, finances, valuations,
  rent due tracking)
- Applied via `supabase db push --linked` or CI against the linked project
- **Never edit applied migrations** — add a new numbered file for schema changes

Each migration should be idempotent where possible and include RLS policies for new tables.

---

## 6. Authentication Flow

### New user journey

1. **Request access** — Visitor submits name/email on marketing or sign-in page → `access_requests` row (pending).
2. **Admin approval** — Admin approves in `/admin/requests` → Supabase Auth invite sent with optional welcome message.
3. **First login** — User sets password via invite link → `auth/callback` → session established.
4. **Personalisation** (`/welcome`) — Display name and theme preference → `personalisation_completed = true`.
5. **Onboarding overlay** — Product tour slides → `onboarding_completed = true`.
6. **Project spotlight tour** — First-project guided flow on `/projects` → `project_tour_completed = true`.
7. **Dashboard** — User lands on overview with full AppShell.

Middleware enforces the personalisation gate using a service-role read of `user_preferences.personalisation_completed`. Completed users are redirected away from `/welcome`.

### Admin access

Admin routes (`/admin/*`) are gated by:

- **Middleware** — Compares session email to `ADMIN_EMAIL` env var (case-insensitive).
- **Server actions** — `requireAdmin()` + `isAdminEmail()` on every admin mutation.

There is no separate admin role in the database; admin is a single designated account.

---

## 7. Integration Architecture

### Vercel

- OAuth connection stores deployment/site metadata in `user_integrations`.
- Access tokens encrypted with **AES-256-GCM** before persistence.
- Decryption and API calls happen **server-side only** (Server Actions / services).

### GitHub

- Same encryption pattern as Vercel.
- Used for repository activity display on web/app development projects.

### Future: social platforms

Phase 3 envisions OAuth connections for TikTok, Instagram, YouTube, etc. Tokens will follow the same encrypted-at-rest pattern; publishing will remain server-side.

### Encryption details

- Master key: `INTEGRATIONS_ENCRYPTION_KEY` (32-byte base64)
- Algorithm: AES-256-GCM with per-token IV and auth tag
- Implementation: `lib/integrations/crypto.ts`

---

## 8. Security Model

| Layer | Approach |
|-------|----------|
| **Secrets** | Environment variables only — never committed, never sent to client |
| **Data isolation** | RLS as primary defence — every query scoped to authenticated user |
| **Privileged access** | Service role used server-side only; never in client bundles or middleware responses |
| **Integration tokens** | Encrypted at rest; plaintext only in memory during API calls |
| **Admin** | Single `ADMIN_EMAIL`; no client-side admin flag |
| **Input validation** | Zod schemas on all Server Action inputs |
| **User identity** | `user_id` always derived from session — never accepted from client payload |

---

## 9. Performance Considerations

### Current optimisations

- **Server Components** for initial data fetch — no client-side waterfall on first paint.
- **`Promise.all`** in dashboard layout and page loaders — parallel independent queries.
- **Optimistic updates** — Perceived instant feedback on toggles and drag-and-drop.
- **Lazy loading** — Expensive operations (integration health checks, external APIs) loaded on demand or behind expand interactions.

### Known scaling concern

`generateNotifications()` runs on **every dashboard layout load**. At scale this should move to:

- A scheduled job or database trigger, or
- Incremental generation with a `last_checked_at` watermark, or
- On-demand generation when the notifications panel opens

Document this before user count grows significantly.

---

## 10. Deployment

### Projects

| Vercel project | Domain | Repository |
|----------------|--------|------------|
| **wisk-command-centre** | `app.wiskapp.com` | Command centre (this repo) |
| **wiskapp-marketing** | `wiskapp.com` | Marketing site |

Both auto-deploy from **GitHub `main`** on push (configure branch in Vercel project settings).

Database migrations are applied separately via Supabase CLI against the linked project — not automatically on Vercel deploy unless CI is configured.

### Environment variables — Command Centre (`app.wiskapp.com`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (RLS-bound) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key — **server only** |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical app URL (auth redirects, invite links) |
| `ADMIN_EMAIL` | Yes | Designated admin account email |
| `INTEGRATIONS_ENCRYPTION_KEY` | Yes | 32-byte base64 key for token encryption |
| `ANTHROPIC_API_KEY` | Yes (Winston) | Claude API key for digest and chat |
| `AI_DIGEST_SECRET` | Yes (Winston) | Bearer token for scheduled digest API routes |
| `PROPERTY_ALERTS_SECRET` | Yes (Properties) | Bearer token for `/api/properties/check-certificate-alerts` cron |
| `RESEND_API_KEY` | Yes (email) | Resend API key for transactional emails |
| `RESEND_FROM_EMAIL` | Yes (email) | From address for Resend emails |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | Sentry DSN for error tracking |
| `SENTRY_AUTH_TOKEN` | Build only | Source map upload during CI/build |
| `SENTRY_ORG` | Build only | Sentry organisation slug |
| `SENTRY_PROJECT` | Build only | Sentry project slug |

### Environment variables — Marketing (`wiskapp.com`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Same Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Read published blog/content (RLS or public policies) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical marketing URL |

Marketing may use additional keys depending on implementation (e.g. service role for build-time blog fetch — keep server-side only if used).

### Local development

Copy `.env.example` to `.env.local` and fill all required values. Run `npm run dev` for the command centre; apply migrations with `supabase db push --linked`.

---

## 11. Architecture Decision Records

### ADR-001: Next.js App Router over Pages Router

**Decision:** Use Next.js 15 App Router with React Server Components.

**Rationale:** Server-first data fetching, colocated layouts, Server Actions for mutations, and improved streaming align with a dashboard-heavy product. Pages Router would require separate API routes and more client-side fetching.

**Status:** Accepted

---

### ADR-002: Supabase over custom backend

**Decision:** Use Supabase for PostgreSQL, Auth, and RLS instead of a custom Node API.

**Rationale:** Faster iteration for a solo/small team; built-in Auth and RLS reduce security surface; Postgres flexibility for relational data. Trade-off: vendor coupling and RLS complexity in middleware edge cases.

**Status:** Accepted

---

### ADR-003: Server Actions over API routes

**Decision:** Mutations go through Server Actions, not REST API routes.

**Rationale:** End-to-end type safety, colocation with features, no duplicate validation layers, native `revalidatePath`. API routes reserved for webhooks or third-party callbacks if needed later.

**Status:** Accepted

---

### ADR-004: Invite-only access

**Decision:** No public sign-up; access via request → admin approve → invite.

**Rationale:** WISK is a personal command centre, not a mass-market SaaS at launch. Controlled onboarding improves support quality and prevents abuse.

**Status:** Accepted

---

### ADR-005: Single Supabase project for both apps

**Decision:** Command centre and marketing site share one Supabase project.

**Rationale:** Blog posts and future shared content publish from admin in the command centre and render on marketing without sync jobs. RLS and separate Vercel projects still isolate runtime concerns.

**Status:** Accepted

---

### ADR-006: Token encryption at application layer

**Decision:** Encrypt integration tokens in application code before writing to `user_integrations`, rather than relying on Supabase vault alone.

**Rationale:** Explicit control over algorithm (AES-256-GCM), key rotation documented in ops runbooks, and defence in depth if database backups are exposed. Key stored in `INTEGRATIONS_ENCRYPTION_KEY` env var.

**Status:** Accepted

---

## 12. Phase 3 Architecture Notes

### AI Package

The AI layer reads from the existing Supabase
database — no separate AI database is needed.
User data (projects, tasks, goals, leads, content)
is the knowledge base.

Each AI request:
1. Pulls relevant context from Supabase
   server-side (with optional 24-hour cache in
   `ai_context_cache`)
2. Constructs a system prompt describing
   the user's business state
3. Sends to Claude API (`claude-sonnet-4-6`)
4. Returns structured response to the UI
5. Logs token usage to `ai_usage_log`

**Delivered (June 2026):**
- AI Digest — scheduled Sunday generation via
  GitHub Actions; stored in `ai_reports`
- WISK Chat v1 — on-demand per user message;
  conversation history in `ai_conversation_messages`;
  12-hour session expiry; rate limits enforced
  server-side
- Winston Conversations 2.0 — multi-conversation
  sidebar; `ai_conversations` table; project-scoped
  chats; auto-generated titles via Haiku model
- Smart suggestions — 13 rule-based suggestion types
  on Overview; gated behind `ai_access`

### Stripe Billing

Stripe goes live before any billable feature
ships. Package entitlements stored in
`user_subscriptions` table. Feature gating
checks `user_subscriptions` server-side —
never trust client-side entitlement checks.

Stripe account: sandbox active, products
created (WISK AI £9/mo, WISK AI Pro £19/mo),
webhook configured at
`/api/stripe/webhook`.

Infrastructure delivered: `hasPackageAccess()`
and `hasAIAccess()` helpers, webhook handler
stub, `/upgrade` page with pricing cards,
Settings billing section. Checkout flow and
customer portal are next (Phase 3.2).

### Google OAuth (pending)

Google Cloud project: WISK (wisk-499812)
Gmail API: enabled
OAuth credentials: created
Consent screen: configured, testing mode
Redirect URI: `app.wiskapp.com/auth/google/callback`
Status: credentials ready, OAuth flow
not yet built into app

### Winston for Leads

Dedicated AI panel in the leads section.
Accessible via "Winston" button on leads page.
Features: call notes processor, email
drafting, pipeline health (coming soon).
Gated behind `ai_access` / WISK AI subscription.
Non-access users see upgrade teaser.

### Username System

`username` field on `public.users` (unique,
case-insensitive index).
Display rules:
- Personal contexts: display name only
- Collaborative contexts: @username prefix
- Sign in accepts email OR @username

### Observability (Sentry)

WISK uses Sentry (`@sentry/nextjs`) for production
error tracking:

- DSN configured via `NEXT_PUBLIC_SENTRY_DSN` env var
- `tracesSampleRate`: 0.1 (10% of transactions)
- `sendDefaultPii`: false
- User context: `{ id: userId }` only — no email/name
- Three error boundaries report to Sentry:
  `global-error.tsx`, `(dashboard)/error.tsx`,
  `(dashboard)/ai-digest/error.tsx`
- API routes capture exceptions in catch blocks

Config files: `sentry.shared.ts`, `sentry.server.config.ts`,
`sentry.edge.config.ts`, `src/instrumentation.ts`,
`src/instrumentation-client.ts`.

### AI Usage Tracking

`ai_usage_log` table records every Claude API call:

- `user_id`, `feature` (`'chat'` | `'digest'`)
- `input_tokens`, `output_tokens`
- `created_at`

Monthly token limit: 100,000 tokens (chat only)
Short-term limit: 10 messages per 5 minutes
Constants in `src/lib/ai/constants.ts`

`ai_context_cache` table caches `buildUserContext()`
output per user, TTL 24 hours. Reduces DB queries
on every chat message.

Usage breakdown displayed in Settings (when
`ai_access` is enabled) and as a lightweight
percentage bar on the Winston Chat page.

### Email Integration (AI Pro)

OAuth tokens for Gmail/Outlook follow the same
encrypted-at-rest pattern as Vercel/GitHub:
- AES-256-GCM encryption via lib/integrations/crypto.ts
- Stored in user_integrations table
- All API calls server-side only
- Requires Google/Microsoft app verification
  before launch (allow several weeks)

### Collaboration Architecture

**Phase A (delivered):** `user_connections` and
`item_shares` tables (migration 035); `/connections`
page; connection request notifications. No sharing
UI yet — social graph only. RLS on existing item
tables not yet updated.

**Phase B (planned):** RLS updates on shareable
tables and sharing UI. Example RLS pattern for
shared projects:

```sql
create policy "Users can view shared projects"
on public.projects for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from item_shares
    where item_shares.item_id = projects.id
    and item_shares.item_type = 'project'
    and item_shares.recipient_id = auth.uid()
    and item_shares.permission in ('view', 'edit')
  )
);
```

This pattern applies to every shareable table.
Build Phase B (RLS + UI) after Stripe checkout
is live.

### Properties Package (delivered June 2026)

Vertical package for small landlords. Gated via
`hasPackageAccess(userId, 'properties')`.

**Routes:**
- Landlord: `/properties/*` (dashboard layout with sidebar)
- Tenant portal: `/portal/*` (separate auth flow)

**Key APIs:**
- `POST /api/properties/check-certificate-alerts` —
  daily cron (certificates, mortgages, insurance,
  rent payments and reminders)
- `POST /api/properties/generate-valuation` —
  Claude web_search valuation per property
- `POST /api/properties/generate-insights` —
  Winston portfolio insights
- `POST /api/portal/winston-triage` —
  tenant maintenance triage

**Data model:** migrations `046`–`054`. See
`docs/architecture/database-schema.md` for table
reference and `docs/features/properties.md` for
feature spec.

**Email:** certificate, mortgage, insurance, and
rent reminder alerts via Resend (`lib/properties/emails.ts`).

**Still planned:** communication hub UI, Goals
linking, document file storage on Supabase Pro.

---
