import type { ProjectStatus } from "@/lib/projects/types";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

export const PROJECT_STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  active: "border-wisk-teal/30 bg-wisk-teal/15 text-wisk-teal",
  paused: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  completed: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  archived: "border-border bg-muted text-muted-foreground",
};
