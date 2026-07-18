"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

import { StaggerItem } from "@/components/motion/stagger-item";
import { StaggerList } from "@/components/motion/stagger-list";
import { TaskRow } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import { useStaggerOnce } from "@/lib/motion/use-stagger-once";
import { getDueDateTone } from "@/lib/tasks/format";
import type { ProjectOption, TaskWithProject } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

type TaskGroupTone = "overdue" | "today" | "upcoming" | "no-date";

const TASK_GROUP_STYLES: Record<
  TaskGroupTone,
  { dot: string; badge: string }
> = {
  overdue: {
    dot: "bg-red-500",
    badge: "bg-red-500/10 text-red-500",
  },
  today: {
    dot: "bg-orange-500",
    badge: "bg-orange-500/10 text-orange-500",
  },
  upcoming: {
    dot: "bg-wisk-section-tasks",
    badge: "bg-wisk-section-tasks/10 text-wisk-section-tasks",
  },
  "no-date": {
    dot: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  },
};

function TaskGroupHeader({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: TaskGroupTone;
}) {
  const styles = TASK_GROUP_STYLES[tone];

  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={cn("inline-block size-1.5 rounded-full", styles.dot)} />
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          styles.badge
        )}
      >
        {count}
      </span>
    </div>
  );
}

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
  const stagger = useStaggerOnce();
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const handleExpandToggle = (taskId: string) => {
    setExpandedTaskId((current) => (current === taskId ? null : taskId));
  };

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

  const incompleteGroups = useMemo(() => {
    const overdue: TaskWithProject[] = [];
    const today: TaskWithProject[] = [];
    const upcoming: TaskWithProject[] = [];
    const noDate: TaskWithProject[] = [];

    for (const task of incomplete) {
      if (!task.due_date) {
        noDate.push(task);
        continue;
      }

      const tone = getDueDateTone(task.due_date, false);
      if (tone === "overdue") {
        overdue.push(task);
      } else if (tone === "today") {
        today.push(task);
      } else {
        upcoming.push(task);
      }
    }

    return [
      { label: "Overdue", tone: "overdue" as const, tasks: overdue },
      { label: "Due today", tone: "today" as const, tasks: today },
      { label: "Upcoming", tone: "upcoming" as const, tasks: upcoming },
      { label: "No date", tone: "no-date" as const, tasks: noDate },
    ].filter((group) => group.tasks.length > 0);
  }, [incomplete]);

  return (
    <div>
      {incomplete.length > 0 ? (
        <div>
          {incompleteGroups.map((group, index) => (
            <section key={group.tone} className={index > 0 ? "mt-5" : undefined}>
              <TaskGroupHeader
                label={group.label}
                count={group.tasks.length}
                tone={group.tone}
              />
              <StaggerList stagger={stagger}>
                {group.tasks.map((task) => (
                  <StaggerItem key={task.id} stagger={stagger} as="div">
                    <TaskRow
                      task={task}
                      projects={projects}
                      expanded={expandedTaskId === task.id}
                      onExpandToggle={() => handleExpandToggle(task.id)}
                      onUpdate={onTaskUpdate}
                      onDelete={onTaskDelete}
                    />
                  </StaggerItem>
                ))}
              </StaggerList>
            </section>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-border/60 bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-sm">
          No open tasks — you&apos;re all caught up.
        </p>
      )}

      {completed.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
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
                  expanded={expandedTaskId === task.id}
                  onExpandToggle={() => handleExpandToggle(task.id)}
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
