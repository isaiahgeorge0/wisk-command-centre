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
│   │   └── ...
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

- **001–022** — Current range (initial schema through multi-platform content, admin, personalisation, changelog, etc.)
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

*Last updated to reflect migrations through 022 and current deployment topology.*
