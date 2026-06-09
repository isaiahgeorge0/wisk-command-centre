"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";

import { StaggerItem } from "@/components/motion/stagger-item";
import { StaggerList } from "@/components/motion/stagger-list";
import { OverviewInlineEmpty } from "@/components/overview/overview-inline-empty";
import { usePreferences } from "@/components/preferences/preferences-context";
import { useStaggerOnce } from "@/lib/motion/use-stagger-once";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { TaskProjectTag } from "@/components/tasks/task-project-tag";
import { formatGoalDeadline } from "@/lib/goals/format";
import { formatShortDueDate } from "@/lib/overview/date";
import { getProjectDisplayName } from "@/lib/projects/display";
import { hasNeedsAttention, type OverviewSnapshot } from "@/lib/overview/selectors";
import { cn } from "@/lib/utils";

type NeedsAttentionSectionProps = {
  snapshot: OverviewSnapshot;
};

function AttentionRow({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block border-l-2 border-red-400/60 bg-card/50 px-4 py-3 transition-colors hover:bg-card/80",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function NeedsAttentionSection({ snapshot }: NeedsAttentionSectionProps) {
  const { fieldVisibility } = usePreferences();
  const projectsVis = fieldVisibility.projects;
  const tasksVis = fieldVisibility.tasks;
  const goalsVis = fieldVisibility.goals;
  const stagger = useStaggerOnce();

  if (!hasNeedsAttention(snapshot)) {
    return (
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Needs attention
        </h2>
        <OverviewInlineEmpty icon={CheckCircle}>
          Nothing needs your attention right now.
        </OverviewInlineEmpty>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Needs attention
      </h2>

      <div className="space-y-6 overflow-hidden rounded-xl border border-red-500/20 bg-red-500/[0.03]">
        {snapshot.overdueTasks.length > 0 ? (
          <div>
            <p className="border-b border-border/50 px-4 py-2 text-xs font-medium text-red-400">
              Overdue tasks
            </p>
            <StaggerList
              stagger={stagger}
              className="divide-y divide-border/40"
            >
              {snapshot.overdueTasks.map((task) => (
                <StaggerItem key={task.id} stagger={stagger} as="div">
                  <AttentionRow href="/tasks">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {task.title}
                      </span>
                      {tasksVis.priorityBadge ? (
                        <TaskPriorityBadge priority={task.priority} />
                      ) : null}
                      {tasksVis.projectTag ? (
                        <TaskProjectTag projectName={task.project_name} />
                      ) : null}
                    </div>
                    {tasksVis.dueDate ? (
                      <p className="mt-1 text-xs text-red-400/90">
                        Due {formatShortDueDate(task.due_date!)}
                      </p>
                    ) : null}
                  </AttentionRow>
                </StaggerItem>
              ))}
            </StaggerList>
          </div>
        ) : null}

        {snapshot.projectsMissingNextAction.length > 0 ? (
          <div>
            <p className="border-b border-border/50 px-4 py-2 text-xs font-medium text-red-400">
              Projects missing next action
            </p>
            <StaggerList
              stagger={stagger}
              className="divide-y divide-border/40"
            >
              {snapshot.projectsMissingNextAction.map((project) => (
                <StaggerItem key={project.id} stagger={stagger} as="div">
                  <AttentionRow href="/projects">
                    <span className="font-medium text-foreground">
                      {getProjectDisplayName(project)}
                    </span>
                    {projectsVis.serviceType ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {project.service_type ?? "No project type"}
                      </p>
                    ) : null}
                  </AttentionRow>
                </StaggerItem>
              ))}
            </StaggerList>
          </div>
        ) : null}

        {snapshot.goalsAtZeroWithDeadline.length > 0 ? (
          <div>
            <p className="border-b border-border/50 px-4 py-2 text-xs font-medium text-red-400">
              Goals at 0% with a deadline
            </p>
            <StaggerList
              stagger={stagger}
              className="divide-y divide-border/40"
            >
              {snapshot.goalsAtZeroWithDeadline.map((goal) => (
                <StaggerItem key={goal.id} stagger={stagger} as="div">
                  <AttentionRow href="/goals">
                    <span className="font-medium text-foreground">
                      {goal.title}
                    </span>
                    <p className="mt-1 text-sm text-muted-foreground">
                      0% progress
                      {goalsVis.deadline
                        ? ` · Deadline ${formatGoalDeadline(goal.deadline)}`
                        : null}
                    </p>
                  </AttentionRow>
                </StaggerItem>
              ))}
            </StaggerList>
          </div>
        ) : null}
      </div>
    </section>
  );
}
