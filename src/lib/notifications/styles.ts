import type { NotificationType } from "@/lib/notifications/types";

export const NOTIFICATION_ACCENT_CLASS: Record<NotificationType, string> = {
  overdue_task: "border-l-red-400/80 bg-red-500/[0.04]",
  deadline_approaching: "border-l-amber-400/80 bg-amber-500/[0.04]",
  stalled_project: "border-l-amber-400/80 bg-amber-500/[0.04]",
  goal_no_progress: "border-l-wisk-purple/80 bg-wisk-purple/[0.06]",
  follow_up_overdue: "border-l-orange-400/80 bg-orange-500/[0.04]",
  connection_request: "border-l-indigo-400/80 bg-indigo-500/[0.04]",
  suggestion_lead_stalled: "border-l-indigo-400/80 bg-indigo-500/[0.04]",
  suggestion_project_deadline: "border-l-wisk-coral/80 bg-wisk-coral/[0.06]",
  suggestion_goal_no_progress: "border-l-blue-400/80 bg-blue-500/[0.04]",
  suggestion_content_streak: "border-l-wisk-coral/80 bg-wisk-coral/[0.06]",
  suggestion_overdue_followup: "border-l-wisk-coral/80 bg-wisk-coral/[0.06]",
};

export const NOTIFICATION_DOT_CLASS: Record<NotificationType, string> = {
  overdue_task: "bg-red-400",
  deadline_approaching: "bg-amber-400",
  stalled_project: "bg-amber-400",
  goal_no_progress: "bg-wisk-purple",
  follow_up_overdue: "bg-orange-400",
  connection_request: "bg-indigo-500",
  suggestion_lead_stalled: "bg-indigo-500",
  suggestion_project_deadline: "bg-wisk-coral",
  suggestion_goal_no_progress: "bg-blue-400",
  suggestion_content_streak: "bg-wisk-coral",
  suggestion_overdue_followup: "bg-wisk-coral",
};

const SUGGESTION_NOTIFICATION_PREFIX = "suggestion_";

export function isSuggestionNotificationType(type: NotificationType): boolean {
  return type.startsWith(SUGGESTION_NOTIFICATION_PREFIX);
}
