# WISK Development Standards

This document defines how we build and maintain the WISK Command Centre. Follow these standards for every feature, fix, and refactor so the codebase stays consistent, secure, and easy to navigate.

---

## 1. Core Principles

### Consistency over cleverness

Prefer readable, predictable code that matches existing patterns. A boring solution that every contributor can follow beats a clever abstraction used once.

### Server first, client when necessary

Fetch data and enforce authorisation on the server. Add `"use client"` only when you need browser APIs, local state, event handlers, or context consumers.

### Follow existing patterns before inventing new ones

Before introducing a new folder structure, data-fetching approach, or UI pattern, find how the nearest feature (projects, tasks, leads, content) already does it — then extend that pattern.

---

## 2. File and Folder Structure

### Feature structure pattern

Each major section follows a repeatable layout:

```
src/
├── app/(dashboard)/[section]/
│   ├── page.tsx              # Server component — fetches data
│   └── actions.ts            # Server Actions — mutations only
├── components/[section]/
│   ├── [section]-page-client.tsx
│   ├── [section]-list.tsx
│   ├── [section]-card.tsx
│   ├── [section]-form.tsx
│   ├── [section]-form-dialog.tsx
│   ├── delete-[section]-dialog.tsx
│   └── [section]-empty-state.tsx
└── lib/[section]/
    ├── types.ts
    ├── constants.ts
    ├── form.ts               # EMPTY_*_FORM, *ToFormInput helpers
    ├── format.ts
    └── selectors.ts          # grouping, stats, derived data
```

**Example — Projects**

| File | Responsibility |
|------|----------------|
| `app/(dashboard)/projects/page.tsx` | `getProjects()`, pass to client |
| `app/(dashboard)/projects/actions.ts` | CRUD, Zod, revalidate |
| `components/projects/projects-page-client.tsx` | State, modals, list orchestration |
| `components/projects/project-card.tsx` | Single item display + expand |
| `components/projects/project-form-dialog.tsx` | Create modal |
| `lib/projects/types.ts` | `Project`, `ProjectFormInput`, `ActionResult` |

### Naming conventions

| Kind | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `content-post-card.tsx` |
| React components | PascalCase | `ContentPostCard` |
| Functions | camelCase | `buildContentStats` |
| Types / interfaces | PascalCase | `ContentPost` |
| Constants | UPPER_SNAKE_CASE | `CONTENT_PLATFORMS` |
| Database columns | snake_case | `published_at` |
| Server Actions | camelCase verbs | `createProject`, `updateTask` |

---

## 3. Server Actions

### Standard pattern

Every mutation action should:

1. Authenticate via `getScopedSupabase()` or `requireAdmin()` for admin routes.
2. Validate input with **Zod** before any database call.
3. Never accept `user_id` from the client — always use session-derived `userId`.
4. Return a typed **`ActionResult`**.
5. Call **`revalidatePath`** for affected routes after success.

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import type { ActionResult, ExampleFormInput, ExampleRow } from "@/lib/example/types";

const exampleFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
});

function revalidateExamplePaths() {
  revalidatePath("/example");
  revalidatePath("/");
}

export async function createExample(
  input: ExampleFormInput
): Promise<ActionResult<ExampleRow>> {
  const parsed = exampleFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, userId } = await getScopedSupabase();

  const { data, error } = await supabase
    .from("examples")
    .insert({
      user_id: userId,
      title: parsed.data.title.trim(),
    })
    .select("*")
    .single();

  if (error) {
    console.error("createExample:", error);
    return { success: false, error: "Could not save. Please try again." };
  }

  revalidateExamplePaths();
  return { success: true, data: data as ExampleRow };
}
```

### ActionResult type

Define once per domain in `lib/[section]/types.ts`:

```typescript
export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
```

- **`success: false`** — Always include a **human-readable** `error` string for UI display.
- **`success: true`** — Optionally include `data` when the client needs the created/updated row.

### Rules

- Log raw errors with `console.error` — never return Postgres messages to the user.
- Scope every query with `.eq("user_id", userId)` (or equivalent RLS-safe filter).
- Admin actions use `createAdminClient()` from `lib/supabase/admin.ts` + `requireAdmin()`.

---

## 4. Component Patterns

### Server page pattern

Fetch on the server; pass serialisable props to the client shell.

```typescript
// app/(dashboard)/tasks/page.tsx
import { getTasks } from "@/app/(dashboard)/tasks/actions";
import { getProjects } from "@/app/(dashboard)/projects/actions";
import { TasksPageClient } from "@/components/tasks/tasks-page-client";

export default async function TasksPage() {
  const [tasks, projects] = await Promise.all([
    getTasks(),
    getProjects(),
  ]);

  return (
    <TasksPageClient
      initialTasks={tasks}
      projects={projects}
    />
  );
}
```

Use **`Promise.all`** whenever fetches are independent.

### Client shell pattern

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";

export function TasksPageClient({ initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // modals, handlers, render list
}
```

### Optimistic update pattern

Apply the change locally, call the action, revert on failure.

```typescript
const handleToggle = async (task: Task) => {
  const previous = task.completed;
  const optimistic = { ...task, completed: !previous };

  setTasks((current) =>
    current.map((t) => (t.id === task.id ? optimistic : t))
  );

  const result = await updateTask(task.id, { completed: !previous });
  if (!result.success) {
    setTasks((current) =>
      current.map((t) => (t.id === task.id ? task : t))
    );
    setError(result.error);
    return;
  }

  router.refresh();
};
```

---

## 5. Database Conventions

### Migration naming

Sequential numbered files in `supabase/migrations/`:

```
001_initial_schema.sql
002_dev_test_user_profile.sql
…
022_content_multi_platform.sql
```

- One logical change per migration.
- Never modify migrations that have been applied to production.

### Table requirements

Every user-owned table should include:

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key, `default gen_random_uuid()` |
| `user_id` | `uuid` | FK → `public.users(id)` ON DELETE CASCADE |
| `created_at` | `timestamptz` | `not null default now()` |
| `updated_at` | `timestamptz` | Recommended; update via trigger or explicit set on mutation |

Enable **RLS** on every table. Add policies for SELECT, INSERT, UPDATE, DELETE scoped to `auth.uid() = user_id`.

### Standard RLS policy pattern

```sql
alter table public.examples enable row level security;

create policy "Users can view own examples"
  on public.examples for select
  using (auth.uid() = user_id);

create policy "Users can insert own examples"
  on public.examples for insert
  with check (auth.uid() = user_id);

create policy "Users can update own examples"
  on public.examples for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own examples"
  on public.examples for delete
  using (auth.uid() = user_id);
```

Platform/admin tables may use service-role-only access from Server Actions instead of user RLS.

---

## 6. TypeScript Standards

- **`strict`** mode is enabled — do not disable compiler checks to ship faster.
- **No `any`** — use `unknown` and narrow, or define proper types.
- Domain types live in **`lib/[section]/types.ts`** — not inline in components.
- Prefer **`as const`** arrays for enum-like unions (`CONTENT_STATUSES`, etc.).
- Server Action inputs should have a dedicated **`FormInput`** type separate from database row types.

```typescript
// lib/tasks/types.ts
export type Task = {
  id: string;
  user_id: string;
  title: string;
  // ...
};

export type TaskFormInput = {
  title: string;
  due_date?: string;
  // ...
};
```

---

## 7. Styling Conventions

### Tailwind only

Use utility classes. Avoid custom CSS except global tokens in `globals.css` and rare animations.

### Mobile-first responsive

Default styles target mobile; add `sm:`, `md:`, `lg:` breakpoints for larger screens.

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
```

### Touch targets

Interactive elements on mobile must be at least **44×44px** (buttons, nav items, checkboxes in lists).

### Dark mode default

Theme uses CSS variables (`--background`, `--foreground`, WISK accent tokens). `next-themes` defaults to dark; light mode is a first-class alternate palette.

### Animation rules

| Rule | Detail |
|------|--------|
| Library | **Framer Motion** for motion — not CSS keyframe sprawl |
| Reduced motion | Always respect `prefers-reduced-motion` via `useReducedMotion()` or `useMotionSafe()` |
| Duration | **200–400ms** for UI transitions; avoid sluggish or flashy motion |
| Purpose | Motion should clarify state change — not decorate |

---

## 8. Error Handling

### User-facing errors

- Short, actionable messages: *"Title is required."*, *"Could not save. Please try again."*
- **Never** expose raw Supabase/Postgres errors, stack traces, or constraint names.

### Server-side logging

```typescript
if (error) {
  console.error("updateProject:", error);
  return { success: false, error: "Could not update project. Please try again." };
}
```

### Empty states

Every list or grid needs an empty state component with:

1. **Icon** — Lucide, muted colour
2. **Heading** — What is missing
3. **Description** — Why it matters or what to do next
4. **CTA** — Primary button (e.g. "Add project")

Do not show a blank screen or bare "No items" text.

---

## 9. Performance Rules

| Rule | Implementation |
|------|----------------|
| Fetch in Server Components | Data loading in `page.tsx` / layout — not `useEffect` on mount |
| Parallel fetches | `Promise.all([...])` for independent queries |
| Lazy load expensive data | Integration health, external APIs — on expand or dedicated tab |
| Avoid layout waterfalls | Do not chain sequential awaits when queries are unrelated |
| Revalidate surgically | `revalidatePath` only routes that display mutated data |

**Known debt:** `generateNotifications()` on every dashboard layout load — do not add similar per-request heavy jobs without an explicit performance review.

---

## 10. Security Rules

| Rule | Detail |
|------|--------|
| No secrets in client code | Service role, encryption keys, and private API keys stay server-side |
| Validate all action input | Zod schema on every Server Action |
| Never trust client `user_id` | Always derive from `getScopedSupabase()` / session |
| Scope all queries | `.eq("user_id", userId)` even with RLS — defence in depth |
| Encrypt integration tokens | Use `lib/integrations/crypto.ts` before persisting |
| Admin gates | Middleware + `requireAdmin()` on every admin action |

---

## 11. Git Conventions

### Commit message format

```
type: short description in imperative mood
```

**Types:**

| Type | Use |
|------|-----|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change without behaviour change |
| `style` | Formatting, no logic change |
| `test` | Tests |
| `chore` | Tooling, deps, config |

**Examples:**

```
feat: add multi-platform content picker
fix: prevent welcome redirect on every login
docs: add architecture overview
refactor: extract blog slug helper
```

### Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready; auto-deploys to Vercel |
| `feature/[name]` | New features |
| `fix/[name]` | Bug fixes |

Open PRs into `main`. Keep branches focused — one feature or fix per branch when possible.

---

## Quick reference checklist

Before opening a PR:

- [ ] Types in `lib/[section]/types.ts`
- [ ] Zod validation on Server Actions
- [ ] `user_id` from session, not client
- [ ] `revalidatePath` after mutations
- [ ] Human-readable errors; raw errors logged only
- [ ] Empty state for new lists
- [ ] Mobile touch targets and responsive layout
- [ ] `"use client"` only where needed
- [ ] Matches existing feature file structure

---

*These standards apply to the WISK Command Centre repository. Update this document when patterns evolve.*
