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
  onSelect?: (task: TaskWithProject) => void;
};

export function ProjectTaskRow({ task, onUpdate, onSelect }: ProjectTaskRowProps) {
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
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40",
        onSelect && "cursor-pointer",
        task.completed && "opacity-70"
      )}
      onClick={
        onSelect
          ? (e) => {
              if ((e.target as HTMLElement).closest('[data-slot="checkbox"]')) {
                return;
              }
              onSelect(task);
            }
          : undefined
      }
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(task);
              }
            }
          : undefined
      }
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
