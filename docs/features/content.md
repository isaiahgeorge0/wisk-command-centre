# Content — Feature Specification

## Current State

What is built and working today.

- Two tabs: calendar and board
- Multi-platform selection
- Platform colour coding
- Fields: title, platforms, content type, status, dates, hook, description, tags, goal link
- Stats bar with streak
- Board drag and drop
- Recurring content (daily, weekly, monthly, yearly)
- Per-occurrence notes via occurrence panel
- **Brainstorm with Winston** — durable `scope_key: 'content-calendar'` (migration 072), same chat/"Schedule this" mechanic as Calendar (see `calendar.md`, `winston.md`). Always produces a `content_post` proposal — dated if the conversation established one, otherwise `status: 'idea'` with a null `scheduled_date`. Isolated thread from Calendar and Notes.
- **Awaiting a date filter + badge** — undated content posts created via Winston (or otherwise sitting without a `scheduled_date`) get a persistent filter in the board view plus a badge on the card, rather than a recurring nag. A one-shot `awaiting_date` notification fires when one is created via Winston commit.

## Gaps and Missing Features

What is missing or underdeveloped, with a priority rating (High/Medium/Low) per item.
- Content performance manual input — **Medium**
- Content templates — **Medium**
- Hook library — **Medium**
- Content brief fields — **Low**
- Content to lead linking — **Low**
- Batch creation — **Low**

## Planned Additions (Phase 2)

Features committed to building before Phase 3 begins.

- Content performance manual input
- Content templates
- Hook library
- Winston brainstorming — COMPLETE

## Future Considerations (Phase 3+)

Features that are on the radar but not yet committed.

- Full social API integration (Phase 3 Social Package) — confirmed untouched as of the last codebase audit; platform names exist only as enums/labels, no OAuth/publishing/ingestion built
- AI content ideas
- Competitor tracking
- Direct publishing

## Technical Notes

Any important technical context, constraints, or decisions relevant to this section.

- `platforms` stored as `text[]` array
- Original `platform` column kept for backward compatibility
- `published_date` auto-set when moved to Published status
- Streak calculated from consecutive days with `published_date`
- `status` defaults to `'idea'` and `scheduled_date` is nullable — this existing design is exactly what let the Winston brainstorm's "no date yet" case slot in without any schema change
- Winston brainstorm reuses the same shared proposal commit path as every other Winston-generated entity — no separate creation logic
