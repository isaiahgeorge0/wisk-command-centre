"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

import { TaskRow } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import type { ProjectOption, TaskWithProject } from "@/lib/tasks/types";

type TasksListProps = {
  tasks: TaskWithProject[];
  projects: ProjectOption[];
  onTaskUpdate: (task: TaskWithProject) => void;
  onTaskDelete: (task: TaskWithProject) => void;
};

export function TasksList({
  tasks,
  projects,
  onTaskUpdate,
  onTaskDelete,
}: TasksListProps) {
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const { incomplete, completed } = useMemo(() => {
    const incompleteTasks: TaskWithProject[] = [];
    const completedTasks: TaskWithProject[] = [];

    for (const task of tasks) {
      if (task.completed) {
        completedTasks.push(task);
      } else {
        incompleteTasks.push(task);
      }
    }

    return { incomplete: incompleteTasks, completed: completedTasks };
  }, [tasks]);

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      {incomplete.length > 0 ? (
        <div>
          {incomplete.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              projects={projects}
              onUpdate={onTaskUpdate}
              onDelete={onTaskDelete}
            />
          ))}
        </div>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No open tasks — you&apos;re all caught up.
        </p>
      )}

      {completed.length > 0 ? (
        <div className="border-t border-border/60">
          <div className="flex items-center justify-between px-4 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setCompletedExpanded((prev) => !prev)}
            >
              {completedExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              {completedExpanded
                ? "Hide completed"
                : `Show completed (${completed.length})`}
            </Button>
          </div>

          {completedExpanded ? (
            <div>
              {completed.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  projects={projects}
                  onUpdate={onTaskUpdate}
                  onDelete={onTaskDelete}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
