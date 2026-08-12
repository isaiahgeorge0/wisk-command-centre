# WISK — Database Schema

Last updated: August 2026 (synced against a full day of Winston/AI feature work — Pipeline Health, lead value types, Notes brainstorming, notes→projects, Calendar/Content Winston, morning briefing free tier)
Migrations current through: 071

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

- projects (id, user_id, project_name, client_name, service_type, status, next_action, deadline, value, notes, site_url, github_repo, **source_note_id** migration 070 — nullable FK to `notes`, `on delete set null`, set when a project is created via Winston's notes→projects conversion; indexed)
- tasks (id, user_id, project_id, title, priority, due_date, completed, notes, updated_at)
- goals (id, user_id, title, category, target, current, unit, deadline, status)
- ideas (id, user_id, title, description, category, status, created_at) — now also created via the Winston shared proposal commit path (`idea` is one of five `entityType`s in `WinstonProposal`), e.g. when a Calendar brainstorm can't establish a confident date
- **notes (migration 039)** — id, user_id, title (default 'Untitled'), content (rich text as TipTap JSON, stored in a `text` column), created_at, updated_at. Index on `(user_id, updated_at desc)`. RLS scoped to own notes.
- leads (id, user_id, name, email, phone, source, service_interest, value, status, follow_up_date, contacted_at, notes, created_at, **value_type** migration 068 — `'one_time' | 'monthly'`, default `'one_time'`)
- lead_activities (id, lead_id, user_id, activity_type, metadata, created_at)
- content_posts (id, user_id, title, platform, platforms text[], content_type, status default 'idea', scheduled_date, published_date, hook, description, tags, goal_id, recurrence_rule, recurrence_end_date, created_at, updated_at) — status pipeline starting at `'idea'` and nullable `scheduled_date` are what let Winston's Content Calendar brainstorm park an undated content idea natively, no extra state needed
- **content_post_occurrences** — id, user_id, post_id, occurrence_date, notes, created_at, updated_at
- calendar_events (id, user_id, title, date **not null**, end_date, event_type, notes, created_at, updated_at) — `date` has no nullable/"awaiting" state; a Winston Calendar brainstorm that can't establish a confident date creates an `idea` instead rather than a partial calendar_event
- project_milestones (id, project_id, user_id, title, completed, due_date)
- notifications (id, user_id, type, title, body, read, created_at) — `type` check constraint extended in migration 071 to include `'awaiting_date'` (one-shot reminder created when a Winston proposal commits an undated idea/content post; explicitly excluded from whatever `generateNotifications` regeneration sweep exists, so it isn't wiped)

---

## AI Tables

- ai_reports (id, user_id, report_type, content, generated_at) — stores weekly_digest
- ai_conversations (migration 032) — id, user_id, title (default 'New conversation'), project_id (nullable), created_at, updated_at, **note_id** (migration 069 — nullable FK to `notes`, `on delete cascade`, unique per user/note), **scope_key** (migration 072 — nullable text, unique per user where set). Record-level scopes use `note_id`/`project_id`; page-level brainstorms use `scope_key` (`calendar`, `content-calendar`). General Winston Chat lists only rows with both `note_id` and `scope_key` null.
- ai_conversation_messages — id, user_id, role, content, created_at, conversation_id
- ai_context_cache — user_id, context (jsonb), generated_at. Also used as a short-lived (15 min) cache for email action-items, keyed by a nested key (`email_action_items`) inside the jsonb rather than a new column.
- ai_usage_log (id, user_id, feature, input_tokens, output_tokens, created_at)
- winston_email_picks (id, user_id, subject, sender_name, sender_email, received_at)

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

`src/lib/winston/proposal.ts` and `commit-proposal.ts` define `WinstonProposal`/`WinstonProposalItem` as an application-level contract (5 `entityType`s: `project`, `task`, `calendar_event`, `content_post`, `idea`), not a DB table — commits dispatch to the existing per-entity creation actions (`createProject`, task creation, calendar event creation, `createIdea`, content post creation). See `winston.md` for the full pattern.

Pipeline Health — no table. Fully built now (was a stub as of the last sync): query + `claude-sonnet-4-6` interpretation layer inside the Leads Winston panel. `value`/`valueType` on each flagged lead are sourced directly from the `leads` row, never from Winston-generated text, after the earlier currency-display bug. See `leads.md` and `winston.md`.

---

## Properties Tables

- properties (id, user_id, name, address, type, status, purchase_price, current_value, monthly_rent, rent_frequency, created_at)
- tenants (id, property_id, user_id, first_name, last_name, email, phone, tenancy_start, tenancy_end, rent_amount, rent_frequency, portal fields, created_at)
- maintenance_tickets (id, property_id, tenant_id, user_id, title, description, category, priority, status, estimated_cost, actual_cost, reported_date, resolved_date, notes, updated_at)
- rent_payments (id, property_id, tenant_id, user_id, amount, due_date, paid_date, status)
- property_certificates (id, property_id, user_id, type, issue_date, expiry_date, notes)
- property_documents (id, property_id, user_id, name, type, url, shared_with_tenant)
- property_mortgages (id, property_id, user_id, lender, type, monthly_payment, interest_rate, fixed_rate_end, outstanding_balance, migration 052)
- property_insurance (id, property_id, user_id, insurer, type, annual_premium, renewal_date, migration 052)
- property_valuations (id, property_id, user_id, estimated_value, valuation_date, source, migration 053)
- property_comparables (id, property_id, user_id, address, sold_price, sold_date, migration 053)
- property_insights (id, property_id, user_id, content jsonb, generated_at, migration 047)
- tenant_messages (id, property_id, tenant_id, user_id, content, sender_type, read_at, migration 050)
- contractors (id, user_id, name, email, phone, trade, address, notes, migration 057)
- job_sheets (id, maintenance_ticket_id, contractor_id, user_id, status, notes, migration 057)
- job_sheet_updates (id, job_sheet_id, content, created_at, migration 057)
- contractor_access_requests (id, property_id, tenant_id, contractor_id, user_id, status, tenant_note, migration 057/059)
- certificate_alert_log (migration 047)
- mortgage_alert_log (migration 052)
- insurance_alert_log (migration 052)
- rent_reminder_log (migration 054)

Note: `property_alert_log` was previously documented here but did not appear in the live table list — verify whether it was renamed/merged or never shipped.

---

## Other Tables

- access_requests (id, email, name, status, notes, created_at)
- announcements / announcement_dismissals
- feedback (id, user_id, type, content, admin_notes, created_at)
- changelog_entries (id, title, description, type, published_at, created_by)
- blog_posts (id, title, slug, excerpt, content, cover_image_url, published, published_at, author_name, tags, scheduled_for, created_at, updated_at)

---

## Migration Log (060–072)

060 upgrade_banner_dismissed_at · 061 user_subscriptions_properties_pro · 062 landlord_contact_details · 063 last_active_at · 064 away_summaries · 065 morning_briefing · 066 greeting_preferences · **068 lead_value_type** (067 skipped/reserved) · **069 ai_conversations note_id** · **070 projects_source_note_id** · **071 notification_awaiting_date** · **072 ai_conversations scope_key** (page-level brainstorm isolation: unique `(user_id, scope_key)` where not null)

Earlier migrations of note: 039 notes, 044 custom_inboxes, 029 winston_chat, 032 ai_conversations, 023 recurring_content, 022 content_multi_platform.

---

## Non-schema code changes worth knowing when reading this doc

These aren't DB changes but materially affect how the AI tables above get used — see `winston.md` for full detail:
- Anthropic timeout constants (`ANTHROPIC_TIMEOUT_MS` 30s, `ANTHROPIC_VALUATION_TIMEOUT_MS` 90s, `ANTHROPIC_STREAM_TIMEOUT_MS` 60s) — every Anthropic call site now has a deadline; none did before.
- `EMAIL_BASE_URL`/`emailUrl()` — dedicated production-locked URL source for anything in a real email, separate from `NEXT_PUBLIC_SITE_URL` (which can legitimately be localhost in normal dev). `assertEmailHtmlSafe()` throws if `localhost` reaches a real Resend call.
- `cachedSystemPrompt`/`cachedSystemParts` (`src/lib/ai/anthropic.ts`) — Anthropic prompt caching, applied across most Winston call sites.
- Morning briefing generate/send now require `VERCEL_ENV=production` (or explicit `ALLOW_LOCAL_MORNING_BRIEFING_CRON=true`) before processing real users — closes the local-dev-hits-prod-data gap that caused the localhost-link incident.
