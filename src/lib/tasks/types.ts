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
};

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
