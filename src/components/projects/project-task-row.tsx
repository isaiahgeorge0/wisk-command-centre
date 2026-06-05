"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { toggleTaskCompleted } from "@/app/(dashboard)/tasks/actions";
import { TaskDueDate } from "@/components/tasks/task-due-date";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { TaskWithProject } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

type ProjectTaskRowProps = {
  task: TaskWithProject;
  onUpdate: (task: TaskWithProject) => void;
};

export function ProjectTaskRow({ task, onUpdate }: ProjectTaskRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    onUpdate({ ...task, completed: checked });

    startTransition(async () => {
      const result = await toggleTaskCompleted(task.id, checked);
      if (!result.success) {
        onUpdate({ ...task, completed: !checked });
        return;
      }
      if (result.data) {
        onUpdate(result.data);
      }
      router.refresh();
    });
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40",
        task.completed && "opacity-70"
      )}
    >
      <Checkbox
        checked={task.completed}
        disabled={isPending}
        onCheckedChange={(checked) => handleToggle(checked === true)}
        onClick={(e) => e.stopPropagation()}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm text-foreground",
            task.completed && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>
      </div>
      <TaskPriorityBadge priority={task.priority} />
      <TaskDueDate dueDate={task.due_date} completed={task.completed} />
    </div>
  );
}
