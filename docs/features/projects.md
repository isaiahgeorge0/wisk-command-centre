# Projects — Feature Specification

## Current State

What is built and working today.

- Project cards with expand/collapse
- Three tabs: Details, Tasks, Milestones
- Fields: project name, client name, project type, status, next action, deadline, value, notes, site URL, GitHub repo
- Task progress bar
- Inline edit and delete
- Vercel site health
- GitHub activity
- Milestones on calendar
- Filtering by status and service type
- Sorting by name, deadline, value, and date created
- Status grouping: Active, Paused, Completed & Archived
- Search by project name, client name, and service type

## Gaps and Missing Features

What is missing or underdeveloped, with a priority rating (High/Medium/Low) per item.
- Total pipeline value visible on overview — **Medium**
- Client as own entity (see all projects per client) — **Medium**
- Project templates with pre-loaded tasks — **Medium**
- Time tracking per project — **Low**
- Invoice/payment status — **Low**

## Planned Additions (Phase 2)

Features committed to building before Phase 3 begins.

- Pipeline value on overview

## Future Considerations (Phase 3+)

Features that are on the radar but not yet committed.

- Client entity
- Project templates
- Time tracking
- Invoice status

## Technical Notes

Any important technical context, constraints, or decisions relevant to this section.

- `service_type` stored as text in DB, renamed to `project_type` in UI
- `site_url` and `github_repo` only shown when project type contains web/app development
- Vercel and GitHub require tokens stored encrypted in `user_integrations`
