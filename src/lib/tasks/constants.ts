import type { TaskPriority } from "@/lib/tasks/types";

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const TASK_PRIORITY_BADGE_CLASS: Record<TaskPriority, string> = {
  high: "border-red-500/30 bg-red-500/15 text-red-400",
  medium: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  low: "border-border bg-muted text-muted-foreground",
};
