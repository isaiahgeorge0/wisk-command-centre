# Leads — Feature Specification

## Current State

- Vertical pipeline with horizontal cards
- Six stages: New, Contacted, Qualified,
  Proposal sent, Won, Lost
- Stage colour accents per stage
- Collapse/expand per stage
- Drag and drop between stages (desktop)
- Status menu for mobile/touch
- Won celebration: confetti particles,
  gold trophy overlay, amber border flash
- Fields: name, email, phone, source,
  service interest, status, value, notes
- Source badges
- Stats bar: Leads this month, Conversion rate,
  Pipeline value, Average response time
- Inline edit, delete with confirmation
- Quick-add modal via FAB and Add button
- Recent leads on Overview page
- Convert lead to project with foundation modal:
  project name (pre-filled), deadline,
  first task, value collected before creation.
  First task creates a linked task in the
  same action.
- Success toast with link to /projects
  after conversion

## Gaps and Missing Features

What is missing or underdeveloped, with a priority rating (High/Medium/Low) per item.
- Follow-up reminders — **High**
- Lead activity log — **Medium**
- Source analytics on overview — **Medium**
- Email integration — **Low**
- Lead scoring — **Low**
- Bulk CSV import — **Low**

## Planned Additions (Phase 2)

- Lead → project conversion — COMPLETE
- Follow-up reminders — still planned
- Activity log — still planned

## Future Considerations (Phase 3+)

Features that are on the radar but not yet committed.

- Email integration
- Lead scoring
- Bulk import
- AI qualification

## Technical Notes

Any important technical context, constraints, or decisions relevant to this section.

- `contacted_at` set automatically on first move to Contacted status
- Used for average response time stat
- Pipeline value sums `value` field across active stages
