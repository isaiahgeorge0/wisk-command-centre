# WISK — How We Build Together

This document is a working agreement between three collaborators on WISK:

- **Zay** — solo founder. Sets direction, makes final calls, executes in Cursor, reviews everything.
- **Claude** (claude.ai project) — plans features, writes detailed Cursor prompts, reviews summaries, advises on strategy.
- **Cursor** (Sonnet) — executes prompts in the codebase, reports back what changed.

It is not a rulebook. It is a set of shared habits that make handoffs cleaner and waste fewer cycles. Nothing here overrides Zay's judgment in the moment. If a convention here is slowing things down, change it — this file is meant to evolve.

The goal is simple: **the three of us should work like a small team that trusts each other, not like a chain of command.** Good teamwork here means fewer blind iterations, fewer surprises, and less wasted Cursor usage.

---

## 1. Project facts (so nobody assumes wrong)

These are the things that have caused confusion before. Check them rather than guessing.

**Repo structure (wiskapp-marketing):**
- Flat layout — **no `src/` directory**. Components live in `components/`, routes in `app/`, helpers in `lib/`.
- When writing or referencing paths, use `components/...` and `app/...`, never `src/components/...`.

**Repo structure (wisk-command-centre):**
- Uses `src/` layout. Components in `src/components/[section]/`, routes in `src/app/(dashboard)/[section]/`, domain logic in `src/lib/[section]/`.
- The two repos have **different folder conventions** — always confirm which repo a prompt is for.

**Stack:** Next.js 15 (App Router), TypeScript, Tailwind v4, Supabase, Vercel, Framer Motion, shadcn/ui, Lucide.

**Plans / hosting:** Vercel Hobby plan (cron jobs silently ignored — use GitHub Actions instead). Speed Insights on marketing only.

**When a prompt involves file paths, the prompt should name the exact repo and the exact existing path.** If Claude isn't sure of a path, the prompt should ask Cursor to confirm it before editing, not assume it.

---

## 2. Model choice — when to stray from Auto

Cursor's Auto mode is unlimited and doesn't draw from the credit pool. Premium/thinking models do. So the default should be Auto, and we step up to a thinking model only when the task genuinely needs reasoning.

**Use Auto mode for:**
- Copy changes, text edits, renaming
- Spacing / padding / styling tweaks
- Single-file mechanical edits with a clear, complete spec
- Deleting or moving components
- Anything where the prompt already contains the full answer and Cursor is just applying it

**Step up to a thinking model for:**
- Multi-file features with interdependent logic (e.g., a new section with several new components)
- Animation work with synchronized timing across elements (boomerangs, orchestrated motion)
- Anything involving state management, data flow, or non-obvious logic
- Debugging where the cause isn't yet known
- Refactors that touch shared patterns or types

**How Claude signals this in a prompt:** At the top of any prompt for a complex task, include a one-line note:

> `[Model: use a thinking model — this is multi-file with synchronized animation.]`

For routine prompts, include:

> `[Model: Auto is fine — this is a mechanical change.]`

This is a *suggestion to Zay*, who makes the actual call. It just removes the guesswork.

---

## 3. Prompt conventions (Claude → Cursor)

Tight, complete prompts mean fewer iterations, which means less usage and less frustration. Habits that have worked:

- **Name the repo** at the top of every prompt (marketing vs command centre).
- **State the goal in one sentence** before the detail.
- **List files to create / modify / delete explicitly**, with correct paths.
- **Give exact values** (colors, sizes, durations) rather than vague direction, so Cursor doesn't have to interpret.
- **Specify what NOT to touch** — this prevents collateral changes.
- **Always end with a verification checklist** and `Do NOT commit yet — flag any issues` unless we've explicitly agreed to commit.
- **For big tasks, split into sequential prompts** (A / B / C) so Cursor doesn't choke — but don't over-split routine work, since each round-trip has a cost.
- **Reference existing patterns** ("mirror ModuleRow", "same as the hero card treatment") rather than re-specifying from scratch when a pattern already exists.

---

## 4. Summary conventions (Cursor → Claude/Zay)

Cursor's reports back are most useful when they're skimmable and honest. The ideal summary:

1. **Build status first** — `npm run build` exit code, any errors or warnings (and whether warnings are pre-existing).
2. **What changed, grouped by file** — created / modified / deleted, with one line each on the substantive change.
3. **What was NOT done** — anything skipped, deferred, or that didn't work as specced.
4. **One thing to verify** — the single most important thing for Zay to check in the browser.

**Honesty over confidence.** If something didn't render, didn't work, or is uncertain, say so plainly. A summary that claims success when the screenshot shows otherwise costs far more time than an honest "I implemented X but can't confirm it renders — please check." (See §5.)

Avoid: walls of unstructured detail, restating the entire prompt back, or describing intended behaviour as if it were confirmed behaviour.

---

## 5. The diagnostic-first reflex (hard-won)

When something doesn't work and the fix isn't obvious, **stop iterating blind. Inspect the actual state first.** Repeated "try this fix → still broken → try another fix" cycles are the single biggest source of wasted effort and Cursor usage.

The order that works:

1. **Confirm what's actually there.** Is the code on disk? (`cat`, `grep`) Is the element in the DOM? (DevTools, console queries) Is the dev server serving the latest code? (restart, hard refresh)
2. **Read the actual current state of the file** before proposing changes — don't assume the file matches what was last specced.
3. **Only then** propose a fix, targeting the confirmed cause.

If a single visual detail or bug has failed **three times**, treat that as a signal to switch fully into diagnostic mode (inspect DOM, paste real file contents, check computed styles) rather than attempting a fourth blind fix. And if it fails ~six times, consider whether it's worth shipping without that detail and moving on — perfect is the enemy of shipped.

---

## 6. Sensitive data

- Never paste secrets (API keys, `CRON_SECRET`, service role keys, tokens) into chat. If one appears, rotate it immediately and update `.env.local`, GitHub secrets, and Vercel env vars.
- Claude will never put real secrets, passwords, or credentials into prompts or files.

---

## 7. Spirit of this document

We work best when:

- **Claude plans thoroughly** so Cursor executes confidently and Zay reviews easily.
- **Cursor reports honestly** so Claude can catch problems early and Zay can trust the summaries.
- **Zay makes the calls** — on direction, on model choice, on when something is good enough — and the other two support those calls rather than second-guessing them.

When in doubt: do the cheaper, simpler, more honest thing. Confirm before assuming. Diagnose before fixing. Ship before polishing forever.

*This is a living document. Update it whenever a new lesson is worth keeping.*

---

## 8. Technical learnings (WISK command centre)

Hard-won notes from building the Properties package and contractor portal. Worth checking before touching Supabase realtime, migrations, or financial date logic.

**Supabase realtime (free tier)**
- `realtime_rls` process times out on `postgres_changes` subscriptions — workaround is polling (15s in communication hub); fix is Supabase Pro upgrade
- Multiple `createClient()` calls create multiple WebSocket connections and exhaust free tier realtime capacity — use a single shared provider + event dispatch
- RLS policies with subqueries on realtime subscriptions cause infinite recursion — keep realtime-facing SELECT policies simple (single column equality check only)

**Dates and finances**
- UTC date parsing silently excludes same-month records — always parse dates as local time for financial calculations

**Contractor portal**
- Contractor portal server actions use the admin client exclusively — no public RLS policies needed on contractor tables (migration `058` removed permissive public policies)

**Migrations**
- `pgcrypto` extension required for `gen_random_bytes()` — always add `create extension if not exists pgcrypto` at the top of migrations that use it, or use `gen_random_uuid()` concatenation as an alternative
- Migration ordering matters — policies referencing tables must come after those tables are created
