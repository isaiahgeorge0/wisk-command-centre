# Leads — Feature Specification

## Current State

- Vertical pipeline with horizontal cards
- Six stages: New, Contacted, Qualified,
  Proposal sent, Won, Lost
- Stage colour accents per stage
- Collapse/expand per stage
- Drag and drop between stages (desktop)
- Status menu for mobile/touch
- Won celebration: full-page overlay with confetti
  and trophy; fires from confirmed server response;
  works in pipeline and table views
- Fields: name, email, phone, source,
  service interest, status, **value, value_type
  ('one_time' | 'monthly', migration 068)**, notes
- Source badges
- Stats bar: Leads this month, Conversion rate,
  Pipeline value, Average response time — value
  figures now shown as two lines ("Upfront: £X ·
  Recurring: £Y/mo"), never blended into one total
- Inline edit, delete with confirmation
- **Brainstorm with Winston** — section sidebar (`scope_key: 'leads'`), plus the existing Winston tools panel (call notes / drafts / Pipeline Health)
- Quick-add modal via Winston FAB Quick add tab and Add button, with an
  Upfront/Monthly toggle next to the value field
- Recent leads on Overview page
- Convert lead to project with foundation modal:
  project name (pre-filled), deadline,
  first task, value collected before creation.
  First task creates a linked task in the
  same action. Monthly-value leads default to
  ×12 into `projects.value` (still one-time),
  with helper copy explaining the conversion.
- Success toast with link to /projects
  after conversion
- Activity log per lead with timeline view
- Activity types: Note, Call, Email, Meeting,
  stage changes (auto-logged), AI notes
- Follow-up date per lead with overdue detection
- Follow-up overdue notifications
- Table/list view with 7 columns
- Sortable and filterable table
- Toggle between Pipeline and Table views
- AI call notes processor (Winston-powered,
  gated behind `ai_access`, now on Haiku —
  downgraded from Sonnet, schema-constrained
  extraction didn't need it)
- Winston for Leads panel (Sparkles button
  on leads page) — hosts the call notes processor,
  AI email drafting, and **Pipeline Health, now live**
- mailto email button with Winston draft
- **Pipeline Health (live)** — computes stalled
  leads, time-in-stage, conversion trends, and
  value-at-risk server-side; `claude-sonnet-4-6`
  writes only qualitative reasoning per flagged
  lead, never the numbers themselves — `value`/
  `valueType` are sourced directly from the lead
  row and rendered by the UI, after an earlier bug
  where Winston's own prose misstated a lead's
  value ("£15" shown as "£15k"). Standing rule
  from that bug is documented in `winston.md`.
- **Automated follow-up drafting** — each stalled
  lead Pipeline Health flags gets a "Draft
  follow-up" action. Seeds the existing Winston
  email draft card with that lead plus Pipeline
  Health's stated reason, auto-calling the same
  `/api/winston/draft-email` route manual drafts
  use. Same review/edit/send flow — nothing sends
  automatically. Leads with no email show an
  "add an email" prompt instead of the action.
  Manually editing a lead clears any passed-through
  Pipeline Health context so a later draft doesn't
  reuse stale reasoning.

## Gaps and Missing Features

What is missing or underdeveloped, with a priority rating (High/Medium/Low) per item.
- Source analytics on overview — **Medium**
- Email integration — **Low**
- Lead scoring — **Low**
- Bulk CSV import — **Low**

## Planned Additions (Phase 2)

- Lead → project conversion — COMPLETE
- Follow-up reminders — COMPLETE
- Activity log — COMPLETE
- Pipeline Health — COMPLETE
- Auto-draft follow-up emails for stalled leads — COMPLETE

## Future Considerations (Phase 3+)

Features that are on the radar but not yet committed.

- Email integration for direct sending
  from lead card (Phase 3.2)
- Lead scoring (Phase 3.1 smart suggestions)
- Bulk import
- AI qualification

## Technical Notes

Any important technical context, constraints, or decisions relevant to this section.

- `contacted_at` set automatically on first move to Contacted status
- Used for average response time stat
- Pipeline value sums `value` field across active stages, split by `value_type` rather than blended — see Current State
- `lead_activities` table stores timeline entries;
  stage changes auto-logged via DB trigger (migration 033)
- `follow_up_date` on leads drives overdue
  detection and notifications
- AI call notes: `/api/winston/process-call-notes`
  extracts structured data (Haiku); `applyCallNotesResult`
  server action applies selected updates
- Email draft: `/api/winston/draft-email`
  generates mailto body via Winston (Haiku), now
  also called automatically from Pipeline Health
  with extra context
- Pipeline Health: `/api/winston/pipeline-health`
  (Sonnet) — see `winston.md` for the full model/
  currency-safety writeup
- Winston panel: call notes processor, email
  drafting, and Pipeline Health; all gated
  behind `ai_access`
- Teaser shown to non-access users
- `value_type` migration: `068_lead_value_type.sql`
