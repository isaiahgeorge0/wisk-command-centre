import {
  DUE_DATE_TONE_CLASS,
  formatTaskDueDate,
  getDueDateTone,
} from "@/lib/tasks/format";
import { cn } from "@/lib/utils";

export function TaskDueDate({
  dueDate,
  completed,
  className,
}: {
  dueDate: string | null;
  completed: boolean;
  className?: string;
}) {
  const tone = getDueDateTone(dueDate, completed);
  const isOverdue = tone === "overdue";
  const isToday = tone === "today";

  if (!dueDate) return null;

  if (isOverdue && !completed) {
    return (
      <span
        className={cn(
          "shrink-0 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-red-500",
          className
        )}
      >
        {formatTaskDueDate(dueDate)}
      </span>
    );
  }

  if (isToday && !completed) {
    return (
      <span
        className={cn(
          "shrink-0 rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-orange-500",
          className
        )}
      >
        {formatTaskDueDate(dueDate)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "shrink-0 text-xs tabular-nums",
        DUE_DATE_TONE_CLASS[tone],
        className
      )}
    >
      {formatTaskDueDate(dueDate)}
    </span>
  );
}
