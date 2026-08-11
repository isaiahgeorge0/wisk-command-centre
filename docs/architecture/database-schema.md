# WISK — Database Schema

Last updated: July 2026
Migrations current through: 066

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
gender (migration 066 — male|female|unspecified, default unspecified)
greeting_term (migration 066 — optional free-text Winston greeting override)
onboarding_completed, project_tour_completed, feedback_welcome_shown

### user_subscriptions
id, user_id, package, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at, updated_at
Package constraint (migration 061): ('ai', 'ai_pro', 'social', 'commerce', 'properties', 'properties_pro', 'max')
Status values: 'active', 'trialing', 'cancelled', 'past_due'

### user_connections (migration 035)
id, requester_id, recipient_id, status, created_at

### item_shares (migration 035)
id, owner_id, recipient_id, item_type, item_id, permission, created_at

### user_integrations
id, user_id, provider (gmail/outlook/github/vercel), label, is_active, created_at, updated_at, tokens (encrypted)

---

## Work Section Tables

- projects (id, user_id, project_name, client_name, service_type, status, next_action, deadline, value, notes, site_url, github_repo)
- tasks (id, user_id, project_id, title, priority, due_date, completed, notes, updated_at)
- goals (id, user_id, title, category, target, current, unit, deadline, status)
- ideas (id, user_id, title, description, category, status, created_at)
- leads (id, user_id, name, email, phone, source, service_interest, value, status, follow_up_date, contacted_at, notes, created_at)
- lead_activities (id, lead_id, user_id, activity_type, metadata, created_at)
- content_posts (id, user_id, title, platform, status, scheduled_date, published_date, notes)
- calendar_events (id, user_id, title, type, date, notes)
- project_milestones (id, project_id, user_id, title, completed, due_date)
- notifications (id, user_id, type, title, body, read, created_at)

---

## AI Tables

- ai_reports (id, user_id, report_type, content jsonb, generated_at) — stores weekly_digest
- ai_conversations (migration 032)
- ai_conversation_messages
- ai_context_cache
- ai_usage_log (id, user_id, feature, input_tokens, output_tokens, created_at)
- winston_email_picks (id, user_id, subject, sender_name, sender_email, received_at)

### morning_briefings (migration 065)
id, user_id, content jsonb, generated_at, sent_at, briefing_date date
unique(user_id, briefing_date)
Content shape: { greeting, date, teaser, headline, summary, focuses: [{category, item, href, urgency}], encouragement, generatedAt }
(teaser + summary added July 2026; older rows may omit them — UI falls back to headline)

### away_summaries (migration 064)
id, user_id, last_synced_at, new_emails jsonb, new_leads jsonb, overdue_tasks jsonb, new_messages jsonb, has_updates boolean
unique(user_id)

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
- property_alert_log
- rent_reminder_log (migration 054)

---

## Other Tables

- access_requests (id, email, name, created_at)
- announcements / announcement_dismissals
- feedback (id, user_id, type, content, created_at)
- changelog_entries (id, title, body, type, published_at)
- blog_posts
