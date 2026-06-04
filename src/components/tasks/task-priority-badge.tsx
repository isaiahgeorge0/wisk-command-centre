import { Badge } from "@/components/ui/badge";
import {
  TASK_PRIORITY_BADGE_CLASS,
  TASK_PRIORITY_LABELS,
} from "@/lib/tasks/constants";
import type { TaskPriority } from "@/lib/tasks/types";
import { TASK_PRIORITIES } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

function normalizePriority(priority: string | null): TaskPriority {
  if (priority && TASK_PRIORITIES.includes(priority as TaskPriority)) {
    return priority as TaskPriority;
  }
  return "medium";
}

export function TaskPriorityBadge({
  priority,
  className,
}: {
  priority: string | null;
  className?: string;
}) {
  const normalized = normalizePriority(priority);

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        TASK_PRIORITY_BADGE_CLASS[normalized],
        className
      )}
    >
      {TASK_PRIORITY_LABELS[normalized]}
    </Badge>
  );
}
