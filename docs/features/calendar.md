# Calendar — Feature Specification

## Current State

What is built and working today.

- Monthly grid Mon–Sun
- Colour-coded pills: projects purple, tasks teal, goals amber, milestones rose, content coral
- Filter toggles
- Day detail panel
- Upcoming 30/60/90 day panel
- Global task quick-add FAB
- **Brainstorm with Winston** — Sparkles entry opens a side panel with durable `ai_conversations.scope_key = 'calendar'` (migration 072, unique per user). Reopening resumes the same thread with full message history. Per-message "Schedule this" generates a reviewable Winston proposal (shared pattern, see `winston.md`): a confident date becomes a real `calendar_event`; if no confident date emerges, it becomes an `idea` instead (category "Calendar"), with reasoning explaining why no date was set. Nothing is created until the user commits. Isolated from Content Calendar (`content-calendar`) and Notes (`note_id`) — never shares message history across scopes.

## Gaps and Missing Features

What is missing or underdeveloped, with a priority rating (High/Medium/Low) per item.

- Recurring events — **High** (still open — `calendar_events` has no recurrence columns, unlike `content_posts` which already supports `recurrence_rule`/`recurrence_end_date`)
- Week view — **Medium**
- Add task/content directly from calendar — **Medium**
- Google Calendar sync — **Low**
- Time blocking — **Low**
- Event reminders — **Low**

## Planned Additions (Phase 2)

Features committed to building before Phase 3 begins.

- Recurring events on calendar (content recurrence is live)
- Week view
- Winston brainstorming — COMPLETE

## Future Considerations (Phase 3+)

Features that are on the radar but not yet committed.

- Google Calendar sync
- Time blocking
- Apple Calendar export

## Technical Notes

Any important technical context, constraints, or decisions relevant to this section.

- **Correction from a previous version of this doc:** calendar data is not purely derived from other tables — `calendar_events` is a real table (`id, user_id, title, date, end_date, event_type, notes, created_at, updated_at`), alongside project deadlines, milestones (`project_milestones`), and content dates (`scheduled_date`/`published_date`) which are pulled in separately.
- `calendar_events.date` is `NOT NULL` — there is no "awaiting a date" state on this table by design. A Winston brainstorm that can't establish a confident date is routed to `ideas` instead (category "Calendar", with a one-shot `awaiting_date` notification and an "Awaiting a date" filter in Ideas), rather than adding a nullable-date state here. This was a deliberate decision to reuse existing infrastructure rather than grow this table's state machine — revisit if there's a strong reason to keep undated calendar ideas inside Calendar specifically instead of Ideas.
- Content events use `scheduled_date` or `published_date`
- Milestones use `project_milestones` table
- Winston brainstorm chat reuses the same SSE streaming infra as Winston Chat and Notes brainstorming — no separate chat implementation. Persistence is server-side (`getOrCreateScopedConversation('calendar')`); messages are written in the chat route independent of client presence.
