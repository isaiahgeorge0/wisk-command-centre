export type DueDateTone = "overdue" | "today" | "default";

export function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function formatTaskDueDate(dueDate: string | null | undefined): string {
  if (!dueDate) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dueDate}T00:00:00`));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getDueDateTone(
  dueDate: string | null | undefined,
  completed: boolean
): DueDateTone {
  if (!dueDate || completed) {
    return "default";
  }

  const due = startOfDay(new Date(`${dueDate}T00:00:00`));
  const today = startOfDay(new Date());

  if (due < today) {
    return "overdue";
  }
  if (due.getTime() === today.getTime()) {
    return "today";
  }
  return "default";
}

export const DUE_DATE_TONE_CLASS: Record<DueDateTone, string> = {
  overdue: "text-red-400",
  today: "text-amber-400",
  default: "text-muted-foreground",
};
