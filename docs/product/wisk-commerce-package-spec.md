# WISK — Commerce package spec

Reference document, not yet a Cursor implementation prompt. Not sequenced ahead of Research/Focus — this is a planning doc to have ready once that work clears.

## Positioning

Commerce covers invoicing/quoting, financial visibility, and a client-facing portal — all built without requiring OAuth or any external integration. Payment collection (Stripe Connect), accounting-software sync (Xero/QuickBooks), and bank feeds (Open Banking) are explicitly deferred to V2, shown as a "coming soon" teaser inside V1 rather than built now.

Pricing not yet set — no figure has been discussed. Don't invent one; price once scope is closer to build-ready, the way Research's pricing was set only after the spec and competitor landscape were clear.

## V1 scope (full — everything below ships before V2)

### Core invoicing/quoting

- Invoice and quote creation: line items, tax, discounts, client details, branded PDF output.
- Branding: logo, brand colours, custom header/footer text, custom invoice numbering — reuse the section-colour-token/getReadableTextColor() system already used app-wide, applied to user-set brand colours rather than WISK's own.
- Quote-to-invoice conversion: one click, carries line items over once a quote is accepted.
- Recurring invoices for retainer-style client work — reuse the recurrence logic already built for calendar events and content posts, don't build a second recurrence engine.
- Payment terms (Net 15/30/60), with late-fee calculation shown on overdue invoices (displayed only — no charge is ever taken in V1, since there's no payment processor connected yet).
- Partial payment tracking for deposit-plus-balance work, manual "mark as paid" (full or partial).

### Client portal (invoice/quote status + live project progress)

- Hosted, no-login-required link the client opens directly.
- Shows invoice/quote status (sent/viewed/paid/overdue) and payment terms.
- Shows live progress on the linked Project — task/milestone status, updates as work happens. Reuse the existing tenant portal and contractor portal architecture (job_sheets, job_sheet_updates, the existing external-access-without-a-WISK-account pattern) rather than building a new one — this is the same shape of problem (give an external party visibility into ongoing work) already solved twice in the codebase.
- Invoice/quote must be linked to a Project for the progress view to have something to show — confirm at build time whether an invoice can exist standalone (no project link, portal just shows invoice status) or always requires one.
- Viewed-tracking: log when the client opens the portal link, surfaced back to the user (useful chase-up context — "they haven't opened it" vs. "viewed 3 times, still unpaid").

### Automation

- Automated chase-up emails for overdue invoices. Cadence is user-configured once (e.g. "remind 3 days before due, on due date, weekly after"), then runs automatically — same pre-approved-recurring-behavior model as the existing certificate and rent-due alerts, not a case-by-case Winston decision to email someone.
- Reuse the existing Resend infra — same pattern as every other transactional/automated email in the app.

### Financial visibility

- Manual expense logging (against a Project or general), giving a real profit/loss view without needing bank feeds — this is what actually makes "financial breakdowns" true in V1.
- Financial breakdown dashboard: outstanding vs. paid vs. overdue totals, monthly revenue trend, top clients by revenue — computed entirely from WISK's own invoice/expense records.

### Winston assistance

- Draft quote/invoice line items from a Project's scope or a Lead's notes, through the existing propose-review-commit pattern — not a blank form, and not an unreviewed auto-send.
- Number-restatement guardrail applies to any financial breakdown Winston summarizes in prose (attachSourceValues/SourceFiguresLine, same as everywhere else).

## V2 teaser

A dismissible "coming soon" banner for Stripe Connect payment collection, Xero/QuickBooks sync, and Open Banking bank feeds. Reuse the existing upgrade-banner pattern (upgrade_banner_dismissed_at already exists in the schema) rather than building a new banner component.

## Recommended build sequence (internal phases within V1 — not a scope cut, just an order)

Given the size of what's now in V1, this should still ship as dependency-ordered, individually reviewable phases — same discipline used for Focus and the admin redesign, not one combined build.

1. Core data + CRUD — invoices, quotes, line items, client details (consider reusing Lead contact data rather than a new Clients table), branded PDF generation, Resend delivery, payment terms/late-fee display, mark-as-paid (full/partial). Package-gated behind commerce entitlement from this phase onward — this is a paid surface from day one, same as every other package.
2. Client portal — hosted view, invoice/quote status, viewed-tracking, and the Project-linked live-progress view (reusing tenant/contractor portal architecture). Depends on phase 1's records existing.
3. Automation — recurring invoices, chase-up email cadence, quote-to-invoice conversion.
4. Financial visibility + Winston assistance — expense logging, financial breakdown dashboard, Winston-assisted drafting, V2 teaser banner.

## Standards (anticipated, confirm against standards.md when this is actually built)

- Server Actions returning ActionResult, Zod-validated line items/amounts.
- toSafeActionError() on all action paths — invoicing involves financial data, this is exactly the kind of surface that must never leak raw DB errors.
- Package-gated (commerce entitlement) from phase 1.
- Number-restatement guardrail wherever Winston summarizes financial figures in prose.

## Open questions for when this is actually scheduled

- Pricing (TBD, needs its own competitor pass like Research got).
- Whether invoice/quote PDF generation should reuse an existing library already in the stack or introduce a new one.
- Exact entitlement shape — single commerce tier, or a base/pro split like Properties and Research.
- Whether an invoice/quote can exist without a linked Project (portal shows invoice-only) or always requires one for the live-progress view to make sense.
