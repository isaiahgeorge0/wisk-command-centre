"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";

import { ContentPlatformBadges } from "@/components/content/content-platform-badges";
import { OverviewInlineEmpty } from "@/components/overview/overview-inline-empty";
import { StaggerItem } from "@/components/motion/stagger-item";
import { StaggerList } from "@/components/motion/stagger-list";
import { usePreferences } from "@/components/preferences/preferences-context";
import { useStaggerOnce } from "@/lib/motion/use-stagger-once";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { TaskPriorityBadge } from "@/components/tasks/task-priority-badge";
import { TaskProjectTag } from "@/components/tasks/task-project-tag";
import { formatProjectDeadline } from "@/lib/projects/format";
import { getProjectDisplayName } from "@/lib/projects/display";
import { formatShortDueDate } from "@/lib/overview/date";
import type { OverviewSnapshot } from "@/lib/overview/selectors";

type ThisWeekSectionProps = {
  snapshot: OverviewSnapshot;
};

export function ThisWeekSection({ snapshot }: ThisWeekSectionProps) {
  const { fieldVisibility } = usePreferences();
  const projectsVis = fieldVisibility.projects;
  const tasksVis = fieldVisibility.tasks;
  const taskStagger = useStaggerOnce();
  const projectStagger = useStaggerOnce();
  const contentStagger = useStaggerOnce();
  const hasTasks = snapshot.tasksDueThisWeekGrouped.length > 0;
  const hasProjects = snapshot.projectDeadlinesThisWeek.length > 0;
  const hasContent = snapshot.contentDueThisWeekGrouped.length > 0;
  const hasAnythingThisWeek = hasTasks || hasProjects || hasContent;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
        This week
      </h2>

      {!hasAnythingThisWeek ? (
        <OverviewInlineEmpty icon={Calendar}>
          Nothing scheduled for this week.
        </OverviewInlineEmpty>
      ) : (
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
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
                  <StaggerList stagger={taskStagger} as="ul" className="space-y-2">
                    {group.tasks.map((task) => (
                      <StaggerItem key={task.id} stagger={taskStagger} as="li">
                        <Link
                          href="/tasks"
                          className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                        >
                          <span className="text-sm text-foreground">
                            {task.title}
                          </span>
                          {tasksVis.priorityBadge ? (
                            <TaskPriorityBadge priority={task.priority} />
                          ) : null}
                          {tasksVis.projectTag ? (
                            <TaskProjectTag projectName={task.project_name} />
                          ) : null}
                        </Link>
                      </StaggerItem>
                    ))}
                  </StaggerList>
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
            <StaggerList stagger={projectStagger} as="ul" className="space-y-2">
              {snapshot.projectDeadlinesThisWeek.map((project) => (
                <StaggerItem key={project.id} stagger={projectStagger} as="li">
                  <Link
                    href="/projects"
                    className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {getProjectDisplayName(project)}
                      </p>
                      {projectsVis.deadline ? (
                        <p className="text-xs text-muted-foreground">
                          {formatProjectDeadline(project.deadline)}
                        </p>
                      ) : null}
                    </div>
                    <ProjectStatusBadge status={project.status} />
                  </Link>
                </StaggerItem>
              ))}
            </StaggerList>
          ) : (
            <p className="text-sm text-muted-foreground">
              No project deadlines in the next 7 days.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Content due
          </h3>
          {hasContent ? (
            <div className="space-y-4">
              {snapshot.contentDueThisWeekGrouped.map((group) => (
                <div key={group.date}>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {formatShortDueDate(group.date)}
                  </p>
                  <StaggerList
                    stagger={contentStagger}
                    as="ul"
                    className="space-y-2"
                  >
                    {group.posts.map((post) => (
                      <StaggerItem key={post.id} stagger={contentStagger} as="li">
                        <Link
                          href="/content"
                          className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                        >
                          <span className="text-sm text-foreground">
                            {post.title}
                          </span>
                          <ContentPlatformBadges post={post} />
                        </Link>
                      </StaggerItem>
                    ))}
                  </StaggerList>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No content scheduled in the next 7 days.
            </p>
          )}
        </div>
      </div>
      )}
    </section>
  );
}
