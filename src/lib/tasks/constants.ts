import type {
  TaskDueDateFilter,
  TaskFilters,
  TaskPriority,
  TaskSortKey,
  TaskStatusFilter,
} from "./types";

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

export const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const TASK_STATUS_OPTIONS: { value: TaskStatusFilter; label: string }[] = [
  { value: "all", label: "All tasks" },
  { value: "incomplete", label: "Incomplete" },
  { value: "complete", label: "Complete" },
];

export const TASK_PRIORITY_FILTER_OPTIONS: { value: TaskPriority | "all"; label: string }[] = [
  { value: "all", label: "Any priority" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const TASK_DUE_DATE_OPTIONS: { value: TaskDueDateFilter; label: string }[] = [
  { value: "all", label: "Any date" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "no_date", label: "No date" },
];

export const TASK_SORT_OPTIONS: { value: TaskSortKey; label: string }[] = [
  { value: "created_at", label: "Date added" },
  { value: "due_date", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "project", label: "Project" },
  { value: "title", label: "Title" },
];

export const DEFAULT_TASK_FILTERS: TaskFilters = {
  search: "",
  priority: "all",
  status: "incomplete",
  project_id: "all",
  due_date: "all",
  sort_key: "created_at",
  sort_direction: "desc",
};
