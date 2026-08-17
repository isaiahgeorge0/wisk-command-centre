# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WISK Command Centre (`app.wiskapp.com`) — the authenticated personal business dashboard half of WISK. A separate marketing repo (`wiskapp-marketing`, `wiskapp.com`) shares the same Supabase project but is **not** this repo; it has a different (flat, no-`src/`) folder layout — don't assume its paths apply here.

This repo has unusually thorough docs already — read them before guessing:

- [`docs/architecture/overview.md`](docs/architecture/overview.md) — full system architecture, tech stack, key patterns, ADRs, env vars, Phase 3 feature notes (AI, Stripe, collaboration, properties)
- [`docs/architecture/database-schema.md`](docs/architecture/database-schema.md) — table-by-table schema reference, kept in sync with migrations
- [`docs/development/standards.md`](docs/development/standards.md) — the canonical how-to-build-a-feature doc (file structure, Server Action pattern, RLS pattern, styling, error handling)
- [`docs/development/collaboration.md`](docs/development/collaboration.md) — working agreement + a large "Technical learnings" section of hard-won gotchas (Supabase realtime limits, Vercel Hobby cron constraints, hydration bugs, date-parsing pitfalls) — check this before touching realtime, migrations, or financial date logic
- [`docs/features/winston.md`](docs/features/winston.md) — the AI assistant ("Winston"): every surface it appears on, the shared proposal/commit pattern, conversation scoping rules
- [`docs/features/*.md`](docs/features) — per-section feature specs (leads, properties, content, calendar, etc.)

When docs and code disagree, trust the code and treat the doc as stale — but it's usually current since it's actively maintained alongside features.

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build (Turbopack)
npm run start    # run production build
npm run lint     # ESLint (next/core-web-vitals + next/typescript)
```

There is no test runner configured in this repo.

Database migrations live in `supabase/migrations/` as sequential numbered SQL files, applied via `supabase db push --linked`. Never edit an applied migration — add a new numbered file.

## Architecture essentials

- **Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4.** Server Components fetch data; Server Actions (`actions.ts` files) handle all mutations — there is no separate REST API layer for app CRUD (API routes exist only for webhooks/crons/external callbacks).
- **Feature-oriented structure**, repeated per section (`projects`, `tasks`, `leads`, `content`, `properties`, ...):
  ```
  src/app/(dashboard)/[section]/page.tsx        # server component, fetches data
  src/app/(dashboard)/[section]/actions.ts       # Server Actions: Zod validate → getScopedSupabase() → mutate → revalidatePath
  src/components/[section]/[section]-page-client.tsx  # client shell: state, modals, optimistic updates
  src/lib/[section]/{types,constants,form,format,selectors}.ts  # pure domain logic, no React
  ```
  Before adding a new pattern, find how the nearest existing section does it and match that — see `docs/development/standards.md` §2–4 for the exact template and an `ActionResult<T>` example.
- **Three Supabase clients** (`src/lib/supabase/{server,client,admin}.ts`): session client for user-scoped RLS-bound reads/writes, admin (service-role) client for admin panel + middleware personalisation checks only — never expose service role to the browser. Server Actions must derive `userId` from `getScopedSupabase()`/session, never accept it from the client.
- **`src/middleware.ts`** handles session refresh, the personalisation gate (`/welcome` until `user_preferences.personalisation_completed`), the tenant-portal redirect split (`/portal/*` vs everything else), and the single-admin-account gate (`ADMIN_EMAIL` env var comparison — there is no DB role).
- **RLS on every user-owned table**, scoped to `auth.uid() = user_id`; Server Actions additionally filter `.eq("user_id", userId)` as defence in depth. See `docs/development/standards.md` §5 for the standard policy block.
- **Winston** is the AI assistant, built on Claude (`@anthropic-ai` via `src/lib/ai/anthropic.ts`), surfaced as a three-tier sidebar (global FAB / section brainstorm / record-level) plus a "quick add" structured-form tab. Conversations are scoped via `ai_conversations.scope_key` / `note_id` / `project_id` — never merge scopes. Any new Winston-created-record feature should use the existing shared proposal/commit pattern (`src/lib/winston/proposal.ts`, `commit-proposal.ts`) rather than parallel creation logic. Read `docs/features/winston.md` fully before touching this — it documents several real bugs and the fixes/invariants that prevent regressing them (e.g. never let Winston's prose restate a number the app computed).
- **Vercel Hobby plan**: cron jobs only run once/day (`vercel.json` — `0 H * * *` format only, no `*/5`). Time-window-based gating logic assuming finer cron granularity has caused real silent-failure bugs here (see collaboration.md).
- **Integration tokens** (Vercel, GitHub, Gmail, Outlook OAuth) are AES-256-GCM encrypted at rest via `src/lib/integrations/crypto.ts`, decrypted server-side only.
- **Billing**: `user_subscriptions` holds one row per package (a user can have several active rows simultaneously — never assume 1:1). Entitlement checks (`hasPackageAccess`, `hasAIAccess`) are server-side only.
- **Sentry** (`@sentry/nextjs`) wraps error boundaries (`global-error.tsx`, `(dashboard)/error.tsx`, `(dashboard)/ai-digest/error.tsx`); config in `sentry.*.config.ts` / `src/instrumentation*.ts`.

## Conventions quick reference

Full detail in `docs/development/standards.md` — summary:

- Files kebab-case, components PascalCase, functions camelCase, DB columns snake_case, constants UPPER_SNAKE_CASE.
- `ActionResult<T> = { success: true; data?: T } | { success: false; error: string }` — human-readable `error`, never a raw Postgres message; log the real error with `console.error`.
- Tailwind only, mobile-first, dark-mode-default theme via CSS variables — never hardcode a section colour that only works in dark mode (`SECTION_COLOURS_DARK`/`_LIGHT` pattern).
- Framer Motion for animation (200–400ms), always respecting `useMotionSafe()`/`prefers-reduced-motion`.
- Commit style: `type: imperative description` (`feat`, `fix`, `docs`, `refactor`, `style`, `test`, `chore`).
