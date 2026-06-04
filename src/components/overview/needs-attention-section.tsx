import Link from "next/link";

import { OverviewEmptyPositive } from "@/components/overview/overview-empty-positive";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { TaskProjectTag } from "@/components/tasks/task-project-tag";
import { formatGoalDeadline } from "@/lib/goals/format";
import { formatShortDueDate } from "@/lib/overview/date";
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
  if (!hasNeedsAttention(snapshot)) {
    return (
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Needs attention
        </h2>
        <OverviewEmptyPositive />
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
            <div className="divide-y divide-border/40">
              {snapshot.overdueTasks.map((task) => (
                <AttentionRow key={task.id} href="/tasks">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {task.title}
                    </span>
                    <TaskPriorityBadge priority={task.priority} />
                    <TaskProjectTag projectName={task.project_name} />
                  </div>
                  <p className="mt-1 text-xs text-red-400/90">
                    Due {formatShortDueDate(task.due_date!)}
                  </p>
                </AttentionRow>
              ))}
            </div>
          </div>
        ) : null}

        {snapshot.projectsMissingNextAction.length > 0 ? (
          <div>
            <p className="border-b border-border/50 px-4 py-2 text-xs font-medium text-red-400">
              Projects missing next action
            </p>
            <div className="divide-y divide-border/40">
              {snapshot.projectsMissingNextAction.map((project) => (
                <AttentionRow key={project.id} href="/projects">
                  <span className="font-medium text-foreground">
                    {project.client_name}
                  </span>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {project.service_type ?? "No service type"}
                  </p>
                </AttentionRow>
              ))}
            </div>
          </div>
        ) : null}

        {snapshot.goalsAtZeroWithDeadline.length > 0 ? (
          <div>
            <p className="border-b border-border/50 px-4 py-2 text-xs font-medium text-red-400">
              Goals at 0% with a deadline
            </p>
            <div className="divide-y divide-border/40">
              {snapshot.goalsAtZeroWithDeadline.map((goal) => (
                <AttentionRow key={goal.id} href="/goals">
                  <span className="font-medium text-foreground">{goal.title}</span>
                  <p className="mt-1 text-sm text-muted-foreground">
                    0% progress · Deadline {formatGoalDeadline(goal.deadline)}
                  </p>
                </AttentionRow>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
