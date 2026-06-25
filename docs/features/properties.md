# Properties — Feature Specification

## Current State

What is built and working today.

- Properties package at `/properties/*` with dedicated
  sidebar layout (amber accent)
- Gated by `properties` subscription via
  `hasPackageAccess()`; teaser page for non-subscribers
- **Dashboard:** command centre — portfolio stats,
  Winston insight card, rent due section with
  mark-as-paid, pending contractor access requests,
  open maintenance with job sheet detail (contractor,
  visit date, latest update), unread messages,
  expiring certificates
- **Overview Properties tab:** portfolio summary
  stats, needs attention, next 30 days timeline,
  open maintenance with job sheet detail, unread
  messages
- **Properties list and detail:** CRUD; status badges;
  tabs for overview, tenants, maintenance, finances,
  certificates, documents
- **Tenants:** global list and per-property management;
  portal invite/revoke; rent due day (1–28) and email
  reminder settings (0–7 days after due date)
- **Maintenance:** global and per-property tickets
  with job sheet detail; status workflow
  (new → in progress → resolved); priority and
  category; tenant-reported flag; auto-creates core
  Tasks on tenant portal submission
- **Contractors:** address book at
  `/properties/contractors`; CRUD per landlord
- **Contractor portal** (`/contractor/[token]`):
  public token-based access (no auth); job sheet
  view, status updates, access requests
- **Job sheets:** create from maintenance ticket,
  assign contractor, send email link; landlord
  activity on ticket detail (access requests,
  updates, resend email)
- **Access requests:** tenant approve/decline in
  portal with optional availability note on decline
- **Finances:** rent payments; portfolio and per-property
  financial summaries; Recharts monthly breakdown;
  mortgage and insurance records per property
- **Documents:** metadata per property; share with
  tenant toggle
- **Communication hub** (`/properties/communication`):
  landlord–tenant messaging; polling fallback (15s)
  due to Supabase free tier `realtime_rls` limitation
- **Winston:** portfolio insights; rental/sale valuations
  via Claude web search; manual comparables; 3-month
  regeneration cooldown; dev-only valuation reset
- **Certificate alerts:** 90/30/7-day pre-expiry,
  on expiry, and post-expiry overdue emails
- **Mortgage & insurance alerts:** renewal reminders
  via daily cron
- **Rent due tracking:** auto-created pending payments;
  dashboard flags; landlord reminder emails once per
  tenant per month (skipped if paid)
- **Tenant portal** (`/portal/*`): invite, setup, login;
  light/dark theme; maintenance requests; shared
  documents; messaging; access request approve/decline;
  Winston triage API
- Daily cron: `/api/properties/check-certificate-alerts`
  (certificates, mortgages, insurance, rent)

## Gaps and Missing Features

What is missing or underdeveloped, with a priority
rating (High/Medium/Low) per item.

- Realtime messaging fix — **High** (needs Supabase Pro;
  polling fallback in place on free tier)
- Document file storage in Supabase Storage — **Medium**
  (metadata only today; Pro upgrade required)
- Rental income linked to core WISK Goals — **Medium**
- Properties Pro features (SA105 tax summary, legal
  templates, Winston Pro assistant, yield analytics,
  tenant reliability scoring, financial reports) —
  **Planned**

## Planned Additions

Features committed to building next within the
Properties package.

- **Stripe checkout flow** (IMMEDIATE — platform-wide)
- **Supabase Pro upgrade** (unlocks realtime + storage)
- **Properties Pro package** (£32/mo)
- Goals integration for rental income targets

## Future Considerations

Features on the radar but not yet committed.

- Properties Pro: Section 8 legal templates
  (Section 21 abolished May 2026)
- Maintenance pattern insights in weekly digest
- Bulk property CSV import
- EPC/gas certificate document OCR

## Technical Notes

- Server actions in `src/app/(dashboard)/properties/actions.ts`
- Types in `src/lib/properties/types.ts`
- Property emails via Resend (`src/lib/properties/emails.ts`)
- URL helpers: `siteUrl`, `portalUrl`, `contractorUrl`
  (`src/lib/url.ts`)
- Valuation generator: `src/lib/properties/valuation-generator.ts`
  — joins all Claude `text` blocks; stores null (not £0)
  when parse fails
- Alert cron secured with `PROPERTY_ALERTS_SECRET`
- Migrations `046`–`059` in `supabase/migrations/`
- Tenant portal RLS: landlords via `landlord_user_id`;
  tenants via `tenants.portal_user_id = auth.uid()`
- Contractor portal uses admin client exclusively —
  no public RLS on contractor tables (migration 058)
- Package check in `src/app/(dashboard)/properties/layout.tsx`
- Zod validation on contractor, portal, and properties
  server actions; error boundaries on `/portal` and
  `/contractor` routes
