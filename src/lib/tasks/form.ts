import type { TaskFormInput, TaskWithProject } from "@/lib/tasks/types";
import { TASK_PRIORITIES, type TaskPriority } from "@/lib/tasks/types";

export const NO_PROJECT_VALUE = "__none__";

export const EMPTY_TASK_FORM: TaskFormInput = {
  title: "",
  priority: "medium",
  project_id: NO_PROJECT_VALUE,
  due_date: "",
  raw_content: "",
};

export function taskToFormInput(task: TaskWithProject): TaskFormInput {
  return {
    title: task.title,
    priority: isTaskPriority(task.priority) ? task.priority : "medium",
    project_id: task.project_id ?? NO_PROJECT_VALUE,
    due_date: task.due_date ?? "",
    raw_content: task.raw_content ?? "",
  };
}

export function projectIdToDb(projectId: string | undefined): string | null {
  if (!projectId || projectId === NO_PROJECT_VALUE) {
    return null;
  }
  return projectId;
}

function isTaskPriority(priority: string | null): priority is TaskPriority {
  return TASK_PRIORITIES.includes(priority as TaskPriority);
}
