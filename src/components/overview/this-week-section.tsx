import Link from "next/link";

import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { TaskProjectTag } from "@/components/tasks/task-project-tag";
import { formatProjectDeadline } from "@/lib/projects/format";
import { formatShortDueDate } from "@/lib/overview/date";
import type { OverviewSnapshot } from "@/lib/overview/selectors";

type ThisWeekSectionProps = {
  snapshot: OverviewSnapshot;
};

export function ThisWeekSection({ snapshot }: ThisWeekSectionProps) {
  const hasTasks = snapshot.tasksDueThisWeekGrouped.length > 0;
  const hasProjects = snapshot.projectDeadlinesThisWeek.length > 0;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
        This week
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Tasks due
          </h3>
          {hasTasks ? (
            <div className="space-y-4">
              {snapshot.tasksDueThisWeekGrouped.map((group) => (
                <div key={group.date}>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {formatShortDueDate(group.date)}
                  </p>
                  <ul className="space-y-2">
                    {group.tasks.map((task) => (
                      <li key={task.id}>
                        <Link
                          href="/tasks"
                          className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                        >
                          <span className="text-sm text-foreground">
                            {task.title}
                          </span>
                          <TaskPriorityBadge priority={task.priority} />
                          <TaskProjectTag projectName={task.project_name} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing due in the next 7 days.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Project deadlines
          </h3>
          {hasProjects ? (
            <ul className="space-y-2">
              {snapshot.projectDeadlinesThisWeek.map((project) => (
                <li key={project.id}>
                  <Link
                    href="/projects"
                    className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {project.client_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatProjectDeadline(project.deadline)}
                      </p>
                    </div>
                    <ProjectStatusBadge status={project.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No project deadlines in the next 7 days.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
