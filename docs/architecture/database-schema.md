# WISK Database Schema

Last updated: June 2026

This document describes key tables in the WISK Supabase PostgreSQL database. All user-owned tables have Row Level Security (RLS) enabled with policies scoped to `auth.uid() = user_id` unless noted otherwise.

Migrations live in `supabase/migrations/` and are applied sequentially. **Never edit applied migrations** — add a new numbered file for schema changes.

For a full feature inventory, see `docs/product/roadmap.md`.

---

## Core tables (summary)

| Table | Purpose |
|-------|---------|
| `users` | User profile (synced from `auth.users`); includes `username` (migration 034) |
| `user_preferences` | Display name, theme, field visibility, onboarding flags, `ai_access`, `username_set` |
| `user_subscriptions` | Stripe package entitlements (migration 031) |
| `user_connections` | User-to-user connection requests (migration 035) |
| `item_shares` | Shared item permissions (migration 035) |
| `projects` | Client projects |
| `tasks` | Tasks (optional project link) |
| `goals` | Business goals with progress tracking |
| `ideas` | Idea bank |
| `leads` | Sales pipeline (includes `follow_up_date` — migration 033) |
| `lead_activities` | Lead engagement timeline (migration 033) |
| `content_posts` | Content calendar and board |
| `project_milestones` | Milestones per project |
| `notifications` | In-app notifications |
| `user_integrations` | Encrypted Vercel/GitHub tokens |
| `access_requests` | Marketing/sign-in access requests |
| `announcements` / `announcement_dismissals` | Platform announcements |
| `feedback` | User feedback submissions |
| `changelog_entries` | What's New panel entries |
| `blog_posts` | Marketing blog (admin-authored) |
| `ai_reports` | Winston weekly digest content |
| `ai_conversations` | Winston Chat conversation threads (migration 032) |
| `ai_conversation_messages` | Winston Chat messages (migration 029) |
| `ai_context_cache` | Cached user context for chat (migration 029) |
| `ai_usage_log` | Claude API token usage (migration 030) |
| `properties` | Landlord property portfolio (migration 046) |
| `tenants` | Tenancy records; portal and rent due fields (046, 050–051, 054) |
| `rent_payments` | Rent payment tracking (migration 046) |
| `property_valuations` | Winston market valuations (migration 053) |

---

---

## `leads` (`follow_up_date` — migration 033)

Sales pipeline leads. Migration 033 adds a follow-up reminder date.

| Column | Type | Notes |
|--------|------|-------|
| `follow_up_date` | date | Nullable; optional follow-up reminder date. Used for overdue detection in table view and notifications. |

All other `leads` columns are unchanged from the original schema.

---

## `lead_activities` (migration 033)

Timeline of interactions and system events per lead.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `lead_id` | uuid | References `public.leads(id)` |
| `user_id` | uuid | References `public.users(id)` |
| `activity_type` | text | `note` \| `call` \| `email` \| `meeting` \| `stage_change` \| `follow_up_set` \| `ai_notes` |
| `title` | text | Short summary of the activity |
| `content` | text | Nullable; longer notes or body text |
| `metadata` | jsonb | Nullable; structured extras (e.g. stage change, sentiment, extracted details) |
| `created_at` | timestamptz | Default `now()` |

**RLS:** Users can select, insert, and delete their own rows.

**Triggers:** Stage changes on `leads` are auto-logged as `stage_change` activities via database trigger.

---

## `tasks` (updated migration 028)

Tasks table with an `updated_at` column added in migration `028_tasks_updated_at.sql`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References `public.users(id)` |
| `project_id` | uuid | Nullable; references `projects(id)` |
| `title` | text | |
| `completed` | boolean | |
| `due_date` | date | Nullable |
| `priority` | text | high / medium / low |
| `raw_content` | text | Notes field |
| `created_at` | timestamptz | |
| **`updated_at`** | **timestamptz** | **Added migration 028; auto-updated via `set_tasks_updated_at` trigger on every row change. Used by Winston context builder to detect recently completed tasks.** |

---

## `calendar_events` (migration 026)

Standalone lifestyle/personal and other events on the main calendar (not tied to projects, tasks, or content).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References `public.users(id)` on delete cascade |
| `title` | text | Not null |
| `date` | date | Not null |
| `end_date` | date | Nullable |
| `event_type` | text | `'lifestyle'` \| `'other'` |
| `notes` | text | Nullable |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |

**RLS:** Users can select, insert, update, and delete their own rows.

**Index:** `calendar_events_user_date_idx` on `(user_id, date)`.

---

## `ai_conversation_messages` (migration 029)

Stores Winston Chat conversation history per user.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References `public.users(id)` on delete cascade |
| `role` | text | `'user'` \| `'assistant'` |
| `content` | text | Message body |
| `created_at` | timestamptz | Default `now()` |

**RLS:** Users can view, insert, and delete their own messages. No update policy (messages are immutable).

**Behaviour:** Chat API sends the last 20 messages within a 12-hour window as Claude context. Messages older than 12 hours remain in the database but are excluded from active view and AI context until the user explicitly views archived history.

---

## `ai_context_cache` (migration 029)

Caches the output of `buildUserContext()` per user to reduce database load on every chat message.

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid | Primary key; references `public.users(id)` on delete cascade |
| `context` | jsonb | Serialised `UserContext` object |
| `generated_at` | timestamptz | Default `now()` |

**RLS:** Users can view their own cache row. Inserts/updates are performed by the admin (service role) client only — no user write policy.

**TTL:** 24 hours. Stale cache is rebuilt on next chat request.

---

## `ai_usage_log` (migration 030)

Records token usage for every successful Claude API call (chat and digest).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References `public.users(id)` on delete cascade |
| `feature` | text | `'chat'` \| `'digest'` |
| `input_tokens` | integer | Default 0 |
| `output_tokens` | integer | Default 0 |
| `created_at` | timestamptz | Default `now()` |

**RLS:** Users can view their own usage rows. Inserts are performed by the admin (service role) client only.

**Index:** `ai_usage_log_user_created_idx` on `(user_id, created_at)` — used for monthly and short-term rate limit queries.

**Rate limits (chat only):**
- Monthly: 100,000 tokens (input + output summed)
- Short-term: 10 messages per 5 minutes (count-based)

Constants defined in `src/lib/ai/constants.ts`.

---

## `ai_reports`

Stores generated Winston weekly digest content (pre-existing table; used by AI Digest).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References `public.users(id)` |
| `report_type` | text | e.g. `'weekly_digest'` |
| `content` | text | JSON serialised digest |
| `generated_at` | timestamptz | |

---

## `public.users` (updated migration 034)

User profile synced from `auth.users`.

| Column | Type | Notes |
|--------|------|-------|
| `username` | text | Unique, case-insensitive index; nullable until set |

---

## `user_preferences` (relevant fields)

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid | Primary key |
| `ai_access` | boolean | Default `false` (migration 027); gates Winston Digest and Chat |
| `username_set` | boolean | Default `false` (migration 034); tracks whether user has chosen a username |
| `personalisation_completed` | boolean | Auth/onboarding gate |
| `onboarding_completed` | boolean | Product tour completion |
| `field_visibility` | jsonb | Per-section field toggles |
| `display_name` | text | Shown throughout UI |
| `theme_preference` | text | light / dark / system |

---

## `user_subscriptions` (migration 031)

Stripe package entitlements per user.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References `public.users(id)` |
| `package` | text | `ai` \| `ai_pro` \| `social` \| `commerce` \| `properties` \| `max` |
| `status` | text | `active` \| `trialing` \| `cancelled` \| `past_due` |
| `stripe_customer_id` | text | Nullable |
| `stripe_subscription_id` | text | Nullable |
| `current_period_end` | timestamptz | Nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**RLS:** Users can view their own rows. Inserts/updates via admin client only (webhook handler).

---

## `ai_conversations` (migration 032)

Winston Chat conversation threads. Messages link via `conversation_id` on `ai_conversation_messages`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References `public.users(id)` |
| `title` | text | Default `'New conversation'` |
| `project_id` | uuid | References `projects(id)`; nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated via trigger on new messages |

**RLS:** Users can select, insert, update, and delete their own rows.

---

## `user_connections` (migration 035)

User-to-user connection requests (collaboration social graph).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `requester_id` | uuid | References `public.users(id)` |
| `recipient_id` | uuid | References `public.users(id)` |
| `status` | text | `pending` \| `accepted` \| `declined` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Constraints:** `unique(requester_id, recipient_id)`; `check(requester_id != recipient_id)`.

**RLS:** Requester and recipient can view; requester inserts; recipient updates; either party can delete.

---

## `item_shares` (migration 035)

Shared item permissions between connected users. RLS on item tables not yet updated (Phase B).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `owner_id` | uuid | References `public.users(id)` |
| `recipient_id` | uuid | References `public.users(id)` |
| `item_type` | text | `project` \| `task` \| `goal` \| `idea` \| `lead` \| `content` \| `calendar_event` |
| `item_id` | uuid | ID of the shared item |
| `permission` | text | `view` \| `edit` |
| `created_at` | timestamptz | |

**RLS:** Owner and recipient can view; owner inserts and deletes.

---

## Relationships (AI / Winston)

```
public.users
    ├── ai_conversations (1:many)
    ├── ai_conversation_messages (1:many)
    ├── ai_context_cache (1:1)
    ├── ai_usage_log (1:many)
    ├── ai_reports (1:many)
    ├── user_subscriptions (1:many)
    ├── user_connections (1:many as requester or recipient)
    ├── item_shares (1:many as owner or recipient)
    └── user_preferences.ai_access (boolean gate)
```

---

## Relationships (Collaboration)

```
public.users
    ├── user_connections (requester_id / recipient_id)
    └── item_shares (owner_id / recipient_id)
```

---

## Migration index (recent)

| Migration | Description |
|-----------|-------------|
| `026_calendar_events.sql` | `calendar_events` table |
| `028_tasks_updated_at.sql` | `tasks.updated_at` column + trigger |
| `029_winston_chat.sql` | `ai_conversation_messages`, `ai_context_cache` |
| `030_winston_usage.sql` | `ai_usage_log` table |
| `031_user_subscriptions.sql` | `user_subscriptions` table |
| `032_ai_conversations.sql` | `ai_conversations` table; `conversation_id` on messages |
| `033_lead_activities.sql` | `lead_activities` table; `follow_up_date` on `leads`; stage-change trigger |
| `034_usernames.sql` | `username` on `users`; `username_set` on `user_preferences` |
| `035_collaboration_foundation.sql` | `user_connections`, `item_shares` tables |
| `036_notification_suggestion_types.sql` | `suggestion_*` notification types |
| `046_properties_foundation.sql` | `properties`, `tenants`, `maintenance_tickets`, `rent_payments`, `property_certificates`, `property_documents` |
| `047_certificate_alerts.sql` | `certificate_alert_log`, `property_insights`; `alerts_enabled` on `properties` |
| `050_tenant_portal.sql` | Tenant portal fields on `tenants`; `tenant_messages`; `shared_with_tenant` on documents |
| `051_tenant_portal_theme.sql` | `portal_theme` on `tenants` |
| `052_property_finances_extended.sql` | `property_mortgages`, `property_insurance`, alert log tables; post-expiry certificate alert types |
| `053_property_valuation.sql` | `property_valuations`, `property_comparables` |
| `054_rent_due_tracking.sql` | `rent_due_day`, `rent_reminder_days`, `rent_reminder_enabled` on `tenants`; `rent_reminder_log` |

---

## Properties package tables (migrations 046–054)

Gated by `user_subscriptions.package = 'properties'` (or `max`). All tables below use RLS scoped to `auth.uid() = user_id` unless noted.

### `properties` (migration 046)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References `public.users(id)` |
| `name` | text | Display name |
| `address_line1`, `address_line2`, `city`, `postcode` | text | UK address |
| `property_type` | text | `flat` \| `house` \| `hmo` \| `commercial` \| `other` |
| `bedrooms`, `bathrooms` | integer | Nullable |
| `status` | text | `occupied` \| `vacant` \| `maintenance` \| `listed` |
| `purchase_price`, `current_value`, `monthly_rent` | numeric | Nullable |
| `notes` | text | Nullable |
| `alerts_enabled` | boolean | Default `true` (migration 047) |
| `created_at`, `updated_at` | timestamptz | Auto-updated via trigger |

### `tenants` (migrations 046, 050, 051, 054)

Core tenancy fields in migration 046. Additional columns:

| Column | Type | Notes |
|--------|------|-------|
| `portal_enabled` | boolean | Default `false` (050) |
| `portal_user_id` | uuid | References `auth.users(id)`; nullable (050) |
| `portal_invited_at` | timestamptz | Nullable (050) |
| `portal_invite_token` | text | Nullable; unique when set (050) |
| `portal_theme` | text | `light` \| `dark` (051) |
| `rent_due_day` | integer | Nullable; 1–28 (054) |
| `rent_reminder_days` | integer | 0–7; default 0 (054) |
| `rent_reminder_enabled` | boolean | Default `true` (054) |

### `rent_payments` (migration 046)

| Column | Type | Notes |
|--------|------|-------|
| `status` | text | `pending` \| `paid` \| `late` \| `partial` \| `missed` |
| `due_date` | date | Payment due date |
| `paid_date` | date | Nullable |
| `amount` | numeric | Rent amount |

Cron auto-creates `pending` records when `rent_due_day` is set and the due date has passed.

### `rent_reminder_log` (migration 054)

One landlord reminder email per tenant per month.

| Column | Type | Notes |
|--------|------|-------|
| `tenant_id` | uuid | References `tenants(id)` |
| `property_id` | uuid | References `properties(id)` |
| `month` | date | First day of month (e.g. `2026-06-01`) |
| `sent_at` | timestamptz | Default `now()` |

**Constraint:** `unique(tenant_id, month)`

### `certificate_alert_log` (migration 047)

| Column | Type | Notes |
|--------|------|-------|
| `certificate_id` | uuid | References `property_certificates(id)` |
| `alert_type` | text | `90_days` \| `30_days` \| `7_days` \| `expired` \| `7_days_overdue` \| `30_days_overdue` (052 extends) |

### `property_mortgages` / `property_insurance` (migration 052)

Mortgage and insurance records per property with `alerts_enabled` toggle. Alert logs: `mortgage_alert_log`, `insurance_alert_log` — same pattern as certificate alerts.

### `property_valuations` (migration 053)

Winston-generated rental and sale estimates.

| Column | Type | Notes |
|--------|------|-------|
| `rental_min`, `rental_max` | numeric | Nullable monthly figures |
| `sale_min`, `sale_max` | numeric | Nullable total values |
| `confidence` | text | `high` \| `medium` \| `low` |
| `search_level` | text | `postcode` \| `town` |
| `reasoning` | text | Winston explanation |
| `web_sources` | jsonb | Nullable |
| `generated_at` | timestamptz | |
| `next_available_at` | timestamptz | 3-month cooldown |

### `property_insights` (migration 047)

Winston portfolio insight content (JSON), similar pattern to `ai_reports`.

### `tenant_messages` (migration 050)

Landlord–tenant messaging. RLS allows landlord (`landlord_user_id`) and linked tenant (`portal_user_id`) access.

---

## Relationships (Properties)

```
public.users
    └── properties (1:many)
            ├── tenants (1:many)
            │       ├── rent_payments (1:many)
            │       ├── rent_reminder_log (1:many per month)
            │       └── tenant_messages (1:many)
            ├── maintenance_tickets (1:many)
            ├── property_certificates (1:many)
            ├── property_documents (1:many)
            ├── property_mortgages (1:many)
            ├── property_insurance (1:many)
            ├── property_valuations (1:many)
            └── property_comparables (1:many)
```

