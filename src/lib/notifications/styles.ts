import type { NotificationType } from "@/lib/notifications/types";

export const NOTIFICATION_ACCENT_CLASS: Record<NotificationType, string> = {
  overdue_task: "border-l-red-400/80 bg-red-500/[0.04]",
  deadline_approaching: "border-l-amber-400/80 bg-amber-500/[0.04]",
  stalled_project: "border-l-amber-400/80 bg-amber-500/[0.04]",
  goal_no_progress: "border-l-wisk-purple/80 bg-wisk-purple/[0.06]",
  follow_up_overdue: "border-l-orange-400/80 bg-orange-500/[0.04]",
};

export const NOTIFICATION_DOT_CLASS: Record<NotificationType, string> = {
  overdue_task: "bg-red-400",
  deadline_approaching: "bg-amber-400",
  stalled_project: "bg-amber-400",
  goal_no_progress: "bg-wisk-purple",
  follow_up_overdue: "bg-orange-400",
};
