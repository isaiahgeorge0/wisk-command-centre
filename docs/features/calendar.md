# Calendar — Feature Specification

## Current State

What is built and working today.

- Monthly grid Mon–Sun
- Colour-coded pills: projects purple, tasks teal, goals amber, milestones rose, content coral
- Filter toggles
- Day detail panel
- Upcoming 30/60/90 day panel

## Gaps and Missing Features

What is missing or underdeveloped, with a priority rating (High/Medium/Low) per item.

- Recurring events — **High**
- Week view — **Medium**
- Add task/content directly from calendar — **Medium**
- Google Calendar sync — **Low**
- Time blocking — **Low**
- Event reminders — **Low**

## Planned Additions (Phase 2)

Features committed to building before Phase 3 begins.

- Recurring events (content and calendar)
- Week view
- Add from calendar

## Future Considerations (Phase 3+)

Features that are on the radar but not yet committed.

- Google Calendar sync
- Time blocking
- Apple Calendar export

## Technical Notes

Any important technical context, constraints, or decisions relevant to this section.

- Calendar data is derived from existing tables — no separate events table
- Content events use `scheduled_date` or `published_date`
- Milestones use `project_milestones` table
