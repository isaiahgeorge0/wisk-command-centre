"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleTaskCompleted, updateTask } from "@/app/tasks/actions";
import { TaskDueDate } from "@/components/tasks/task-due-date";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { TaskProjectTag } from "@/components/tasks/task-project-tag";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { taskToFormInput } from "@/lib/tasks/form";
import type { ProjectOption, TaskFormInput, TaskWithProject } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

type TaskRowProps = {
  task: TaskWithProject;
  projects: ProjectOption[];
  onDelete: (task: TaskWithProject) => void;
  onUpdate: (task: TaskWithProject) => void;
};

export function TaskRow({ task, projects, onDelete, onUpdate }: TaskRowProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<TaskFormInput>(taskToFormInput(task));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = `edit-task-${task.id}`;

  const cancelEdit = () => {
    setValues(taskToFormInput(task));
    setError(null);
    setEditing(false);
  };

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateTask(task.id, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data) {
        onUpdate(result.data);
      }
      setEditing(false);
      router.refresh();
    });
  };

  if (editing) {
    return (
      <div className="border-b border-border/50 bg-card/50 px-4 py-4">
        <form id={formId} onSubmit={handleSave}>
          <TaskForm
            formId={formId}
            values={values}
            onChange={setValues}
            projects={projects}
            disabled={isPending}
            compact
          />
          {error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : null}
        </form>
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cancelEdit}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} size="sm" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex cursor-pointer items-center gap-3 border-b border-border/50 px-4 py-3 transition-colors hover:bg-card/50"
      onClick={() => setEditing(true)}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={handleToggle}
        onClick={(e) => e.stopPropagation()}
        disabled={isPending}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "font-medium text-foreground",
              task.completed && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </span>
          <TaskPriorityBadge priority={task.priority} />
          <TaskProjectTag projectName={task.project_name} />
        </div>
      </div>

      <TaskDueDate dueDate={task.due_date} completed={task.completed} />

      <div
        className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-destructive hover:text-destructive"
          onClick={() => onDelete(task)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
