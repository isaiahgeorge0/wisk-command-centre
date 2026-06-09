"use client";

import { usePreferences } from "@/components/preferences/preferences-context";
import { TaskAttachmentsSection } from "@/components/tasks/task-attachments-section";
import { TaskDueDate } from "@/components/tasks/task-due-date";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { TaskProjectTag } from "@/components/tasks/task-project-tag";
import type { TaskWithProject } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

type TaskDetailPanelProps = {
  task: TaskWithProject;
  className?: string;
  footer?: React.ReactNode;
};

export function TaskDetailPanel({
  task,
  className,
  footer,
}: TaskDetailPanelProps) {
  const { fieldVisibility } = usePreferences();
  const vis = fieldVisibility.tasks;

  return (
    <div
      className={cn(
        "max-h-72 space-y-4 overflow-y-auto border-t border-border/40 bg-muted/10 px-4 py-4",
        className
      )}
    >
      <h3
        className={cn(
          "text-base font-semibold leading-snug text-foreground",
          task.completed && "text-muted-foreground line-through"
        )}
      >
        {task.title}
      </h3>

      <div className="flex flex-wrap items-center gap-2">
        {vis.priorityBadge ? (
          <TaskPriorityBadge priority={task.priority} />
        ) : null}
        {vis.dueDate ? (
          <TaskDueDate dueDate={task.due_date} completed={task.completed} />
        ) : null}
        {vis.projectTag ? (
          <TaskProjectTag projectName={task.project_name} />
        ) : null}
      </div>

      <section className="space-y-1.5">
        <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Notes
        </h4>
        {task.raw_content?.trim() ? (
          <p className="text-sm whitespace-pre-wrap text-foreground">
            {task.raw_content}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No notes added.</p>
        )}
      </section>

      <TaskAttachmentsSection />

      {footer ? <div className="flex flex-wrap gap-2 pt-1">{footer}</div> : null}
    </div>
  );
}
