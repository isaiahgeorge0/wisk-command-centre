-- Expand notification types for smart suggestions and collaboration
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'overdue_task',
      'deadline_approaching',
      'stalled_project',
      'goal_no_progress',
      'follow_up_overdue',
      'connection_request',
      'suggestion_lead_stalled',
      'suggestion_project_deadline',
      'suggestion_goal_no_progress',
      'suggestion_content_streak',
      'suggestion_overdue_followup'
    )
  );
