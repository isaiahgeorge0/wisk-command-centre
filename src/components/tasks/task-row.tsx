"use client";

import { useRouter } from "next/navigation";
import { ChevronUp } from "lucide-react";
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
  const PRIORITY_LEFT_COLOUR: Record<string, string> = {
    high: "#e8001d",
    medium: "#ff5d00",
    low: "#aca0ff",
  };
  const priorityColour = task.priority
    ? PRIORITY_LEFT_COLOUR[task.priority] ?? "#aca0ff"
    : "#aca0ff";

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

  const handleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExpandToggle();
  };

  if (editing) {
    return (
      <div className="mb-2 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
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
      className={cn(
        "group/row relative mb-2 overflow-hidden rounded-xl border bg-card/60 p-4 transition-all duration-150",
        task.completed
          ? "border-border/40 opacity-60"
          : "border-border/60 hover:border-wisk-section-tasks/30 hover:bg-card/80 hover:shadow-sm",
        expanded && !task.completed && "border-wisk-section-tasks/30"
      )}
    >
      {!task.completed ? (
        <div
          className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
          style={{ background: priorityColour, opacity: 0.7 }}
        />
      ) : null}

      {expanded ? (
        <button
          type="button"
          aria-label="Collapse task"
          className="absolute top-3 right-3 z-10 text-muted-foreground transition-colors hover:text-foreground"
          onClick={handleCollapse}
        >
          <ChevronUp className="size-4" />
        </button>
      ) : null}

      <div
        role="button"
        tabIndex={0}
        className="group flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 pl-2 pr-6 transition-colors sm:flex-nowrap"
        onClick={handleRowClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleRowClick();
          }
        }}
      >
        <div className="flex size-5 shrink-0 items-center justify-center">
          <Checkbox
            checked={task.completed}
            onCheckedChange={handleToggle}
            onClick={(e) => e.stopPropagation()}
            disabled={isPending}
            aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
            className="size-4.5"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-sm font-semibold tracking-tight",
                task.completed
                  ? "text-muted-foreground/50 line-through"
                  : "text-foreground"
              )}
            >
              {task.title}
            </span>
            {!task.completed && task.priority ? (
              <span
                className="inline-flex size-2 shrink-0 rounded-full"
                style={{ background: priorityColour }}
                title={task.priority}
              />
            ) : null}
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
          className="mt-3 border-t border-border/50 pt-3"
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
