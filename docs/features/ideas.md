# Ideas — Feature Specification

## Current State

What is built and working today.

- Ideas grouped new+exploring/in-progress/parked+dropped
- Fields: title, description, category, status
- Click to expand
- Inline edit
- Quick-add
- Convert idea to project (one click) — LIVE
- Convert idea to content post (one click) — LIVE
- **Winston-sourced ideas** — `idea` is one of five `entityType`s on the shared Winston proposal contract (see `winston.md`). Most notably, a Calendar brainstorm with Winston that can't establish a confident date lands here as an idea (category "Calendar") rather than as a partial calendar event, since `calendar_events.date` is `NOT NULL`. Created through the same `createIdea` action as manual ideas — no separate creation path.
- **Awaiting a date section/filter** — ideas created this way (and undated content posts, on the Content side) are visible through a dedicated filter rather than a recurring nag. A one-shot `awaiting_date` notification (migration 071 extends the `notifications.type` constraint) fires once at creation and is excluded from any notification regeneration sweep, so it isn't silently wiped.

## Gaps and Missing Features

What is missing or underdeveloped, with a priority rating (High/Medium/Low) per item.
- Ideas search and filtering — **Medium**
- Rich text description — **Low**
- Board view alternative — **Low**
- Tag system beyond category — **Low**

## Planned Additions (Phase 2)

- Search and filtering — still planned
- Winston-sourced ideas (Calendar brainstorm fallback) — COMPLETE

## Future Considerations (Phase 3+)

Features that are on the radar but not yet committed.

- Rich text
- Board view
- Enhanced tagging

## Technical Notes

Any important technical context, constraints, or decisions relevant to this section.

- Status values are `new`, `exploring`, `in-progress`, `parked`, `dropped`
- Category is free text — Winston-sourced calendar fallbacks use `"Calendar"` as the category, not a new status value
- No DB relations to other tables on the `ideas` table itself — Winston-sourced ideas are identifiable by category/notification, not a foreign key
- `awaiting_date` notification type (migration 071) is the mechanism for surfacing these without a recurring cron nudge — no new cron job was added for this
