# WISK — Packages

Reference document listing every WISK package: what it is, what it includes, pricing, and technical gating. Sourced from live code (checkout pages, Stripe webhook, `src/lib/billing/access.ts`, `src/lib/billing/constants.ts`, `src/lib/billing/types.ts`).

---

## How packages work

- A user can hold **multiple simultaneous active `user_subscriptions` rows** — one per package. Never assume 1:1.
- Entitlements are checked server-side via `hasPackageAccess(userId, pkg, supabase)`.
- `hasAIAccess` returns true if the user has `ai` OR `ai_pro` (or the `ai_access` boolean override on `user_preferences`).
- `properties_pro` implicitly grants `properties` access — no separate Properties subscription needed.
- `max` grants access to every other package (see below).
- DB constraint (migration 061): `user_subscriptions.package` must be one of `('ai', 'ai_pro', 'social', 'commerce', 'properties', 'properties_pro', 'max')`.
- Stripe price IDs are mapped to packages via env vars in `src/lib/billing/constants.ts` (`getStripePriceMap()`).

---

## Core (Free)

**Price:** Free — no subscription row needed.

The full WISK Command Centre without AI. Every user gets this on sign-up.

### What's included

- Projects, tasks, goals, calendar, content calendar, leads, ideas, notes
- Board and calendar views for content
- Drag-and-drop pipeline for leads and content
- Goal tracking with progress bars
- Calendar with project deadlines, milestones, tasks, and content dates
- Quick-add from Winston FAB (structured form tab only)
- Winston global FAB with capped free conversation (single exchange, no persistent thread)
- Morning briefing: single-insight Haiku tier (not the full Sonnet briefing)

### What's not included

- Full Winston Chat (multi-turn, persistent threads)
- AI Digest (weekly business summary)
- Smart suggestions
- Email integration
- Properties section
- Any Pro-tier features

---

## WISK AI

**Price:** £9/month
**Package key:** `ai`
**Env var:** `STRIPE_PRICE_AI_MONTHLY`
**Display name:** WISK AI

Base Winston/AI access. The paid unlock for full AI capability across the app.

### What's included (on top of Core)

- **AI Digest** — weekly business summary every Sunday (full Sonnet-tier briefing)
- **WISK Chat** — ask Winston anything about your business, multi-turn persistent conversations
- **Smart suggestions** across the workspace (stalled projects, cooling leads, goals drifting)
- **Morning briefing** — full Sonnet briefing (not the capped Haiku single-insight free tier)
- **100,000 tokens per month**
- Full Winston surfaces across Notes, Leads, Projects, Goals, Ideas, Calendar, Content — brainstorm, propose, and commit structured items
- Pipeline Health analysis
- Section-level and record-level Winston sidebar

### What's not included

- Email integration (Gmail + Outlook) — that's AI Pro
- Higher usage limits — that's AI Pro
- Priority support — that's AI Pro
- Properties section — separate package

---

## WISK AI Pro

**Price:** £19/month
**Package key:** `ai_pro`
**Env var:** `STRIPE_PRICE_AI_PRO_MONTHLY`
**Display name:** WISK AI Pro

Everything in WISK AI, plus email integration and higher limits. The full Winston experience.

### What's included (on top of WISK AI)

- **Email integration** — Gmail and Outlook (OAuth, encrypted tokens at rest)
- **AI-organised inbox** — emails grouped automatically by category (Leads, Clients, Admin)
- **Emails linked to leads and clients** — follow-ups, proposals, and replies visible on pipeline cards
- **Higher usage limits** (token cap above the 100k base)
- **Priority support**

### Technical notes

- `hasAIAccess` returns true for both `ai` and `ai_pro` — AI Pro is a strict superset.
- Email integration gating: the inbox, email reader, and email draft features check for `ai_pro` specifically.

---

## WISK Properties

**Price:** £17/month
**Package key:** `properties`
**Env var:** `STRIPE_PRICE_PROPERTIES_MONTHLY`
**Display name:** WISK Properties

Full property management for UK landlords. This is an independent package — it does not require or include AI access (Winston property insights at this tier are basic portfolio-level, not the deep AI-generated analysis of Properties Pro).

### What's included

- **Portfolio dashboard** — track occupancy, rent, maintenance, and certificates across all properties
- **Tenant management** — full tenant records, tenancy dates, deposit tracking, payment history, rent frequency
- **Maintenance tracking** — tickets, contractor assignment, cost tracking, category/priority/status
- **Rent tracking** — payments, arrears, due dates
- **Certificate alerts** — Gas Safety, EPC, EICR expiry monitoring with automated alerts
- **Document storage** — per-property and portfolio-level document management
- **Contractor portal** — contractor records, job sheets (migration 057)
- **Mortgages and insurance** — per-property financial records (migration 052)
- **Winston property insights** — basic portfolio-level insights

### What's not included

- SA105 tax summary — that's Properties Pro
- Legal notice templates (Section 8) — that's Properties Pro
- Yield analytics — that's Properties Pro
- Tenant reliability scoring — that's Properties Pro
- Financial reports — that's Properties Pro
- Winston Pro property insights (deep AI-generated analysis with cited sources) — that's Properties Pro

---

## WISK Properties Pro

**Price:** £32/month
**Package key:** `properties_pro`
**Env var:** `STRIPE_PRICE_PROPERTIES_PRO_MONTHLY`
**Display name:** WISK Properties Pro

Everything in WISK Properties, plus tax reporting, legal templates, and Winston's deep AI-driven portfolio intelligence.

### What's included (on top of WISK Properties)

- **SA105 tax summary** (`/properties/sa105`) — HMRC box-by-box, editable Box 27/29, Box 44 correctly NOT deducted, 6 researched insights
- **Legal notice templates** (`/properties/notices`) — Section 8 (Form 3A) with verbatim statutory wording, eligibility checks, disclaimer. Section 21 removed post-Renters' Reform.
- **Winston Pro property insights** — rent/yield/cost/tenant-grade/net-income analysis, AI-generated valuations and comparables (with confidence scoring and cited web sources). Number-restatement guardrail applies: figures shown via `SourceFiguresLine`, sourced from the database, never asserted by Winston's prose alone.
- **Yield analytics** (`/properties/yield-analytics`) — gross/net yield, ROI, Recharts bar chart
- **Tenant reliability scoring** (`/properties/reliability`) — A–F grade, 0–100 score, payment history analysis
- **Financial reports** (`/properties/reports`) — UK tax year aligned, per-property + portfolio, print to PDF

### Technical notes

- `properties_pro` implicitly grants `properties` access — `hasPackageAccess(userId, "properties", supabase)` returns true for Properties Pro subscribers.
- All Properties Pro features are gated with inline `PropertiesProTeaser` components for non-Pro users.
- Finances sub-nav groups: Overview, Yield Analytics, Reports, SA105 Summary.

---

## WISK Max

**Price:** Not currently sold via a standalone checkout page. Pricing TBD — confirm from Stripe if a price exists.
**Package key:** `max`
**Display name:** WISK Max

All-inclusive bundle tier. Grants access to every other package.

### What's included

Everything from every package: AI, AI Pro, Properties, Properties Pro, Social, and Commerce.

### Technical notes

- `MAX_INCLUDES` in `src/lib/billing/access.ts`:

```typescript
const MAX_INCLUDES: WiskPackage[] = [
  "ai",
  "ai_pro",
  "social",
  "commerce",
  "properties",
  "properties_pro",
];
```

- `hasPackageAccess` returns true for any `pkg` when the user has `max`.
- No Stripe price env var configured — currently assigned manually or via admin, not purchasable through the checkout flow.
- `resolveBillingPlan()` checks for `max` first (highest priority in the resolution chain: max → ai_pro → ai → properties_pro → properties → free).

---

## WISK Social

**Price:** Not yet built. Phase 3.3. Pricing TBD.
**Package key:** `social`
**Display name:** WISK Social

Exists in the package enum and `MAX_INCLUDES` but has no Stripe price, no checkout page, no feature gating, and no dedicated code beyond the type definition.

### Status

- Build order planned: YouTube → Instagram/Meta → LinkedIn → TikTok
- Codebase audit confirms: no dedicated API routes, OAuth callbacks, or publishing/ingestion services exist yet
- The existing Content Calendar (multi-platform posts, recurrence, Winston brainstorming) is available to everyone with AI access — Social will likely add deeper integration on top of that

### What still needs defining

- What Social adds beyond the existing Content Calendar
- Whether it requires AI access as a prerequisite
- Pricing

---

## WISK Commerce

**Price:** Not yet built. Scope and pricing TBD.
**Package key:** `commerce`
**Display name:** WISK Commerce

Exists in the package enum and `MAX_INCLUDES` but has no Stripe price, no checkout page, no feature gating, and no dedicated code beyond the type definition.

### Status

Not discussed or scoped in any depth. Needs a dedicated scoping pass before this doc can describe what it covers.

---

## Quick reference

| Package | Key | Price | Stripe Env Var | Checkout | Status |
|---------|-----|-------|----------------|----------|--------|
| Core | _(free)_ | Free | — | — | Live |
| WISK AI | `ai` | £9/mo | `STRIPE_PRICE_AI_MONTHLY` | `/upgrade/ai` | Live |
| WISK AI Pro | `ai_pro` | £19/mo | `STRIPE_PRICE_AI_PRO_MONTHLY` | `/upgrade/ai-pro` | Live |
| WISK Properties | `properties` | £17/mo | `STRIPE_PRICE_PROPERTIES_MONTHLY` | `/upgrade/properties` | Live |
| WISK Properties Pro | `properties_pro` | £32/mo | `STRIPE_PRICE_PROPERTIES_PRO_MONTHLY` | `/upgrade/properties-pro` | Live |
| WISK Max | `max` | TBD | — | — | Admin-only |
| WISK Social | `social` | TBD | — | — | Not built |
| WISK Commerce | `commerce` | TBD | — | — | Not built |

---

## Entitlement chain

```
max → grants everything (ai, ai_pro, social, commerce, properties, properties_pro)
ai_pro → grants ai (via hasAIAccess checking both)
properties_pro → grants properties (explicit rule in hasPackageAccess)
```

Free tier: no subscription row. `hasAIAccess` returns false, `hasPackageAccess` returns false for all packages. User gets Core only, plus the capped free Winston interaction (single-exchange on global FAB, Haiku single-insight morning briefing).
