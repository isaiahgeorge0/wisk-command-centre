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
- Request access form on marketing site
- Admin approval workflow
- Password reset
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

### Tasks
- Status: Live
- Tasks list grouped:
  Incomplete tasks, Completed (collapsed)
- Fields: title, project link (optional),
  due date, priority (high/medium/low),
  completed
- Priority badges: High coral, Medium amber,
  Low gray
- Due date colouring: overdue red,
  today amber, upcoming muted
- Project tag on each row
- Checkbox with optimistic toggle
- Always-visible edit/delete on mobile
- Hover edit/delete on desktop
- Inline edit
- Quick-add modal via FAB and Add button
- Show completed toggle with count
- Note: Task filtering not yet built
  (planned)

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

### Calendar
- Status: Live
- Monthly grid (Mon-Sun)
- Today highlighted with teal circle
- Colour-coded pills per event type:
  Projects purple, Tasks teal,
  Goals amber, Milestones rose,
  Content coral
- Filter toggles per event type
- Click day to open detail panel
  (slides in from right on desktop,
  bottom sheet on mobile)
- Upcoming panel below calendar:
  30, 60, 90 day tabs with counts
- Items grouped by type in upcoming panel
- Urgency colouring: overdue red,
  today amber, upcoming muted
- Note: Recurring events not yet built
  (planned)

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
- Note: Recurring events not yet built
  (planned)
- Note: Social media API integration
  not yet built (Phase 3)

### AI Digest
- Status: Placeholder (nav item exists,
  page is empty)
- Planned for Phase 3 once sufficient
  data exists
- Will provide weekly AI summary of
  business performance, priorities,
  and recommendations

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
- AI Digest link (mobile)

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
- Published toggle and date
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

- Status: Live
- Hero section with animated background
- Word-stagger headline animation
- Feature cards (6 sections)
- Testimonials section
- Request access form
  (submits to access_requests table)
- Blog at wiskapp.com/blog
- Individual post pages with markdown
- Nav with Blog link
- Footer: Built by Isaiah George Creative

---

## Planned Features (Phase 2 — in progress)

- Task filtering and custom columns
  (priority, status, files, raw content)
- Recurring events for content and calendar
- Admin panel: additional enhancements

---

## Phase 3 — Planned

### Social Media Package
- Platform OAuth connections
  (YouTube, LinkedIn, TikTok, Instagram,
  Facebook)
- Analytics dashboard per platform
- AI performance insights
- AI competitor tracking from provided link
- Content creation and scheduling
  from within WISK
- Content idea generation based on
  performance data

### Customisable Dashboard Views
- Content view, Property view,
  Business view, General overview
- Saved layout preferences per user

### AI Layer
- Full AI digest across all sections
- Proactive insights and pattern recognition
- Lead qualification
- Business performance summaries
- Content idea engine

### Properties Package
- Property management for small landlords
- Tenant management and messaging
- Maintenance tickets and contractor
  assignment
- Rental income tracking

---

## Phase 4 — Speculative

### Team and Agency Features
- Multi-user workspaces
- Role-based permissions
- Shared projects and leads pipeline
- Task assignment to team members
- Activity feed
- Agency/white-label version

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
- Free tier: core WISK
- Growth add-on: Social package
- Properties add-on: Property package
- Pro: all packages bundled
- Team/Agency: per-seat pricing

---

## Known Issues / Tech Debt

- TEST_USER_ID pattern fully removed
  (replaced with real auth)
- Dialog/alert-dialog Framer Motion
  entrance animation deferred
  (Radix UI compatibility issue)
- updated_at on projects table added
  but not on all tables
- Social media API integrations not
  yet implemented (Phase 3)
- Recurring events not yet built
- Task filtering not yet built
- AI Digest page is a placeholder

---

## Database Tables (current)

- users
- projects
- tasks
- goals
- ideas
- ai_reports
- notifications
- user_preferences
- project_milestones
- user_integrations
- leads
- content_posts
- access_requests
- announcements
- announcement_dismissals
- feedback
- changelog_entries
- blog_posts