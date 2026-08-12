# WISK — Roadmap & Feature Status

Last updated: August 2026 (second sync this month — a full day of Winston/AI feature work, reliability fixes, and cost optimization)

---

## Sync Notes (August 2026, second pass)

Confirmed directly by Zay, correcting the previous sync:
- **Mobile QA pass — done.**
- **Content, Calendar, and Email page UI refreshes — all done.**
- **Lead automation (auto-draft follow-up for stalled leads) — done**, built this session on top of Pipeline Health.
- **Companies House / ICO registration — Zay is handling directly, not tracked here.**

Shipped this session (see `winston.md`, `leads.md`, `notes.md`, `calendar.md`, `content.md`, `ideas.md`, `database-schema.md` for full detail per area):
- **Pipeline Health** — built from stub to fully live, then two real bugs fixed (stuck-loading spinner from a client effect race; a currency display bug where Winston's own prose misstated a lead's value, now fixed with a standing rule that Winston never restates numbers it didn't compute in code).
- **Lead value types** — `value_type` (`one_time`/`monthly`) added, upfront/recurring shown as two figures everywhere rather than blended.
- **Token/latency optimization** — all seven items from the optimization pass shipped: timeouts on every Anthropic call, digest batch entitlement gating fixed (was running for every user, not just entitled ones), Winston Chat streaming, Anthropic prompt caching across most call sites, model rebalancing (several routes moved Sonnet→Haiku, Pipeline Health moved Haiku→Sonnet), context slimming across chat/digest/Pipeline Health/Properties insights/email drafts, and email action-items caching/dedup.
- **Morning briefing** — made a standard feature for every user (previously `ai_pro`/`max` only), with a real free/paid split (Haiku single-insight for free, unchanged Sonnet full briefing for paid). Two real production bugs found and fixed along the way: a stale time-window gate that silently skipped every user, every day, on Vercel Hobby (zero briefings were ever generated before this fix); and a localhost-link incident where a manual verification run sent real emails to real users with broken links, which led to a dedicated production-locked email URL helper and a guard preventing local runs from touching production data without deliberate override.
- **Shared Winston propose-review-commit infrastructure** — new pattern (`src/lib/winston/proposal.ts`, `commit-proposal.ts`, `src/components/winston/`) for any feature where Winston proposes multiple structured items for review before creation. Nothing built on this reuses or duplicates creation logic — everything dispatches to existing per-entity Server Actions.
- **Notes brainstorming with Winston** — conversational, note-scoped, reuses the Winston Chat streaming infra.
- **Notes → projects/tasks conversion** — built on the shared proposal infra; can attach tasks to existing projects, not just new ones; traces created projects back to their source note.
- **Winston in Calendar and Content Calendar** — brainstorm chat + "Schedule this," producing real calendar events/content posts when a date is confident, or parking as an idea/undated content post (with a one-shot reminder, no new cron) when it isn't.
- **Winston conversation persistence + tab scoping** — migration 072 `ai_conversations.scope_key`; Calendar (`calendar`) and Content (`content-calendar`) each get an isolated durable thread; server-side message persistence hardened; reopen rehydrates history (same pattern as Notes).

---

## Current Phase: 3.3 (Social Media Integration — not yet started)

Confirmed via codebase audit: no dedicated API routes, OAuth callbacks, or publishing/ingestion services for YouTube/Instagram/Meta/LinkedIn/TikTok exist yet. Everything shipped this session was Winston/AI reliability and feature work layered on top of the existing product, not Phase 3.3 itself — that phase remains genuinely next whenever it's picked up.

---

## Phase 3.2 — Complete ✅

### Stripe Billing — Live
- Full checkout flow (4 packages): WISK AI £9/mo, WISK AI Pro £19/mo, WISK Properties £17/mo, WISK Properties Pro £32/mo
- Webhook handler, customer portal, success pages all working
- Discount/promo codes enabled (allow_promotion_codes: true)
- Live Stripe keys active in Vercel production
- Upgrade banner for free users (monthly, payday-timed)
- "Upgrade" in user menu dropdown
- Teaser pages on gated features

### Properties Pro Package — Complete
- Yield Analytics (/properties/yield-analytics) — gross/net yield, ROI, Recharts bar chart
- Tenant Reliability Scoring (/properties/reliability) — A-F grade, 0-100 score, payment history
- Financial Reports (/properties/reports) — UK tax year aligned, per-property + portfolio, print to PDF
- Legal Notice Templates (/properties/notices) — Section 8 (Form 3A) + Section 13 (Form 4A), verbatim statutory wording, eligibility checks, disclaimer
- SA105 Tax Summary (/properties/sa105) — HMRC box-by-box, Box 44 correctly NOT deducted, editable Box 27/29, 6 researched insights
- Winston Properties Pro — 8-10 card layout, now with narrowed DB selects (24-month cap) and capped prompt list sizes (properties 25, tenants 20, maintenance 15, reliability 20)
- Finances sub-nav grouping (Overview, Yield Analytics, Reports, SA105 Summary)
- Portfolio Documents page (/properties/documents)
- All features Pro-gated with inline PropertiesProTeaser components

### Calculation Fixes
- Yield uses contracted rent (monthly_rent × 12) not collected payments
- Net income uses contracted rent as basis
- Vacancy loss uses property created_at to avoid phantom losses for new properties
- Monthly breakdown chart starts from property created_at (capped at 12 months)
- getOrCreateUserPreferences uses upsert to avoid duplicate key errors on new sign-up

### Access Control
- properties_pro added to MAX_INCLUDES
- properties_pro implicitly grants properties access in hasPackageAccess()
- user_subscriptions_package_check constraint updated (migration 061)
- Landlord contact details added to users table (migration 062) — pre-fills Section 8/13 notices
- **Note:** users can hold multiple simultaneous active `user_subscriptions` rows (one per package) — this caused a real bug in morning briefing's original eligibility logic assumption; any new entitlement check should account for it

### Winston AI Pro Digest
- Subscription-aware context builder (subscriptionTier field)
- Richer context for ai_pro/max: lead intelligence, content strategy, goal velocity, cross-section patterns
- Additional Pro cards in ai-digest-page-client.tsx
- Batch generation now correctly filters to entitled users only (was previously ungated — real cost leak, now fixed)

### Morning Briefing — Complete, now standard/free + paid tiers
See Sync Notes above and `winston.md` for full detail. No longer `ai_pro`/`max`-gated; free tier is Haiku/single-insight, paid tier is the original Sonnet/full-briefing experience unchanged.

### While You Were Away — Complete
- away_summaries table (migration 064) — per-user cached summary
- On-demand sync via /api/away-sync/user when cache stale
- Cron: 6am UTC (once/day on Hobby), now tracks a `failed` count like the other crons
- Shows new emails, new leads, overdue tasks, new tenant messages
- Empty state: "Nothing to catch up on. Everything's quiet."
- AI Pro/Max only (intentionally narrower than digest/briefing) — shows below section cards on Overview

### Auth/Onboarding Overhaul
- /sign-up — immersive Framer Motion scroll experience
- /sign-up/confirm — confirmation page with resend option
- /auth/callback handles type=signup and type=email_change OTP verification
- /welcome — onboarding page, name pre-populated from user_metadata
- Password fields hidden on /welcome for email+password sign-up users
- Timezone captured on sign-up (Intl.DateTimeFormat API), stored in user_preferences
- Gender/greeting_term preferences (migration 066) feed morning briefing personalisation

### Brand Refresh — Complete
- New wordmark, colour system, section-specific accents (light/dark variants) — see previous sync for full colour token list, unchanged this pass

### Overview Redesign
- Section cards grid with Framer Motion layoutId shared layout animation
- Morning briefing card now shows for every user (not Pro-gated), tier-aware content
- Winston suggestion pills strip
- While You Were Away section below cards (AI Pro only)

### UI Refresh — Section Pages
- Projects, Tasks, Leads, Goals, Ideas — all previously complete
- **Content, Calendar, Email — confirmed complete this sync** (previously listed as outstanding)

### Notes — Complete, now with Winston integration
- Rich text (TipTap) notes section at `/notes`, migration 039
- Brainstorming with Winston and Find projects & tasks — both shipped this session, see `notes.md`

### Marketing Site (wiskapp-marketing)
- Full rebrand matching app colour system, unchanged this pass

---

## Phase 3.3 — Social Media Integration (Next)

Build order: YouTube → Instagram/Meta → LinkedIn → TikTok (last, most restrictive API)
Status: Not yet started
Note: Create developer accounts on all platforms early to surface surprises

---

## Pending / Outstanding

### Confirmed complete this sync (previously listed here):
1. ~~Mobile QA pass~~ — done
2. ~~Content page UI refresh~~ — done
3. ~~Calendar page UI refresh~~ — done
4. ~~Email page UI refresh~~ — done
5. ~~Lead automation~~ — done (Pipeline Health → draft follow-up)

### Still open:
1. Email templates — Supabase auth emails (confirmation, password reset) still use the default Supabase template, not a branded one. Distinct from the morning-briefing/billing/properties email URL fix done this session — that was about link correctness, this is about template branding.
2. Supabase Pro upgrade — fixes realtime messaging, enables task file attachments
3. Vercel Pro upgrade — enables frequent crons (`*/5`, `*/15`). Morning briefing's window-gate logic is already built to use this the moment it's available — flip `MORNING_BRIEFING_FREQUENT_CRON` to `true` once upgraded, don't rebuild the feature.
4. Google OAuth CASA Tier 2 verification (~£1,500-3,000, fund from revenue)
5. SA105 and legal template professional review

### Handled directly by Zay, not tracked here:
- Companies House registration (£50) + ICO registration (£47/year, Tier 1)

### Phase 4 — Speculative
- Collaboration & Sharing (item_shares table exists)
- Team features
- React Native/Expo mobile app (scoped: Overview, Tasks, Projects, Goals, Notifications)
- WISK Stays (short-term rental management)
- Fitness coaching package
- Restaurant HQ package

---

## Known Issues / Tech Debt

- Gmail OAuth token expires after inactivity — user must reconnect in Settings → Connections
- Realtime messaging uses 15s polling fallback (fix: Supabase Pro upgrade)
- Task file attachments deferred (fix: Supabase Pro upgrade)
- Vercel crons limited to once/day on Hobby — this is now handled correctly (see morning briefing's frequent-cron flag) rather than being a live bug, but still a real constraint until Vercel Pro
- color-mix() in inline style props causes SSR hydration mismatch — use rgba() instead (status of remaining instances not re-audited this pass)
- supabase/.temp/ should be added to .gitignore
- SA105 Box 44 and legal notice wording verified against HMRC/gov.uk sources (May 2026 forms)
- `property_alert_log` documented in earlier schema notes but not found in live table list — still unverified whether renamed/merged/unshipped
