# WISK — Feature Inventory

Last updated: June 2026

This document is a complete record of every 
feature in WISK. It is the source of truth 
for what exists, what is planned, and what 
is speculative.

Status definitions:
- **Live** — built, deployed, used by real users
- **In progress** — currently being built
- **Planned** — committed to building, not started
- **Speculative** — under consideration, not committed

---

## Core Platform

### Authentication & Access
- Status: Live
- Invite-only access control
- Email and password sign in via Supabase Auth
- Request access form on marketing site and sign-in page
- Request access confirmation email from both surfaces
- "Already registered" detection on both marketing
  and command centre request access forms
- Admin approval workflow with Resend approval
  notification email
- Branded Supabase email templates (invite, password reset)
- Full auth flow overhaul:
  - Invite → `/set-password` (combined account setup:
    name, theme, password, terms acceptance)
  - WISK acronym reveal animation on setup page
  - Forgot password dedicated page (`/forgot-password`)
  - Password reset flow (cross-device via implicit flow)
- Privacy Policy and Terms of Service linked from
  Settings; terms acceptance checkbox on account setup
- Row Level Security on all tables

### Personalisation & Onboarding
- Status: Live
- Personalisation page on first login
  (display name, theme preference)
- Sign in to welcome page transition animation
- 10-slide onboarding tour with spiral 
  opening animation
- Project spotlight tour for first project
  (zero projects only)
- Post-onboarding feedback welcome modal
- All flows tracked via user_preferences
  and never shown again once completed

### Navigation
- Status: Live
- Fixed top navigation bar
- Purple to teal WISK wordmark
- Desktop: full nav links
- Mobile: bottom navigation bar
  (Projects, Tasks, Goals, Ideas, Content, Leads)
- Settings gear icon
- Notifications bell with unread badge
- What's new sparkle button with unread badge
- Theme toggle (dark/light)
- User menu with display name and sign out

---

## Dashboard Sections

### Overview
- Status: Live
- Time-aware homepage
  (Monday = Plan your week,
  Sunday = Weekly reflection,
  Other days = Good morning/afternoon/evening
  with display name)
- Four stat cards:
  Active projects, Tasks due/overdue,
  Goals in progress, Ideas in bank
- Needs attention section:
  Overdue tasks, Projects missing next action,
  Goals at 0% with deadline
- This week section:
  Tasks grouped by due date,
  Project deadlines,
  Content due
- Recently added section:
  Latest ideas, Latest projects with
  task progress
- Recent leads section
- Mobile weekly calendar strip

### Projects
- Status: Live
- Project cards with expand/collapse
- Three tabs per project: Details, Tasks, 
  Milestones
- Fields: project name, client name (optional),
  project type (free text with autocomplete),
  status, next action, deadline, value,
  notes, site URL (web/app projects only),
  GitHub repo (web/app projects only)
- Status badges: Active, Paused, 
  Completed, Archived
- Task progress bar on collapsed card
- Inline edit and delete with confirmation
- Quick-add modal via FAB and Add button
- Recent project types autocomplete
- Vercel site health per project
  (requires Vercel integration)
- GitHub activity per project
  (requires GitHub integration)
- Milestones: add, tick off, delete
  Milestones appear on calendar
- Filtering: search by name, filter by
  status and service type
- Sorting: by name, deadline, value,
  date created (asc/desc)
- Status grouping: Active, Paused,
  Completed & Archived (collapsed)
- Active filter count badge on filter bar

### Tasks
- Status: Live
- Tasks list grouped:
  Incomplete tasks, Completed (collapsed)
- Fields: title, project link (optional),
  due date, priority (high/medium/low),
  completed, notes (raw_content)
- Priority badges: High coral, Medium amber,
  Low gray
- Due date colouring: overdue red,
  today amber, upcoming muted
- Project tag on each row
- Checkbox with optimistic toggle
- Always-visible edit/delete on mobile
- Hover edit/delete on desktop
- Expandable rows with detail panel
  (one expanded at a time)
- Inline edit
- Quick-add modal via FAB and Add button
- FAB opens task dialog on overview
  and calendar pages globally
- Calendar day quick-add pre-fills due date
- Show completed toggle with count
- Notes field: freeform text displayed
  below task metadata when present
- Filtering: search by title, filter by
  priority, status, and project
- Sorting: by due date, priority, title
- Active filter count badge on filter bar
- Project task detail overlay from project
  cards (edit in place)
- Note: File attachments deferred to
  subscription packages (see Phase 2)

### Goals
- Status: Live
- Goals grouped: Active, Paused,
  Completed/archived (collapsed)
- Fields: title, category, target, current,
  unit, deadline, status
- Progress bar with colour banding:
  0-33% coral, 34-66% amber,
  67-99% teal, 100% green
- Animated progress bar on load
- Quick +/- controls
- Click progress bar to open popover
  for precise update
- Left border accent matching progress tone
- Inline edit
- Quick-add modal via FAB and Add button
- Content goal linking:
  Published post count shown on goal card

### Ideas
- Status: Live
- Ideas grouped: New and exploring,
  In progress, Parked and dropped (collapsed)
- Fields: title, description, category,
  status
- Status badges: New teal, Exploring purple,
  In progress amber, Parked gray,
  Dropped gray
- Click to expand full description
- Inline edit
- Quick-add modal via FAB and Add button
- Convert idea to project:
  creates a project pre-filled from idea data
- Convert idea to content post:
  creates a content post pre-filled from idea

### Calendar
- Status: Live
- Monthly grid (Mon-Sun)
- Today highlighted with teal circle
- Colour-coded pills per event type:
  Projects purple, Tasks teal,
  Goals amber, Milestones rose,
  Content coral, Lifestyle/Personal sky,
  Other slate
- Filter toggles per event type
  (all types on by default)
- Click day cell to open day detail panel
  (slides in from right on desktop,
  bottom sheet on mobile)
- Click event pill to open view-only
  event detail panel with edit action
  (same panel/sheet pattern as day detail)
- Day cell + menu: add task, content,
  lifestyle/personal, or other event
- Date pre-fill on quick-add from day cells
- Standalone lifestyle/other events
  (`calendar_events` table)
- Recurring content posts shown on main
  calendar (windowed expansion)
- Global content quick-add from calendar
- Content calendar tab: day + button,
  pill click opens event detail panel
- Upcoming panel below calendar:
  30, 60, 90 day tabs with counts
- Items grouped by type in upcoming panel
- Urgency colouring: overdue red,
  today amber, upcoming muted
- Note: Calendar-level recurring events
  (non-content) not yet built

### Leads
- Status: Live
- Vertical pipeline with horizontal cards
- Six stages: New, Contacted, Qualified,
  Proposal sent, Won, Lost
- Stage colour accents:
  New blue, Contacted purple,
  Qualified amber, Proposal sent teal,
  Won green, Lost gray
- Collapse/expand per stage
- Drag and drop between stages (desktop)
- Status menu for mobile/touch
- Won celebration: green flash and confetti
- Fields: name, email, phone, source,
  service interest, status, value, notes
- Source badges
- Stats bar: Leads this month,
  Conversion rate, Pipeline value,
  Average response time
- Inline edit, delete with confirmation
- Quick-add modal via FAB and Add button
- Recent leads on Overview page
- Convert lead to project:
  modal collects project name, deadline,
  first task, and value before creation;
  skip option for name-only conversion;
  marks lead as won with celebration

### Content
- Status: Live
- Two tabs: Calendar view, Board view
- Multi-platform selection per post
  (TikTok, Instagram, YouTube, LinkedIn,
  Facebook, Twitter/X, Other)
- Platform colour coding throughout
- Fields: title, platforms, content type,
  status, scheduled date, published date,
  hook, description, tags, goal link
- Content types: Video, Reel, Short, Post,
  Story, Article, Thread, Other
- Status pipeline: Idea, Planned,
  In progress, Scheduled, Published
- Board view: vertical stages with
  horizontal cards (same pattern as Leads)
- Drag and drop between stages (desktop)
- Stats bar: Published this month,
  Scheduled upcoming, In progress,
  Content streak with flame icon
- Platform breakdown stats
- Published date auto-set when moved
  to Published status
- Calendar tab: monthly grid with
  platform-coloured pills
- Goal linking: content goals show
  published post count
- Content events on main Calendar page
- Recurring content: recurrence rule
  (daily, weekly, monthly, yearly) and
  optional end date per post
- Occurrence panel: per-occurrence notes
  and status management
- Note: Social media API integration
  not yet built (Phase 3.3)

### AI Digest / Winston
- Status: Live
- Winston section at `/ai-digest` with Digest and Chat tabs
  (`SectionSubNav` reusable sub-navigation)
- **Digest:** Auto-generates every Sunday via GitHub Actions;
  six sections (week in review, wins, needs attention,
  week ahead, Winston's insight, Winston's recommendation);
  stored in `ai_reports`; gated by `ai_access` in
  `user_preferences`
- **Chat (WISK Chat v1):** Conversational AI interface;
  conversation persistence (`ai_conversation_messages`);
  12-hour conversation expiry with archive view;
  token-based rate limiting (100,000 tokens/month chat);
  short-term limit (10 messages/5 minutes);
  usage tracking (`ai_usage_log`); usage display in
  chat and Settings
- Context caching (`ai_context_cache`, 24-hour TTL)
- Winston teaser page for users without `ai_access`
- Admin can generate digest per user from admin panel

---

## Settings

### Profile
- Status: Live
- Display name (shown throughout UI)
- Account name (public.users.name)
- Password change
- Avatar initials display

### Preferences
- Status: Live
- Field visibility toggles per section:
  Projects, Tasks, Goals, Ideas
- All toggles persist to user_preferences

### Project Types
- Status: Live
- Manageable list of project types
- Add, reorder, delete
- Used as autocomplete suggestions
  in project form

### Integrations
- Status: Live
- Vercel: token connect, project import,
  site health monitoring
- GitHub: token connect, repo activity
  per project
- Tokens encrypted at rest (AES-256-GCM)
- Architecture supports future OAuth
  integrations (social media etc)

### Help
- Status: Live
- Restart walkthrough button
- Feature reference cards per section
- Legal links: Privacy Policy, Terms of Service

### Winston Usage
- Status: Live (visible when `ai_access` is enabled)
- Monthly token usage breakdown in Settings
  (chat vs digest, progress bar, reset date)
- Lightweight usage bar on Winston Chat page

### Feedback
- Status: Live
- Type dropdown: Bug report,
  Feature request, General feedback
- Message textarea
- Multiple submissions allowed
- Submits to feedback table in Supabase

---

## Notifications

- Status: Live
- Bell icon in top nav with unread badge
- Dropdown panel with last 10 notifications
- Notification types:
  Overdue task (coral),
  Deadline approaching (amber),
  Stalled project (amber),
  Goal no progress (purple)
- Mark as read, mark all as read,
  clear read notifications
- Stale notifications auto-deleted
  when condition resolves
- Generated on dashboard load

---

## What's New / Changelog

- Status: Live (user-facing)
- Sparkle icon in top nav
- Unread badge count
- Panel shows last 10 entries
- Type badges: Feature teal,
  Improvement purple, Fix amber
- Opening marks all as read
- Admin manages entries at /admin/changelog

---

## Announcements

- Status: Live
- Admin creates announcements
- Dismissible banner on dashboard
- One at a time, oldest first
- Never shown again once dismissed
- Expires at date supported

---

## Admin Panel

Location: app.wiskapp.com/admin
Access: Admin email only (ADMIN_EMAIL env var)

### Overview (/admin)
- Status: Live
- Stat cards: Total requests, Pending,
  Total users, Requests this week
- Platform metrics: Total projects, tasks,
  leads, content posts across all users
- Most active sections bar chart
  (section accent colours)
- Recent access requests (last 5)
- Recent signups (last 5)
- Quick actions: Create user, Reset
  onboarding, Reset personalisation,
  Send announcement

### Access Requests (/admin/requests)
- Status: Live
- All requests from wiskapp.com form
- Filter: All, Pending, Approved, Declined
- Search by name or email
- Days waiting per pending request
- Per-request notes field
- Approve with customisable welcome message
  (sends Supabase invite email)
- Decline action
- Pending sorted oldest first

### Users (/admin/users)
- Status: Live
- All users with health data
- Last login, project count, task count,
  days since joined
- Activity badges: Active (≤7 days),
  Inactive (8-30 days), Dormant (30+ days)
- Summary cards above table
- Search by name or email
- Winston access toggle per user (`ai_access`)
- Per-user digest generation trigger
  (when `ai_access` is enabled)

### Announcements (/admin/announcements)
- Status: Live
- Create, list, delete announcements
- Dismissal count per announcement
- Optional expiry date

### Blog (/admin/blog)
- Status: Live
- Create, edit, publish, unpublish,
  delete blog posts
- Markdown editor with toolbar
  (Bold, Italic, Heading, Link, Code, List)
- Write/Preview tabs
- Auto-generated slug from title
- Live slug preview: wiskapp.com/blog/{slug}
- Cover image URL, tags, author name
- Three publish states: Draft, Schedule
  for later, Publish now
- Scheduled status badge in list view
- Cancel schedule action on scheduled posts
- GitHub Actions workflow publishes
  scheduled posts every 10 minutes
  (Vercel Hobby does not run crons)
- Unsaved changes warning

### Feedback (/admin/feedback)
- Status: Live
- All user feedback submissions
- Filter: All, New, Reviewed, Actioned
- Search by message or user name
- Expand row for full message
- Status updates and internal notes
- Bug icon on bug report type
- Unread badge on admin nav

### Changelog (/admin/changelog)
- Status: Live
- Create, list, delete changelog entries
- Types: Feature, Improvement, Fix
- Published date

---

## Marketing Site (wiskapp.com)

Separate deployment from this repository.
Posts are authored in the command centre
admin blog and read by the marketing site.

- Status: Live
- Hero section with animated background
- Word-stagger headline animation
- Feature cards (6 sections)
- Testimonials section
- Request access form
  (submits to access_requests table;
  "already registered" detection for existing accounts)
- Request access confirmation email
- Blog at wiskapp.com/blog
- Individual post pages with markdown
- Nav with Blog link
- Footer: Privacy Policy, Terms of Service,
  Built by Isaiah George Creative

## Command Centre Analytics

- Status: Live (this repository)
- Vercel Analytics in root layout
- Vercel Speed Insights in root layout

---

## Phase 2 — Complete (June 2026)

Core platform polish and connections before
Phase 3 (AI-first). Complete as of June 2026 —
one item intentionally deferred (see below).

### Delivered (live in this repository)

- Task filtering (priority, status, project,
  due date), sorting, and search
- Task notes field (`raw_content` on tasks)
- Task expandable rows with detail panel
- Project task detail overlay
- Project filtering, sorting, and status
  grouping
- Lead → project conversion modal
  (name, deadline, first task, value)
- Idea → project conversion
- Idea → content post conversion
- Recurring content posts with per-occurrence
  notes (migration `023_recurring_content.sql`)
- Recurring content on main calendar grid
- Global task and content quick-add FAB
  on overview and calendar routes
- Calendar day quick-add with date pre-fill
- Calendar event detail panels (view + edit)
- Lifestyle/Personal and Other standalone
  calendar events (migration
  `026_calendar_events.sql`)
- Content calendar tab improvements
  (+ quick-add, pill detail panel)
- Content calendar panel height fixes
  (max-h constraint removed across calendar
  panels; consistent flex/overflow pattern)
- Form dialog scrollability on all entity
  form dialogs
- Empty state standardisation across sections
- Branded 404 page (`src/app/not-found.tsx`)
- Sign-in back link to wiskapp.com
- Task `updated_at` field + trigger
  (migration `028_tasks_updated_at.sql`;
  Winston context builder correctly detects
  recently completed tasks)

**Winston AI Digest** (Phase 3.1 foundation —
built and delivered ahead of schedule):
- Auto-generates every Sunday via GitHub Actions
- Six-section digest: week in review, wins,
  needs attention, week ahead, Winston's insight,
  Winston's recommendation
- Stored in `ai_reports` table
- Gated by `ai_access` flag in `user_preferences`
- Admin can generate digest per user from
  admin panel
- Winston teaser page for non-access users

**WISK Chat v1:**
- Conversational AI interface under Winston
- Conversation persistence (`ai_conversation_messages`)
- 12-hour conversation expiry with archive view
- Token-based rate limiting (100,000 tokens/month)
- Short-term rate limit (10 messages/5 minutes)
- Usage tracking (`ai_usage_log` table)
- Usage display in chat and Settings
- `SectionSubNav` component (reusable sub-navigation
  pattern — Digest/Chat tabs)
- Context caching (`ai_context_cache`, 24-hour TTL)

**Sentry observability integration:**
- Error tracking across all dashboard routes
- Winston-specific error boundary
- User ID context (no PII)
- 10% performance sampling
- API route error capture

**Error boundaries:**
- `global-error.tsx` (root level)
- `(dashboard)/error.tsx` (dashboard routes)
- `(dashboard)/ai-digest/error.tsx` (Winston-specific)

**Privacy Policy and Terms of Service:**
- Live at wiskapp.com/privacy and wiskapp.com/terms
- Footer links on marketing site
- Linked from command centre Settings
- Terms acceptance checkbox on account setup page
- "Already registered" detection on both
  marketing and command centre request access forms

**Full auth flow overhaul:**
- Invite → `/set-password` page (combined account
  setup: name, theme, password, terms acceptance)
- WISK acronym reveal animation on setup page
- Forgot password dedicated page (`/forgot-password`)
- Password reset flow (cross-device via implicit flow)
- Resend approval notification email
- Branded Supabase email templates
  (invite, password reset)
- Request access confirmation email from both
  marketing and sign-in page
- "Already registered" detection

**Winston access control:**
- `ai_access` boolean in `user_preferences`
- Admin toggle per user in admin panel
- Admin per-user digest generation trigger

**Lead activity log and follow-up reminders:**
- `lead_activities` table (migration 033)
- Activity types: note, call, email, meeting,
  stage_change, follow_up_set, ai_notes
- Auto-logged stage changes via DB trigger
- `follow_up_date` added to leads table
- Follow-up overdue notifications
- Winston context updated with engagement data

**Leads table/list view:**
- Toggle between Pipeline and Table views
- 7 columns with colour coding
- Sortable, filterable, shared filter state
- Inline stage changes
- Mobile simplified list view

**Won celebration overlay:**
- Full-page celebration on lead won
- Fires from confirmed server response
- Works in both pipeline and table views

**AI call notes processor (Winston):**
- Paste call transcript → Winston extracts
  structured data
- Extracts: summary, key details, objections,
  next steps, suggested stage, value,
  follow-up date, sentiment, task suggestions
- User reviews and selects which actions to apply
- Gated behind `ai_access` / WISK AI subscription
- Teaser shown to non-access users

### Deferred

- **Task file attachments** — deferred until
  Supabase Pro upgrade and subscription packages
  are implemented. Storage costs will be absorbed
  by subscription revenue. A UI placeholder exists
  (`TaskAttachmentsSection`); no Supabase
  Storage integration yet.

### Carry-forward (not blocking Phase 3)

- Calendar-level recurring events for
  non-content types (content recurrence
  is live on the main calendar)
- Formal mobile QA pass across all sections

---

## Phase 2.5 — Delivered

All Phase 2.5 items are complete:

| Item | Status |
|------|--------|
| Navigation restructure | ✅ Complete |
| Winston Conversations 2.0 | ✅ Complete |
| Collaboration Phase A | ✅ Complete |
| Username system | ✅ Complete |
| Supabase Pro upgrade | Planning noted — not yet actioned |

### Navigation restructure

Parent/sub-nav pattern for all major sections.
Mobile bottom nav grouped into Work, Plan, Grow,
and Winston sections with `SectionSubNav` on mobile.

- **Overview** (standalone)
- **Work** → Projects, Tasks, Goals
- **Plan** → Calendar, Content, Ideas
- **Grow** → Leads
- **Winston** → Digest, Chat

`SectionSubNav` component with `desktopHidden` prop
for Work/Plan layouts — Winston sub-nav remains
visible on desktop.

### Winston Conversations 2.0

- Multi-conversation sidebar (new/switch/list)
- Per-account usage tracking with visible bar
- Project-scoped chats (auto-populate context
  from a specific project)
- Conversation titles (auto-generated from
  first message)
- Usage tied to subscription tier enforcement

### Collaboration Phase A (foundation only)

- `username` field on `public.users` (unique,
  case-insensitive index) — migration 034
- `username_set` flag on `user_preferences`
- `user_connections` table — migration 035
- `item_shares` table — migration 035
- `/connections` page with username search,
  pending requests, and connection management
- Connection request notifications
- Username prompt modal for existing users
- Sign-in with email or @username
- No sharing UI in Phase A — social graph only
- RLS not yet updated on existing tables
  (purely additive)

### Username system

- Validation (format, reserved words, profanity)
- Real-time availability check on set-password
  and settings
- `@username` display in collaboration contexts
  only (settings, connections, admin)

### Supabase Pro upgrade planning

- Point-in-time recovery
- Increased storage for task file attachments
- Required before task attachments go live
- **Not yet actioned** — planning complete,
  upgrade pending business decision

---

## Phase 3 — AI Package (confirmed build order)

Phase 3 is AI-first. The vertical packages (Social, Commerce,
Properties) come after the AI foundation is built.

### Why AI first

The AI layer must be built before vertical packages so that
when Social, Commerce, and Properties are added, they benefit
from an already-intelligent foundation. AI that understands
projects, tasks, goals, leads, and content becomes dramatically
more powerful when combined with social analytics, revenue data,
or property metrics.

### Phase 3.1 — AI Foundation (complete)

| Feature | Status |
|---------|--------|
| **AI Digest** | Complete (delivered in Phase 2) |
| **WISK Chat v1** | Complete (delivered in Phase 2) |
| **Winston Conversations 2.0** | Complete |
| **Smart Suggestions** | Complete |

**Smart Suggestions — delivered:**

- 13 rule-based suggestion types across leads,
  projects, tasks, goals, content, and ideas
- Sorted by priority (high/medium/low),
  capped at 6 per dashboard load
- "Winston suggests" section on Overview page
  (hidden when empty, hidden for non-AI users)
- High-priority suggestions also appear as
  bell notifications (`suggestion_*` types)
- Gated behind `ai_access` / WISK AI subscription
- No Claude API calls — rule-based, runs on
  every dashboard load

Original build order (for reference):

1. **AI Digest** — automatic weekly business summary
   generated every Sunday from the user's Supabase data.
   *Delivered ahead of schedule in Phase 2.*

2. **WISK Chat** — conversational AI interface.
   *v1 delivered in Phase 2; Conversations 2.0
   delivered in Phase 2.5.*

3. **Smart suggestions** — contextual nudges throughout
   the app. Overdue follow-ups, stalled projects, content
   streak at risk, goal progress alerts.
   *Delivered — rule-based in Phase 3.1; AI-generated
   deeper insights planned for Phase 3.2.*

### Phase 3.2 — AI Package (billable)

**Phase 3.2 is the next active phase.**

Prerequisites before building:

1. Business structure decision
   (sole trader vs limited company)
2. Stripe account setup
3. Google Cloud project created
   (Gmail API enabled)
4. Azure app registration (Outlook OAuth)

Items 3 and 4 can be started immediately at no
cost — verification takes weeks so the clock
should start now.

Stripe billing goes live as part of this phase.

Pricing:
- **WISK AI: £9/mo**
  AI Digest (Sunday auto-summary), WISK Chat,
  smart suggestions, limited usage
- **WISK AI Pro: £19/mo**
  Everything in AI + email integration with
  AI organiser, higher usage limits

Email integration (AI Pro only):
- Gmail and Outlook OAuth connection
- Dedicated Email tab in WISK nav
- AI automatically groups emails into sections
  (Leads, Clients, Admin, etc.)
- Manual sections with assigned addresses
- Emails from known leads/clients link to
  their WISK records
- AI surfaces action items from email threads
- Requires Google/Microsoft app verification
  (allow several weeks lead time)

### Phase 3.3 — Vertical Packages

Built on top of the AI foundation. Each package
connects to the AI layer for intelligent insights.

Pricing:
- Each vertical: £9–12/mo
- WISK Max (all verticals + AI Pro): £35–45/mo

Build order:
1. **Social Media Package** — fits content calendar
   and creator positioning; OAuth pattern exists
2. **Commerce Package** — revenue correlation with
   content is a strong differentiator
3. **Properties Package** — more domain-specific;
   larger build

Refer to the vertical package specs below for full
feature details — these remain unchanged, now sequenced
after the AI foundation.

#### Social Media Package

Target: content creators, agencies, social-first founders

Integrations:
- YouTube, TikTok, Instagram, LinkedIn, Facebook OAuth
- Each via the platform's official API

Features:
- Unified analytics dashboard per platform
- Audience growth, engagement, reach metrics over time
- AI performance insights with explanations
- Competitor tracking from provided links
- Content scheduling and direct publishing
- Cross-reference content performance to WISK goals
- AI content idea generation based on performance data

#### Commerce Package

Target: ecommerce founders, indie sellers, hybrid creator-merchants

**Foundation feature: Invoicing**

- Create invoices linked to projects and/or leads
- Pre-populated from project data (client,
  value, tasks as line items)
- Auto-incrementing invoice numbers
- Line items: description, quantity, rate, amount
- Status tracking: Draft → Sent → Paid / Overdue
- PDF generation and download
- Send via email (requires email OAuth — Phase 3.2)
- Payment link via Stripe (requires billing — Phase 3.2)
- Invoice reminders (automated follow-ups)
- Winston insights: average payment time,
  overdue invoice alerts, revenue forecasting
- Revenue dashboard connected to projects and leads
- Connects to Shopify/Square/Stripe integrations

Integrations:
- Shopify Admin API
- Stripe (for direct selling)
- WooCommerce (WordPress shops)
- Gumroad, Lemonsqueezy (digital products)
- Square (offline + online retail)

Features:
- Unified revenue dashboard across all sales channels
- Product performance and customer analytics
- Inventory alerts tied to social media trends
- AI insights correlating content to sales
  (e.g. "Your Instagram post led to 12 sales")
- Connected to content calendar
- Tax/accounting export-ready data

#### Properties Package

Target: small landlords managing 1-10 properties

Core concept: WISK becomes the command centre for a
small landlord's entire portfolio. Connected to projects,
tasks, and Winston for intelligent property management.

**AI integration:**
- Tenant portal includes Winston triage — tenants describe
  their issue, Winston troubleshoots common problems first
  (e.g. boiler pressure, tripped fuse, blocked drain guidance)
- If Winston cannot resolve the issue or it's flagged as
  severe/urgent, it escalates automatically to the landlord
  with a structured report: issue description, troubleshooting
  steps attempted, urgency level
- Winston surfaces maintenance patterns in the weekly digest
  ("Flat 2 has had 3 maintenance requests this month")
- Rent payment tracking with overdue alerts

**Tenant portal:**
- Lightweight separate portal created by the landlord when
  setting up a tenancy
- Tenant accesses via a unique link (no full WISK account needed)
- Portal shows: their property details, active maintenance
  requests, documents
- Maintenance request flow:
  1. Tenant describes issue
  2. Winston attempts to troubleshoot
  3. If unresolved/severe → escalates to landlord with full context
  4. Landlord creates a maintenance task in WISK automatically
  5. Tenant receives status updates

**Landlord features:**
- Property management dashboard (address, type, bedrooms, rent amount)
- Tenant records per property (name, contact, tenancy start/end,
  rent amount, payment history)
- Maintenance ticket workflow:
  New → In progress → Resolved
  Assign to contractor (contacts list)
  Link to WISK tasks for follow-up
- Rent tracking:
  Expected vs received per month
  Overdue rent notifications
  Payment history per tenant
- Document storage per property:
  Lease agreements, gas safety certificates, EPC, inspection reports
- Rental income connected to Goals (track income against targets)
- Winston insights:
  Yield calculations per property
  Maintenance cost tracking
  Tenant payment reliability scores
  Portfolio health in weekly digest

**Pricing:**
- £9-12/mo as part of vertical packages
- Included in WISK Max bundle

**Technical notes:**
- Tenant portal is a separate lightweight Next.js route
  (`/portal/[tenantToken]`) accessible without a WISK account
- Winston triage in tenant portal uses the Claude API with
  property-specific context
- Documents stored in Supabase Storage (requires Supabase Pro upgrade)
- Tenant portal tokens are UUID-based, stored encrypted,
  expire on tenancy end

#### Integration Architecture (shared across all packages)

1. User connects via OAuth (Shopify, YouTube, etc.)
2. Token encrypted with AES-256-GCM and stored in user_integrations
3. Server-side API calls fetch data on demand
4. Data cached/revalidated on a schedule to prevent API spam
5. Metrics flow into relevant WISK sections
6. AI layer analyses correlations across all connected sources
7. All integrations follow the existing Vercel + GitHub pattern

#### Package model

- Free tier: core WISK (projects, tasks, goals, content, leads, calendar)
- WISK AI / WISK AI Pro: AI foundation + email (see Phase 3.2)
- Vertical add-ons: Social, Commerce, Properties (see Phase 3.3)
- WISK Max: all verticals + AI Pro bundled

---

## Phase 4 — Speculative

### Collaboration & Sharing (Phase 4.1)

Foundation tables and username discovery are also
listed under **Phase 2.5** (committed before public
Phase 3 package release). Full sharing UI remains
Phase 4.

Build order:

**Phase A — Foundation (lightweight, additive):**
- Add `username` field to `public.users` (unique, used for discovery)
- `user_connections` table:
  `id`, `requester_id`, `recipient_id`, `status` (pending/accepted), `created_at`
- `item_shares` table:
  `id`, `owner_id`, `recipient_id`, `item_type` (project/task/goal/idea/lead/content),
  `item_id`, `permission` (view/edit), `created_at`
- Username search and add connection UI
- No sharing UI in Phase A — social graph only

**Phase B — Sharing UI (after Stripe billing is live):**
- Share button on projects and tasks first
- Permission picker (view/edit)
- Shared with me section in the app
- RLS updates per shareable table
- In-app notification when someone shares with you
- Read-only vs edit permission enforcement

**Architecture notes:**
- Every shareable table needs a second RLS policy:
  "OR exists in `item_shares` where `recipient_id` = `auth.uid()`"
- This touches every major table — do after Stripe to avoid multiple simultaneous schema changes
- Phase A is purely additive — no existing RLS policies touched

### Team & Collaboration (Phase 4.2)

A dedicated Team section for collaborative work across
multiple WISK users.

**Prerequisites:**
- Stripe billing live (Phase 3.2)
- Collaboration Phase A complete (done)
- Phase B RLS updates per shareable table

**New data model required:**
- `teams` table (`id`, `name`, `description`, `owner_id`, `created_at`)
- `team_members` table (`team_id`, `user_id`, `role`: owner/admin/member, `joined_at`)
- Team-scoped projects and tasks
- `team_updates` table (feed/announcements per team)

**Features:**
- Create and manage teams
- Invite members via @username (uses existing connections system)
- Shared project views (all members see the same projects/tasks)
- Task assignment to specific team members
- Team activity feed (who did what, when)
- Role-based permissions (owner/admin/member)
- Winston team digest (weekly summary for the whole team)

**Pricing:**
- Team features as a paid tier (WISK Pro or Team add-on)
- Per-seat pricing for larger teams
- Solo users on free/AI plan unaffected

**Build order:**

Phase A (foundation) — already complete:
- Username system, `user_connections`, `item_shares` tables

Phase B (RLS + sharing UI) — after Stripe:
- Share button on projects and tasks
- Permission picker (view/edit)
- Shared with me section
- RLS updates per shareable table

Phase C (full team features) — Phase 4:
- `teams` and `team_members` tables
- Team-scoped projects and tasks
- Team activity feed
- Task assignment
- Winston team digest

### Coming Soon strategy

WISK uses a deliberate "coming soon" approach:
- Section-level previews only (full page/tab teasers like the Winston teaser page)
- Never disabled buttons on existing cards or within daily workflows
- Upcoming features communicated via:
  - Changelog entries ("coming soon" type)
  - Settings page "What's coming" section
  - Social content and build-in-public posts
- Core product must always feel complete and polished — no building site feeling for daily users

### WISK Stays (separate product)
- Short-term rental management
- Dynamic pricing engine
- Channel synchronisation
  (Airbnb, VRBO, Booking.com)
- Revenue and occupancy analytics

### Additional Packages
- Fitness coaching package
- Restaurant HQ package
- Estate agency package

### Monetisation
- See Phase 3.2 and 3.3 for confirmed AI and
  vertical package pricing
- Team/Agency: per-seat pricing (speculative)

---

## Known Issues / Tech Debt

- Dialog/alert-dialog Framer Motion
  entrance animation deferred
  (Radix UI compatibility issue)
- `updated_at` on projects table added
  but not on all tables
- Winston usage percentage uses total tokens
  (chat + digest) but rate limit enforces
  chat tokens only — minor cosmetic discrepancy,
  acceptable for v1
- Stripe billing not yet implemented
  (Phase 3.2) — waiting on business
  structure decision
- Smart suggestions are rule-based only —
  AI-generated deeper insights planned for
  Phase 3.2 alongside billing
- Google Cloud / Azure app registration
  pending (required for email integration)
- Task file attachments deferred until
  Supabase Pro upgrade
- Calendar recurring events for
  non-content types not yet built
  (content recurrence is live)
- Formal mobile QA pass still outstanding
  (ongoing, not blocking)
- Social media API integrations not
  yet implemented (Phase 3.3)
- Apply migration `026_calendar_events.sql`
  on production Supabase if not yet run

---

## Database Tables (current)

- users
- projects
- tasks (includes `updated_at` — migration 028)
- goals
- ideas
- ai_reports
- ai_conversation_messages
- ai_context_cache
- ai_usage_log
- notifications
- user_preferences (includes `ai_access`)
- project_milestones
- user_integrations
- leads
- content_posts
- calendar_events
- access_requests
- announcements
- announcement_dismissals
- feedback
- changelog_entries
- blog_posts