export const TASK_PRIORITIES = ["high", "medium", "low"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type Task = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  due_date: string | null;
  priority: TaskPriority | string | null;
  completed: boolean;
  raw_content: string | null;
  created_at: string;
  updated_at?: string;
};

/** Typed for future Supabase Storage wiring — not queried yet. */
export type TaskAttachment = {
  id: string;
  task_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
};

export type TaskWithProject = Task & {
  project_name: string | null;
};

export type ProjectOption = {
  id: string;
  project_name: string;
};

export type TaskFormInput = {
  title: string;
  priority: TaskPriority;
  project_id?: string;
  due_date?: string;
  raw_content?: string;
};

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type TaskStatusFilter = "all" | "incomplete" | "complete";

export type TaskDueDateFilter =
  | "all"
  | "overdue"
  | "today"
  | "this_week"
  | "no_date";

export type TaskSortKey =
  | "created_at"
  | "due_date"
  | "priority"
  | "project"
  | "title";

export type TaskSortDirection = "asc" | "desc";

export type TaskFilters = {
  search: string;
  priority: TaskPriority | "all";
  status: TaskStatusFilter;
  project_id: string | "all";
  due_date: TaskDueDateFilter;
  sort_key: TaskSortKey;
  sort_direction: TaskSortDirection;
};
