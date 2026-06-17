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
- Activity log per lead with timeline view
- Activity types: Note, Call, Email, Meeting,
  stage changes (auto-logged), AI notes
- Follow-up date per lead with overdue detection
- Follow-up overdue notifications
- Table/list view with 7 columns
- Sortable and filterable table
- Toggle between Pipeline and Table views
- AI call notes processor (Winston-powered,
  gated behind WISK AI)

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

## Future Considerations (Phase 3+)

Features that are on the radar but not yet committed.

- Email integration for direct sending
  from lead card (Phase 3.2)
- Lead scoring (Phase 3.1 smart suggestions)
- mailto: email button with Winston draft
- Bulk import
- AI qualification

## Technical Notes

Any important technical context, constraints, or decisions relevant to this section.

- `contacted_at` set automatically on first move to Contacted status
- Used for average response time stat
- Pipeline value sums `value` field across active stages
- `lead_activities` table stores timeline entries;
  stage changes auto-logged via DB trigger (migration 033)
- `follow_up_date` on leads drives overdue
  detection and notifications
- AI call notes: `/api/winston/process-call-notes`
  extracts structured data; `applyCallNotesResult`
  server action applies selected updates
