"use client";

import Link from "next/link";

import { StaggerItem } from "@/components/motion/stagger-item";
import { StaggerList } from "@/components/motion/stagger-list";
import { IdeaCategoryTag } from "@/components/ideas/idea-category-tag";
import { usePreferences } from "@/components/preferences/preferences-context";
import { useStaggerOnce } from "@/lib/motion/use-stagger-once";
import { IdeaStatusBadge } from "@/components/ideas/idea-status-badge";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { ProjectTaskProgressBar } from "@/components/projects/project-task-progress-bar";
import type { OverviewSnapshot } from "@/lib/overview/selectors";

type RecentlyAddedSectionProps = {
  snapshot: OverviewSnapshot;
};

export function RecentlyAddedSection({ snapshot }: RecentlyAddedSectionProps) {
  const { fieldVisibility } = usePreferences();
  const projectsVis = fieldVisibility.projects;
  const ideasVis = fieldVisibility.ideas;
  // TODO: Once updated_at is added to the projects table, display and sort recent projects by last updated instead of created_at (see selectors.ts recentProjects).
  const ideasStagger = useStaggerOnce();
  const projectsStagger = useStaggerOnce();
  const { recentIdeas, recentProjects } = snapshot;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Recently added
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">Latest ideas</h3>
          {recentIdeas.length > 0 ? (
            <StaggerList stagger={ideasStagger} as="ul" className="space-y-3">
              {recentIdeas.map((idea) => (
                <StaggerItem key={idea.id} stagger={ideasStagger} as="li">
                  <Link
                    href="/ideas"
                    className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                  >
                    <p className="font-medium text-foreground">{idea.title}</p>
                    {(ideasVis.categoryTag || ideasVis.statusBadge) ? (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {ideasVis.categoryTag ? (
                          <IdeaCategoryTag category={idea.category} />
                        ) : null}
                        {ideasVis.statusBadge ? (
                          <IdeaStatusBadge status={idea.status} />
                        ) : null}
                      </div>
                    ) : null}
                  </Link>
                </StaggerItem>
              ))}
            </StaggerList>
          ) : (
            <p className="text-sm text-muted-foreground">No ideas yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Latest projects
          </h3>
          {recentProjects.length > 0 ? (
            <StaggerList stagger={projectsStagger} as="ul" className="space-y-3">
              {recentProjects.map((project) => (
                <StaggerItem key={project.id} stagger={projectsStagger} as="li">
                  <Link
                    href="/projects"
                    className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground">
                        {project.client_name}
                      </p>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                    {projectsVis.nextAction ? (
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {project.next_action?.trim() || "No next action set"}
                      </p>
                    ) : null}
                    {(() => {
                      const stats = snapshot.projectTaskStats[project.id];
                      if (!stats || stats.total < 1) return null;
                      return (
                        <div className="mt-2" onClick={(e) => e.preventDefault()}>
                          <ProjectTaskProgressBar
                            completed={stats.completed}
                            total={stats.total}
                            compact
                          />
                        </div>
                      );
                    })()}
                  </Link>
                </StaggerItem>
              ))}
            </StaggerList>
          ) : (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
