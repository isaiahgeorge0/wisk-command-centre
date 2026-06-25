# Overview — Feature Specification

## Current State

What is built and working today.

- Time-aware homepage
- Stat cards
- Needs attention
- This week
- Recently added
- Recent leads
- Mobile weekly calendar strip
- **Properties tab** (users with Properties package):
  full command centre view replacing the previous
  minimal snapshot
  - Portfolio summary stat cards (total properties,
    occupied/vacant, rent due this month, open
    maintenance)
  - Needs attention (overdue rent, emergency
    maintenance, pending access requests, expiring
    certificates)
  - Next 30 days timeline (rent due, contractor
    visits, certificate expiry, mortgage fixed-rate
    ends, insurance renewals)
  - Open maintenance with job sheet detail
    (contractor, visit date, latest update)
  - Unread messages call-to-action

## Gaps and Missing Features

What is missing or underdeveloped, with a priority rating (High/Medium/Low) per item.

- Revenue snapshot (total project value, invoiced, outstanding) — **Medium**
- Quick capture from overview — **Medium**
- Customisable widgets — **Low**
- Weekly email digest — **Low**
- Week on week trend indicators — **Low**

## Planned Additions (Phase 2)

Features committed to building before Phase 3 begins.

- Quick capture (add task or idea without leaving overview)
- Revenue snapshot

## Future Considerations (Phase 3+)

Features that are on the radar but not yet committed.

- Customisable widgets
- Weekly email digest
- Trend indicators
- AI-powered priority recommendations

## Technical Notes

Any important technical context, constraints, or decisions relevant to this section.

- Core overview data derived from existing section queries via `buildOverviewSnapshot()`
- Properties tab fetches portfolio stats, rent due flags,
  maintenance tickets (with job sheets), certificates,
  access requests, mortgages, and insurance via
  `src/app/(dashboard)/page.tsx`
- No separate overview DB tables
- Time-aware header uses day of week and hour
- Display name added to time-based greetings only
