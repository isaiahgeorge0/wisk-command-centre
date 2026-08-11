# WISK — Roadmap & Feature Status

Last updated: July 2026

---

## Current Phase: 3.3 (Social Media Integration — not yet started)

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
- SA105 Tax Summary (/properties/sa105) — HMRC box-by-box (Box 20/24/25/27/29/36/38/41/44), Box 44 correctly NOT deducted, editable Box 27/29, 6 researched insights
- Winston Properties Pro — 8-10 card layout using yield, reliability, financial data, risk alerts, property deep dives, pro recommendations
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

### Winston AI Pro Digest
- Subscription-aware context builder (subscriptionTier field)
- Richer context for ai_pro/max: lead intelligence, content strategy, goal velocity, cross-section patterns
- Additional Pro cards in ai-digest-page-client.tsx
- Properties Pro uses buildProPropertyPortfolioContext with yield + reliability + financial data

### Morning Briefing — Complete
- Winston-generated daily briefing stored in morning_briefings table (migration 065)
- Cron: generate at 7am UTC, send at 8am UTC (once/day — Vercel Hobby limit)
- Upgrade to Vercel Pro for */5 cadence
- Resend email: dark branded template, lime accent strip, focus items with urgency colours
- In-app card inline with overview header (right side), expandable Framer Motion modal
- Visible for the full local calendar day (briefing_date === today in user_preferences.timezone) — not gated by hour-of-day
- Content shape includes teaser (collapsed card) + summary prose (modal) alongside focuses[]
- Greeting term from optional gender / custom greeting_term (migration 066)
- Timezone stored in user_preferences (captured on sign-up via Intl API)

### While You Were Away — Complete
- away_summaries table (migration 064) — per-user cached summary
- On-demand sync via /api/away-sync/user when cache stale
- Cron: 6am UTC (once/day on Hobby)
- Shows new emails, new leads, overdue tasks, new tenant messages
- Empty state: "Nothing to catch up on. Everything's quiet."
- AI Pro/Max only. Shows below section cards on Overview.

### Auth/Onboarding Overhaul
- /sign-up — immersive Framer Motion scroll experience (cursor glow, character animation, marquee ticker, dot constellation, blur-to-focus form)
- /sign-up/confirm — confirmation page with resend option
- /auth/callback handles type=signup and type=email_change OTP verification
- /welcome — onboarding page (renamed from /set-password), name pre-populated from user_metadata
- Password fields hidden on /welcome for email+password sign-up users
- /set-password redirects to /welcome for backward compat
- Timezone captured on sign-up (Intl.DateTimeFormat API), stored in user_preferences

### Brand Refresh — Complete
- New wordmark: PNG-MAIN-WISK-LOGO-WHITE.png with CSS filter (lime dark, lilac light)
- Dark mode primary: #c3ff32 (lime) — logo, CTAs, active states
- Light mode primary: #016c81 (turquoise) — logo uses lilac #aca0ff filter
- Properties accent: #e8001d dark / #cc0016 light (Ferrari red) — replaces amber throughout Properties
- Section-specific accent colours (light/dark variants):
  - Projects: #aca0ff / #4a3db0
  - Tasks: #2dd4bf / #016c81
  - Goals: #baf7e1 / #085041
  - Ideas: #fea9e0 / #c4207e
  - Leads: #ff5d00 / #cc3d00
  - Content: #0066ff / #0044cc
  - Calendar: #00c4b4 / #007a70
  - Winston: #8b00ff / #6200b3
- CSS tokens: --wisk-ferrari, --wisk-section-* for all sections
- color-mix() replaced with rgba() throughout (fixes SSR hydration mismatch)
- Marketing site fully rebranded with new palette

### Overview Redesign
- Section cards grid with Framer Motion layoutId shared layout animation (card → modal)
- Cards: Projects, Tasks, Goals, Leads, Ideas, Content, Properties (subscribed), Email (connected)
- Rich item previews: colour-coded sub-labels, progress %, priority colours, lead status colours
- Morning briefing card inline with header (right side), expandable modal
- Winston suggestion pills strip (horizontal scroll)
- While You Were Away section below cards (AI Pro only)
- Theme-aware section colours via useTheme hook
- Loading skeletons (loading.tsx) for all major sections

### UI Refresh — Section Pages
- Projects: lilac left accent strip, progress bar in tinted container, next action highlighted in lilac, "View details" CTA, section headings with dot + count
- Tasks: priority-coloured left strip, overdue dates as red pill badges, today as orange pills, grouped section headers with count badges
- Leads: lead scoring engine (A-F grade, 0-100 score based on stage/value/activity/follow-up/velocity), quick actions (advance stage, follow-up date, note popover), bulk actions (floating bar, change stage, set follow-up, delete), status-specific card borders, stats bar with accent strips
- Goals: percentage as large hero number (colour-coded red/orange/mint by progress), progress-based top accent strip, deadline urgency colours (overdue/critical/soon/ok), 100% goals get mint glow
- Ideas: pink accent strip, capture date top-right, 3-line description, items-start grid for natural heights

### Marketing Site (wiskapp-marketing)
- Full rebrand matching app colour system
- Logo in lime via CSS filter
- New sections: Winston AI showcase, Properties showcase, Pricing overview (4 packages)
- Hero: "WISK AI + Properties — Now live" badge, updated copy
- All CTAs point to https://app.wiskapp.com/sign-in
- App screenshots in public/

---

## Phase 3.3 — Social Media Integration (Next)

Build order: YouTube → Instagram/Meta → LinkedIn → TikTok (last, most restrictive API)
Status: Not yet started
Note: Create developer accounts on all platforms early to surface surprises

---

## Pending / Outstanding

### Immediate priorities:
1. Mobile QA pass — never done, blocking public launch
2. Email templates — Supabase auth emails still use default Supabase template
3. Content page UI refresh
4. Calendar page UI refresh
5. Email page UI refresh
6. Lead automation — auto-draft follow-up emails for stalled leads
7. Supabase Pro upgrade — fixes realtime messaging, enables task file attachments
8. Vercel Pro upgrade — enables frequent crons (*/5, */15) for morning briefing and away sync
9. Google OAuth CASA Tier 2 verification (~£1,500-3,000, fund from revenue)
10. Companies House registration (£50) + ICO registration (£47/year)
11. SA105 and legal template professional review

### Phase 4 — Speculative
- Collaboration & Sharing (item_shares table exists)
- Team features
- React Native/Expo mobile app (scoped: Overview, Tasks, Projects, Goals, Notifications)
- WISK Stays (short-term rental management)
- Fitness coaching package
- Restaurant HQ package

---

## Known Issues / Tech Debt

- Mobile QA pass never done
- Gmail OAuth token expires after inactivity — user must reconnect in Settings → Connections
- Realtime messaging uses 15s polling fallback (fix: Supabase Pro upgrade)
- Task file attachments deferred (fix: Supabase Pro upgrade)
- Vercel crons limited to once/day on Hobby — use 0 H * * * format not */N
- color-mix() in inline style props causes SSR hydration mismatch — use rgba() instead
- supabase/.temp/ should be added to .gitignore
- SA105 Box 44 and legal notice wording verified against HMRC/gov.uk sources (May 2026 forms)
