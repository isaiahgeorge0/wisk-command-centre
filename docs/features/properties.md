# Properties — Feature Specification

## Current State

What is built and working today.

- Properties package at `/properties/*` with dedicated
  sidebar layout (amber accent)
- Gated by `properties` subscription via
  `hasPackageAccess()`; teaser page for non-subscribers
- **Dashboard:** portfolio stats, Winston insight card
  (7-day window), rent due section with mark-as-paid,
  property overview list
- **Properties list and detail:** CRUD; status badges;
  tabs for overview, tenants, maintenance, finances,
  certificates, documents
- **Tenants:** global list and per-property management;
  portal invite/revoke; rent due day (1–28) and email
  reminder settings (0–7 days after due date)
- **Maintenance:** global and per-property tickets;
  status workflow (new → in progress → resolved);
  priority and category; tenant-reported flag
- **Finances:** rent payments; portfolio and per-property
  financial summaries; Recharts monthly breakdown;
  mortgage and insurance records per property
- **Documents:** metadata per property; share with
  tenant toggle
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
  documents; messaging; Winston triage API
- Daily cron: `/api/properties/check-certificate-alerts`
  (certificates, mortgages, insurance, rent)

## Gaps and Missing Features

What is missing or underdeveloped, with a priority
rating (High/Medium/Low) per item.

- Communication hub UI at `/properties/communication`
  — **High** (placeholder page; `tenant_messages`
  table and portal messaging exist)
- Rental income linked to core WISK Goals — **Medium**
- Contractor contacts for maintenance assignment — **Medium**
- Auto-create core Tasks from portal escalation — **Medium**
- Yield and tenant reliability scores in digest — **Low**
- Document file storage in Supabase Storage — **Low**
  (metadata only today; Pro upgrade required)

## Planned Additions

Features committed to building next within the
Properties package.

- Landlord communication hub UI
- Goals integration for rental income targets
- Maintenance → Tasks automation from portal
- Contractor contacts list

## Future Considerations

Features on the radar but not yet committed.

- Maintenance pattern insights in weekly digest
- Tenant payment reliability scoring
- Bulk property CSV import
- EPC/gas certificate document OCR

## Technical Notes

- Server actions in `src/app/(dashboard)/properties/actions.ts`
- Types in `src/lib/properties/types.ts`
- Property emails via Resend (`src/lib/properties/emails.ts`)
- Valuation generator: `src/lib/properties/valuation-generator.ts`
  — joins all Claude `text` blocks; stores null (not £0)
  when parse fails
- Alert cron secured with `PROPERTY_ALERTS_SECRET`
- Migrations `046`–`054` in `supabase/migrations/`
- Tenant portal RLS: landlords via `landlord_user_id`;
  tenants via `tenants.portal_user_id = auth.uid()`
- Package check in `src/app/(dashboard)/properties/layout.tsx`
