import type { GoalStatus } from "@/lib/goals/types";
import type { ProgressTone } from "@/lib/goals/format";

export const GOAL_CATEGORY_SUGGESTIONS = [
  "Revenue",
  "Projects",
  "Content",
  "Personal",
] as const;

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

export const GOAL_STATUS_BADGE_CLASS: Record<GoalStatus, string> = {
  active: "border-wisk-teal/30 bg-wisk-teal/15 text-wisk-teal",
  paused: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  completed: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  archived: "border-border bg-muted text-muted-foreground",
};

export const PROGRESS_BAR_FILL_CLASS: Record<ProgressTone, string> = {
  low: "bg-red-400",
  mid: "bg-amber-400",
  high: "bg-wisk-teal",
  complete: "bg-emerald-400",
};

export const PROGRESS_ACCENT_BORDER_CLASS: Record<ProgressTone, string> = {
  low: "border-l-red-400/70",
  mid: "border-l-amber-400/70",
  high: "border-l-wisk-teal/70",
  complete: "border-l-emerald-400/70",
};
