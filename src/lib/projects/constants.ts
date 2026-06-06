import type {
  ProjectFilters,
  ProjectSortKey,
  ProjectStatus,
} from "@/lib/projects/types";
import { PROJECT_STATUSES } from "@/lib/projects/types";

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

export const PROJECT_STATUS_FILTER_OPTIONS: {
  value: "all" | (typeof PROJECT_STATUSES)[number];
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export const PROJECT_SORT_OPTIONS: {
  value: ProjectSortKey;
  label: string;
}[] = [
  { value: "created_at", label: "Date added" },
  { value: "updated_at", label: "Last updated" },
  { value: "deadline", label: "Deadline" },
  { value: "value", label: "Value" },
  { value: "project_name", label: "Name" },
];

export const DEFAULT_PROJECT_FILTERS: ProjectFilters = {
  search: "",
  status: "all",
  service_type: "all",
  sort_key: "created_at",
  sort_direction: "desc",
};
