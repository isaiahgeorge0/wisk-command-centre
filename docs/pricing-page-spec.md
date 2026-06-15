# WISK Marketing — Pricing Page Spec

**Target URL:** `https://wiskapp.com/pricing`  
**Repo:** `wiskapp-marketing` (separate from Command Centre)

## Purpose

Communicate WISK's tiered offering and funnel visitors toward Core (free) sign-up or AI tier waitlist while Stripe billing is not yet live in production.

## Navigation

- Add **Pricing** to the main marketing site nav (header + footer).
- Link from homepage CTAs where appropriate (e.g. "See plans").

## Page structure

### Hero

- Headline: e.g. "Plans that grow with your business"
- Subhead: short line on Core being free and AI tiers unlocking Winston

### Pricing tiers (3 columns)

| Tier | Price | Positioning |
|------|-------|-------------|
| **Core** | Free | Full Command Centre for projects, tasks, goals, content, leads, calendar |
| **WISK AI** | £9/mo | Winston Digest + Chat, smart suggestions, 100k tokens/month |
| **WISK AI Pro** | £19/mo | Everything in AI + email integration, higher limits, priority support |

### Feature comparison table

Rows to include (minimum):

- Projects, tasks, goals, calendar, content, leads
- Winston weekly digest
- Winston chat
- Smart suggestions
- Monthly AI token allowance
- Gmail / Outlook integration (Pro only)
- Priority support (Pro only)

Use checkmarks / dashes per tier. Keep scannable on mobile (horizontal scroll or stacked sections).

### CTAs

- **Core:** "Get started free" → Command Centre sign-up / app URL
- **WISK AI & Pro:** "Coming soon — join the waitlist" (not live checkout until Stripe keys are configured)
  - Waitlist: mailto `hello@wiskapp.com` with subject `WISK AI Waitlist` or dedicated form if marketing site has one

### Visual design

- Match existing WISK marketing aesthetic (dark-friendly, purple/teal accents)
- Highlight WISK AI as recommended / popular tier if desired
- Pro tier: subtle "Coming soon" badge

## Copy notes

- Emphasise Winston as the differentiator for paid tiers
- Core is genuinely useful without AI — not a crippled trial
- Billing "coming soon" messaging should feel intentional, not broken

## Technical (when Stripe goes live)

- Replace waitlist CTAs with Stripe Checkout links or Customer Portal
- Price IDs must match Command Centre env vars:
  - `STRIPE_PRICE_AI_MONTHLY`
  - `STRIPE_PRICE_AI_PRO_MONTHLY`
- Webhook endpoint (Command Centre): `POST /api/stripe/webhook`

## Out of scope for this spec

- In-app upgrade page (`/upgrade` in Command Centre — already built)
- Subscription management UI (Settings → Plan & Billing in Command Centre)
