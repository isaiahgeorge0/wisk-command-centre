import type { TaskWithProject } from "@/lib/tasks/types";

export type TaskProgressTone = "low" | "mid" | "high" | "complete";

export type ProjectTaskStats = {
  completed: number;
  total: number;
  percent: number;
};

export const TASK_PROGRESS_FILL_CLASS: Record<TaskProgressTone, string> = {
  low: "bg-wisk-coral",
  mid: "bg-amber-400",
  high: "bg-wisk-teal",
  complete: "bg-emerald-400",
};

export function getTaskCompletionPercent(
  completed: number,
  total: number
): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

export function getTaskProgressTone(percent: number): TaskProgressTone {
  if (percent >= 100) return "complete";
  if (percent >= 67) return "high";
  if (percent >= 34) return "mid";
  return "low";
}

export function getProjectTaskStats(
  tasks: TaskWithProject[],
  projectId: string
): ProjectTaskStats {
  const projectTasks = tasks.filter((task) => task.project_id === projectId);
  const total = projectTasks.length;
  const completed = projectTasks.filter((task) => task.completed).length;

  return {
    completed,
    total,
    percent: getTaskCompletionPercent(completed, total),
  };
}

export function getProjectTaskStatsMap(
  tasks: TaskWithProject[]
): Record<string, ProjectTaskStats> {
  const projectIds = new Set(
    tasks
      .map((task) => task.project_id)
      .filter((id): id is string => Boolean(id))
  );

  return Object.fromEntries(
    Array.from(projectIds).map((projectId) => [
      projectId,
      getProjectTaskStats(tasks, projectId),
    ])
  );
}
