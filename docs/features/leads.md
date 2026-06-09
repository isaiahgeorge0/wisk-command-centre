# Leads — Feature Specification

## Current State

What is built and working today.

- Vertical pipeline with horizontal cards
- Six stages
- Colour accents per stage
- Collapse/expand
- Drag and drop desktop
- Status menu mobile
- Won celebration
- Stats bar
- Inline edit
- Quick-add
- Lead to project conversion (one click)

## Gaps and Missing Features

What is missing or underdeveloped, with a priority rating (High/Medium/Low) per item.
- Follow-up reminders — **High**
- Lead activity log — **Medium**
- Source analytics on overview — **Medium**
- Email integration — **Low**
- Lead scoring — **Low**
- Bulk CSV import — **Low**

## Planned Additions (Phase 2)

Features committed to building before Phase 3 begins.

- Follow-up reminders
- Activity log

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
