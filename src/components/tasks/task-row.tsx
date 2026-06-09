"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleTaskCompleted, updateTask } from "@/app/(dashboard)/tasks/actions";
import { ExpandableSection } from "@/components/motion/expandable-section";
import { usePreferences } from "@/components/preferences/preferences-context";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
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
  expanded: boolean;
  onExpandToggle: () => void;
  onDelete: (task: TaskWithProject) => void;
  onUpdate: (task: TaskWithProject) => void;
};

export function TaskRow({
  task,
  projects,
  expanded,
  onExpandToggle,
  onDelete,
  onUpdate,
}: TaskRowProps) {
  const { fieldVisibility } = usePreferences();
  const vis = fieldVisibility.tasks;
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

  const handleRowClick = () => {
    if (editing) return;
    onExpandToggle();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
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
    <div className="border-b border-border/50">
      <div
        role="button"
        tabIndex={0}
        className="group flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-card/50 sm:flex-nowrap"
        onClick={handleRowClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleRowClick();
          }
        }}
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
            {vis.priorityBadge ? (
              <TaskPriorityBadge priority={task.priority} />
            ) : null}
            {vis.projectTag ? (
              <TaskProjectTag projectName={task.project_name} />
            ) : null}
          </div>
        </div>

        {vis.dueDate ? (
          <TaskDueDate dueDate={task.due_date} completed={task.completed} />
        ) : null}

        <div
          className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 px-2 text-xs md:h-8"
            onClick={handleEdit}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 px-2 text-xs text-destructive hover:text-destructive md:h-8"
            onClick={() => onDelete(task)}
          >
            Delete
          </Button>
        </div>
      </div>

      <ExpandableSection open={expanded}>
        <TaskDetailPanel
          task={task}
          className="border-t-0"
          footer={
            <>
              <Button type="button" variant="outline" size="sm" onClick={handleEdit}>
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(task)}
              >
                Delete
              </Button>
            </>
          }
        />
      </ExpandableSection>
    </div>
  );
}
