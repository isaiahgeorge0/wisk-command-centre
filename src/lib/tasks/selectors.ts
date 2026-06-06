import { PRIORITY_ORDER } from "./constants";
import type { TaskFilters, TaskWithProject } from "./types";

function toDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getLocalToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getLocalEndOfWeek(): Date {
  const today = getLocalToday();
  const day = today.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const end = new Date(today);
  end.setDate(today.getDate() + daysUntilSunday);
  return end;
}

export function applyTaskFilters(
  tasks: TaskWithProject[],
  filters: TaskFilters
): TaskWithProject[] {
  const today = getLocalToday();
  const endOfWeek = getLocalEndOfWeek();

  let result = tasks.filter((task) => {
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(q);
      const matchesProject = task.project_name?.toLowerCase().includes(q) ?? false;
      if (!matchesTitle && !matchesProject) return false;
    }

    if (filters.status === "incomplete" && task.completed) return false;
    if (filters.status === "complete" && !task.completed) return false;

    if (filters.priority !== "all" && task.priority !== filters.priority) return false;

    if (filters.project_id !== "all" && task.project_id !== filters.project_id) return false;

    if (filters.due_date !== "all") {
      if (filters.due_date === "no_date") {
        if (task.due_date !== null) return false;
      } else {
        if (!task.due_date) return false;
        const due = toDateOnly(task.due_date);
        if (filters.due_date === "overdue" && due >= today) return false;
        if (filters.due_date === "today" && due.getTime() !== today.getTime()) return false;
        if (filters.due_date === "this_week" && (due < today || due > endOfWeek)) return false;
      }
    }

    return true;
  });

  const dir = filters.sort_direction === "asc" ? 1 : -1;

  result = [...result].sort((a, b) => {
    switch (filters.sort_key) {
      case "due_date": {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return dir * (toDateOnly(a.due_date).getTime() - toDateOnly(b.due_date).getTime());
      }
      case "priority": {
        const pa = PRIORITY_ORDER[a.priority ?? ""] ?? 99;
        const pb = PRIORITY_ORDER[b.priority ?? ""] ?? 99;
        return dir * (pa - pb);
      }
      case "project": {
        return dir * (a.project_name ?? "").localeCompare(b.project_name ?? "");
      }
      case "title": {
        return dir * a.title.localeCompare(b.title);
      }
      case "created_at":
      default: {
        return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    }
  });

  return result;
}

export function countActiveFilters(filters: TaskFilters): number {
  let count = 0;
  if (filters.search.trim()) count++;
  if (filters.priority !== "all") count++;
  if (filters.status !== "incomplete") count++;
  if (filters.project_id !== "all") count++;
  if (filters.due_date !== "all") count++;
  return count;
}
