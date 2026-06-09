# Tasks — Feature Specification

## Current State

What is built and working today.

- Tasks list grouped incomplete/complete
- Fields: title, project link, due date, priority, completed, notes (`raw_content`)
- Priority badges
- Due date colouring
- Project tag
- Checkbox toggle
- Inline edit
- Quick-add modal (global FAB on overview and calendar)
- Filtering by priority, status, project, and due date
- Sorting by due date, priority, project, and title
- Search by title and project name

## Gaps and Missing Features

What is missing or underdeveloped, with a priority rating (High/Medium/Low) per item.

- File attachments — **High**
- Custom status beyond complete/incomplete — **Medium**
- Subtasks — **Medium**
- Recurring tasks — **Medium**
- Bulk actions — **Medium**
- Estimated time field — **Low**
- Task dependencies — **Low**
- Task comments — **Low**

## Planned Additions (Phase 2)

Features committed to building before Phase 3 begins.

- File attachments (Supabase Storage)
- Subtasks

## Future Considerations (Phase 3+)

Features that are on the radar but not yet committed.

- Recurring tasks
- Bulk actions
- Dependencies
- Time tracking

## Technical Notes

Any important technical context, constraints, or decisions relevant to this section.

- Tasks link to projects via `project_id` nullable FK
- Completed tasks collapsed by default with toggle
- Edit/delete always visible on mobile, hover only on desktop
