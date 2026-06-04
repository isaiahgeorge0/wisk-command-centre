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
