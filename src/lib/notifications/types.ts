export const NOTIFICATION_TYPES = [
  "overdue_task",
  "deadline_approaching",
  "stalled_project",
  "goal_no_progress",
  "follow_up_overdue",
  "connection_request",
  "suggestion_lead_stalled",
  "suggestion_project_deadline",
  "suggestion_goal_no_progress",
  "suggestion_content_streak",
  "suggestion_overdue_followup",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  reference_id: string;
  title: string;
  message: string;
  read: boolean;
  link_to: string;
  created_at: string;
};

export type NotificationCandidate = {
  type: NotificationType;
  reference_id: string;
  title: string;
  message: string;
  link_to: string;
};

export type NotificationKey = `${NotificationType}:${string}`;

export function notificationKey(
  type: NotificationType,
  referenceId: string
): NotificationKey {
  return `${type}:${referenceId}`;
}
