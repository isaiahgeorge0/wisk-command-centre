"use client";

import { CheckSquare } from "lucide-react";

import { ProjectTaskQuickAdd } from "@/components/projects/project-task-quick-add";
import { ProjectTaskRow } from "@/components/projects/project-task-row";
import type { TaskWithProject } from "@/lib/tasks/types";

type ProjectTasksTabProps = {
  projectId: string;
  tasks: TaskWithProject[];
  onTaskUpdate: (task: TaskWithProject) => void;
  onTaskCreated: (task: TaskWithProject) => void;
  onTaskCreateFailed: (taskId: string) => void;
  onTaskCreateConfirmed: (tempId: string, task: TaskWithProject) => void;
};

function sortProjectTasks(tasks: TaskWithProject[]) {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    if (a.due_date && b.due_date) {
      return a.due_date.localeCompare(b.due_date);
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return a.title.localeCompare(b.title);
  });
}

export function ProjectTasksTab({
  projectId,
  tasks,
  onTaskUpdate,
  onTaskCreated,
  onTaskCreateFailed,
  onTaskCreateConfirmed,
}: ProjectTasksTabProps) {
  const sortedTasks = sortProjectTasks(tasks);

  return (
    <div>
      {sortedTasks.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CheckSquare
            className="mb-3 size-8 text-muted-foreground/60"
            aria-hidden
          />
          <p className="text-sm text-muted-foreground">
            No tasks linked to this project yet.
          </p>
        </div>
      ) : (
        <ul className="space-y-0.5">
          {sortedTasks.map((task) => (
            <li key={task.id}>
              <ProjectTaskRow task={task} onUpdate={onTaskUpdate} />
            </li>
          ))}
        </ul>
      )}

      <ProjectTaskQuickAdd
        projectId={projectId}
        onCreated={onTaskCreated}
        onCreateFailed={onTaskCreateFailed}
        onCreateConfirmed={onTaskCreateConfirmed}
      />
    </div>
  );
}
