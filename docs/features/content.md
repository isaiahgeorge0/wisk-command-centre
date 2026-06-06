# Content — Feature Specification

## Current State

What is built and working today.

- Two tabs: calendar and board
- Multi-platform selection
- Platform colour coding
- Fields: title, platforms, content type, status, dates, hook, description, tags, goal link
- Stats bar with streak
- Board drag and drop

## Gaps and Missing Features

What is missing or underdeveloped, with a priority rating (High/Medium/Low) per item.

- Recurring content — **High**
- Content performance manual input — **Medium**
- Content templates — **Medium**
- Hook library — **Medium**
- Content brief fields — **Low**
- Content to lead linking — **Low**
- Batch creation — **Low**

## Planned Additions (Phase 2)

Features committed to building before Phase 3 begins.

- Recurring content
- Content performance manual input
- Content templates
- Hook library

## Future Considerations (Phase 3+)

Features that are on the radar but not yet committed.

- Full social API integration (Phase 3 Social Package)
- AI content ideas
- Competitor tracking
- Direct publishing

## Technical Notes

Any important technical context, constraints, or decisions relevant to this section.

- `platforms` stored as `text[]` array
- Original `platform` column kept for backward compatibility
- `published_date` auto-set when moved to Published status
- Streak calculated from consecutive days with `published_date`
