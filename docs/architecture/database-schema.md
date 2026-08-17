# WISK — Database Schema

Last updated: August 2026 — synced against the full-repo audit's live `information_schema` pull (project `cmwwvepxudrrotoicnbh`), then checked against migrations in this repo. The audit found this doc's Properties package section, and a handful of columns elsewhere, described an earlier schema version than what actually shipped. Corrections below are drawn from that audit; remaining mismatches against migrations (notably `property_insights`, `ai_conversations.scope_key`, and `067`) are called out inline.

Migrations current through: **072**

---

## Core User Tables

### users
id, email, name, username, created_at
address_line1, address_line2, city, postcode, phone (migration 062 — landlord contact)

### user_preferences
id, user_id, personalisation_completed, ai_access (boolean override)
theme_preference, display_name, username_set
upgrade_banner_dismissed_at (migration 060)
last_active_at (migration 063)
last_seen_changelog
timezone (migration 065)
gender, greeting_term (migration 066 — drives Winston/greeting personalisation copy)
onboarding_completed, project_tour_completed, feedback_welcome_shown
field_visibility, service_types, winston_email_picks_enabled, last_seen_at (found live, previously undocumented)

`last_seen_at` (migration 056) and `last_active_at` (migration 063) are distinct, not duplicates:
- **`last_seen_at`** — presence for landlord–tenant messaging. Updated by `updateLandlordLastSeen()` from the presence tracker while the landlord is on a communication surface. Tenants have a parallel `tenants.last_seen_at`. The messaging UI shows this as "last seen".
- **`last_active_at`** — last time the user loaded the dashboard Overview. Updated by `updateLastActive()` on `/` page load. Used as the "while you were away" sync window (`away-sync`).

### user_email_preferences
id, user_id, show_gmail (boolean, default true), show_outlook (boolean, default true), created_at, updated_at

### user_subscriptions
id, user_id, package, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at, updated_at
Package constraint (migration 061): ('ai', 'ai_pro', 'social', 'commerce', 'properties', 'properties_pro', 'max')
Status values: 'active', 'trialing', 'cancelled', 'past_due'
Note: a user can hold multiple simultaneous active rows (one per package) — never assume one row per user when querying entitlement.

### user_connections (migration 035)
id, requester_id, recipient_id, status, created_at

### item_shares (migration 035)
id, owner_id, recipient_id, item_type, item_id, permission, created_at

### user_integrations
id, user_id, provider (gmail/outlook/github/vercel), label, is_active, created_at, updated_at, tokens (encrypted)

### custom_inboxes (migration 044)
id, user_id, name, colour (default '#7c3aed'), display_order (default 0), created_at, updated_at

### email_rules
id, user_id, rule_type, value, target_type, target_id, apply_type, created_at

---

## Work Section Tables

- **projects** (id, user_id, project_name, client_name, service_type, status, next_action, deadline, value, notes, site_url, github_repo, **source_note_id** migration 070 — nullable FK to `notes`, `on delete set null`, set when a project is created via Winston's notes→projects conversion; indexed. **vercel_project_id** found live, previously undocumented — migration 011.)
- **tasks** (id, user_id, project_id, title, priority, due_date, completed, updated_at, **raw_content** — no `notes` column; the free-text column is `raw_content`, migration 024)
- **goals** (id, user_id, title, category, target, current, unit, deadline, status)
- **ideas** (id, user_id, title, description, category, status, created_at) — now also created via the Winston shared proposal commit path (`idea` is one of five `entityType`s in `WinstonProposal`), e.g. when a Calendar brainstorm can't establish a confident date
- **notes (migration 039)** — id, user_id, title (default 'Untitled'), content (rich text as TipTap JSON, stored in a `text` column), created_at, updated_at. Index on `(user_id, updated_at desc)`. RLS scoped to own notes.
- **leads** (id, user_id, name, email, phone, source, service_interest, value, status, follow_up_date, contacted_at, notes, created_at, **value_type** migration 068 — `'one_time' | 'monthly'`, default `'one_time'`)
- **lead_activities** (id, lead_id, user_id, activity_type, title, content, metadata, created_at)
- **content_posts** (id, user_id, title, platform, platforms text[], content_type, status default 'idea', scheduled_date, published_date, hook, description, tags, goal_id, recurrence_rule, recurrence_end_date, created_at, updated_at) — status pipeline starting at `'idea'` and nullable `scheduled_date` are what let Winston's Content Calendar brainstorm park an undated content idea natively, no extra state needed
- **content_post_occurrences** — id, user_id, post_id, occurrence_date, notes, created_at, updated_at
- **calendar_events** (id, user_id, title, date **not null**, end_date, event_type, notes, created_at, updated_at) — `date` has no nullable/"awaiting" state; a Winston Calendar brainstorm that can't establish a confident date creates an `idea` instead rather than a partial calendar_event
- **project_milestones** (id, project_id, user_id, title, completed, due_date)
- **notifications** (id, user_id, type, title, message, read, created_at, reference_id, link_to) — the free-text column is `message`, not `body` as previously documented; `reference_id`/`link_to` found live, previously undocumented. `type` check constraint extended in migration 071 to include `'awaiting_date'` (one-shot reminder created when a Winston proposal commits an undated idea/content post; explicitly excluded from whatever `generateNotifications` regeneration sweep exists, so it isn't wiped)

---

## AI Tables

- **ai_reports** (id, user_id, report_type, content, generated_at) — stores weekly_digest
- **ai_conversations (migration 032)** — id, user_id, title (default 'New conversation'), project_id (nullable), created_at, updated_at, **note_id** (migration 069 — nullable FK to `notes`, `on delete cascade`, unique per user/note), **scope_key** (migration 072 — nullable text, unique per user where set). Record-level scopes use `note_id`/`project_id`; page-level brainstorms use `scope_key` (`calendar`, `content-calendar`, `global`, section keys). General Winston Chat lists only rows with both `note_id` and `scope_key` null. Do not treat Calendar/Content brainstorms as unscoped — that was the pre-072 shape.
- **ai_conversation_messages** — id, user_id, role, content, created_at, conversation_id
- **ai_context_cache** — user_id, context (jsonb), generated_at. Also used as a short-lived (15 min) cache for email action-items, keyed by a nested key (`email_action_items`) inside the jsonb rather than a new column.
- **ai_usage_log** (id, user_id, feature, input_tokens, output_tokens, created_at)
- **winston_email_picks** — id, user_id, window, date, picks (jsonb), generated_at. Previously documented as subject, sender_name, sender_email, received_at — that shape doesn't exist; the real table stores a whole batch of picks as jsonb per generation window, not one row per email.

### morning_briefings (migration 065)
id, user_id, content jsonb, generated_at, sent_at, briefing_date date
unique(user_id, briefing_date)
Content shape now tier-dependent:
- `content.tier: "paid"` — `{ greeting, date, headline, summary, focuses: [{category, item, href, urgency}], encouragement, generatedAt, tier }` — full experience, `claude-sonnet-4-6`, unchanged from original build.
- `content.tier: "free"` — `{ insight, generatedAt, tier }` — single lightweight insight, `claude-haiku-4-5-20251001`, `max_tokens: 180`. Free tier is now standard for every user, not gated to `ai_pro`/`max`.
`sanitizeBriefingContent()` strips any absolute loopback URL down to a relative path on read/store, as defense-in-depth after the localhost-link incident (see `winston.md`).

### away_summaries (migration 064)
id, user_id, last_synced_at, new_emails jsonb, new_leads jsonb, overdue_tasks jsonb, new_messages jsonb, has_updates boolean
unique(user_id)

### Winston shared proposal infra — no new tables

`src/lib/winston/proposal.ts` and `commit-proposal.ts` define `WinstonProposal`/`WinstonProposalItem` as an application-level contract (5 `entityType`s: `project`, `task`, `calendar_event`, `content_post`, `idea`), not a DB table — commits dispatch to the existing per-entity creation actions (`createProject`, task creation, calendar event creation, `createIdea`, content post creation). See `winston.md` for the full pattern, including the unified three-tier sidebar rollout and the extraction/`scope_key` fixes that resolved Content Calendar write access and dropped project+task commits.

Pipeline Health — no table. Query + `claude-sonnet-4-6` interpretation layer inside the Leads Winston panel. `value`/`valueType` on each flagged lead are sourced directly from the `leads` row, never from Winston-generated text, after the earlier currency-display bug. The same attach-from-source pattern is used by Properties Pro insights (`property_insights.content.sourceFigures`) and AI Digest Pro (`ai_reports.content` lead-intelligence figures). See `leads.md` and `winston.md`.

---

## Properties Tables

Corrected against a live schema pull plus migrations in this repo — this section previously described an earlier version of the Properties package and had drifted the furthest of any section in the doc.

- **properties** (id, user_id, name, status, purchase_price, current_value, monthly_rent, notes, created_at, updated_at, address_line1, address_line2, city, postcode, property_type, bedrooms, bathrooms, alerts_enabled) — previously documented as `address`, `type`, `rent_frequency`; those don't exist. Address is split into `address_line1`/`address_line2`/`city`/`postcode`, type is `property_type`, and there is no `rent_frequency` column on this table at all (it does exist on `tenants` — don't confuse the two).
- **tenants** (id, property_id, user_id, first_name, last_name, email, phone, tenancy_start, tenancy_end, rent_amount, rent_frequency, portal fields, last_seen_at, created_at)
- **maintenance_tickets** (id, property_id, tenant_id, user_id, title, description, category, priority, status, estimated_cost, actual_cost, reported_date, resolved_date, notes, updated_at)
- **rent_payments** (id, property_id, tenant_id, user_id, amount, due_date, paid_date, status)
- **property_certificates** (id, property_id, user_id, **certificate_type**, issue_date, expiry_date, notes) — not `type`.
- **property_documents** (id, property_id, user_id, name, shared_with_tenant, file_path, file_size, file_type, document_type, certificate_id) — previously documented as `type`, `url`; the table stores the file itself (path/size/type) plus a `document_type` classification, not an external url.
- **property_mortgages** (id, property_id, user_id, lender, monthly_payment, interest_rate, outstanding_balance, **mortgage_type**, **fixed_rate_end_date**, migration 052) — type is `mortgage_type`, not `type`; `fixed_rate_end` is `fixed_rate_end_date`.
- **property_insurance** (id, property_id, user_id, insurer, annual_premium, renewal_date, **insurance_type**, migration 052) — type is `insurance_type`.
- **property_valuations** (id, property_id, user_id, rental_min, rental_max, sale_min, sale_max, confidence, search_level, reasoning, web_sources, manual_comparables, generated_at, next_available_at, migration 053) — completely different shape than previously documented (`estimated_value`, `valuation_date`, `source`). This table stores an AI-generated valuation range with supporting reasoning and sources, not a single point-in-time estimate.
- **property_comparables** (id, property_id, user_id, **address**, price, date, comparable_type, source, bedrooms, property_type, notes, migration 053) — previously documented as `sold_price`, `sold_date`; real columns are `price`/`date`, plus `comparable_type`, `source`, `bedrooms`, `property_type`, `notes`. `address` is still a real column — don't drop it.
- **property_insights** (id, user_id, insight_type, content jsonb, generated_at, period_start, period_end, migration 047) — **portfolio-level, not per-property**. There is no `property_id` column. `insight_type` is `'weekly_digest' | 'monthly_digest' | 'inline'`. Pro financial figures live inside `content.sourceFigures` (attached in code after generation, never parsed from Winston prose).
- **tenant_messages** (id, property_id, tenant_id, landlord_user_id, sender_type, sender_id, message, read, created_at, migration 050) — previously documented as `user_id`/`content`/`read_at`; the landlord FK is `landlord_user_id`, the body is `message`, and read state is boolean `read`.
- **contractors** (id, user_id, name, email, phone, trade, notes, created_at, updated_at, migration 057) — no `address` column.
- **job_sheets** (id, user_id, status, ticket_id, contractor_id, contractor_notes, token, property_id, planned_visit_date, migration 057) — previously documented as `maintenance_ticket_id`, `notes`; real columns are `ticket_id` and `contractor_notes`. `token`, `property_id`, `planned_visit_date`, and `contractor_id` are live.
- **job_sheet_updates** (id, job_sheet_id, author, content, created_at, migration 057)
- **contractor_access_requests** (id, job_sheet_id, property_id, tenant_id, requested_date, requested_time, notes, status, tenant_response_at, tenant_note, created_at, migration 057/059) — no `contractor_id` or `user_id` FK; the table keys off `job_sheet_id`. **`property_id` and `tenant_id` both exist** (confirmed in migration 057 and `ContractorAccessRequest` in `src/lib/properties/types.ts`).
- **certificate_alert_log** (migration 047)
- **mortgage_alert_log** (migration 052)
- **insurance_alert_log** (migration 052)
- **rent_reminder_log** (migration 054)

Resolved: `property_alert_log`, previously flagged here as unverified, is confirmed absent from the live schema — superseded by the per-type alert log tables above, not a missing/broken feature.

---

## Other Tables

- **access_requests** (id, email, name, status, notes, created_at) — created in migration 004 with no RLS (writes via admin/service role). Live `information_schema` has since shown RLS enabled with zero policies (deny-all by default); every read/write still goes through the admin client today, which is fine, but this table can never be touched by an anon-key client even for its own intended "submit an access request" use case unless that changes.
- announcements / announcement_dismissals
- **feedback** (id, user_id, type, content, admin_notes, created_at)
- **changelog_entries** (id, title, description, type, published_at, created_by)
- **blog_posts** (id, title, slug, excerpt, content, cover_image_url, published, published_at, author_name, tags, scheduled_for, created_at, updated_at)

---

## Migration Log (060–072)

060 upgrade_banner_dismissed_at · 061 user_subscriptions_properties_pro · 062 landlord_contact_details · 063 last_active_at · 064 away_summaries · 065 morning_briefing · 066 greeting_preferences · **067 pipeline_health_usage** (`ai_usage_log.feature` check adds `'pipeline_health'` — not skipped) · **068 lead_value_type** · **069 ai_conversations note_id** · **070 projects_source_note_id** · **071 notification_awaiting_date** (extends `notifications.type` check constraint) · **072 ai_conversations scope_key** (page-level brainstorm isolation: unique `(user_id, scope_key)` where not null)

Earlier migrations of note: 039 notes, 044 custom_inboxes, 029 winston_chat, 032 ai_conversations, 023 recurring_content, 022 content_multi_platform.

---

## Non-schema code changes worth knowing when reading this doc

These aren't DB changes but materially affect how the AI tables above get used — see `winston.md` for full detail:

- Anthropic timeout constants (`ANTHROPIC_TIMEOUT_MS` 30s, `ANTHROPIC_VALUATION_TIMEOUT_MS` 90s, `ANTHROPIC_STREAM_TIMEOUT_MS` 60s) — every Anthropic call site has a deadline.
- `EMAIL_BASE_URL`/`emailUrl()` — dedicated production-locked URL source for anything in a real Resend email, separate from `NEXT_PUBLIC_SITE_URL` (which can legitimately be localhost in normal dev). `assertEmailHtmlSafe()` throws if `localhost` reaches a real Resend call. A parallel gap in Supabase's own auth emails (password reset, magic link, signup confirmation, admin invite) — which bypassed this entirely — was found in the same audit and fixed with `getSafeAuthRedirectOrigin()`.
- `cachedSystemPrompt`/`cachedSystemParts` (`src/lib/ai/anthropic.ts`) — Anthropic prompt caching, applied across most Winston call sites.
- Morning briefing generate/send now require `VERCEL_ENV=production` (or explicit `ALLOW_LOCAL_MORNING_BRIEFING_CRON=true`) before processing real users — closes the local-dev-hits-prod-data gap that caused the localhost-link incident.
- `toSafeActionError()` (`src/lib/errors/`) — shared helper for Server Action error messages, replacing raw Postgres/PostgREST errors being shown to users. Applied to `properties/actions.ts` and `leads/actions.ts` so far; the other `actions.ts` files still return raw errors and will convert as they're next touched.
- Winston number safety — no Winston-generated prose should contain a figure the model computed itself. Pipeline Health, Properties Pro insights, and AI Digest Pro attach source values in code after generation; draft-email passes a pre-formatted `lead.value` with an explicit "restate this exact figure" instruction.
