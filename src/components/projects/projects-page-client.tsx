"use client";

import { FolderKanban, Plus } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { ProjectFiltersBar } from "@/components/projects/project-filters-bar";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectsEmptyState } from "@/components/projects/projects-empty-state";
import { ProjectsList } from "@/components/projects/projects-list";
import type { ProjectCardTab } from "@/components/projects/project-card-tabs";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { useSpotlightTour } from "@/components/spotlight-tour/spotlight-tour-context";
import { Button } from "@/components/ui/button";
import { DEFAULT_PROJECT_FILTERS } from "@/lib/projects/constants";
import { getProjectDisplayName } from "@/lib/projects/display";
import { getRecentProjectTypes } from "@/lib/projects/recent-project-types";
import {
  applyProjectFilters,
  getUniqueServiceTypes,
  groupProjects,
} from "@/lib/projects/selectors";
import type { SafeIntegration } from "@/lib/integrations/types";
import type { Project, ProjectFilters } from "@/lib/projects/types";
import type { TaskWithProject } from "@/lib/tasks/types";

type ProjectsPageClientProps = {
  initialProjects: Project[];
  initialTasks: TaskWithProject[];
  integrations: SafeIntegration[];
};

export function ProjectsPageClient({
  initialProjects,
  initialTasks,
  integrations,
}: ProjectsPageClientProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const searchParams = useSearchParams();
  const openProjectId = searchParams.get("project");
  const openTabParam = searchParams.get("tab");
  const openTab: ProjectCardTab | null =
    openTabParam === "details" ||
    openTabParam === "tasks" ||
    openTabParam === "milestones"
      ? openTabParam
      : null;
  const { projectAddOpen, setProjectAddOpen, openProjectAdd } = useQuickAdd();
  const { consumePendingStart } = useSpotlightTour();
  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState(initialTasks);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    projectName: string;
  } | null>(null);
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_PROJECT_FILTERS);

  const recentProjectTypes = useMemo(
    () => getRecentProjectTypes(projects),
    [projects]
  );

  const serviceTypes = useMemo(
    () => getUniqueServiceTypes(projects),
    [projects]
  );

  const filteredProjects = useMemo(
    () => applyProjectFilters(projects, filters),
    [projects, filters]
  );

  const grouped = useMemo(
    () => groupProjects(filteredProjects),
    [filteredProjects]
  );

  useEffect(() => {
    consumePendingStart();
  }, [consumePendingStart]);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const handleDeleted = useCallback(
    (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setTasks((prev) => prev.filter((t) => t.project_id !== id));
      router.refresh();
    },
    [router]
  );

  const handleDeleteRequest = useCallback((project: Project) => {
    setDeleteTarget({
      id: project.id,
      projectName: getProjectDisplayName(project),
    });
  }, []);

  const handleFiltersChange = useCallback((next: ProjectFilters) => {
    setFilters(next);
  }, []);

  const handleTaskUpdate = useCallback((updated: TaskWithProject) => {
    setTasks((prev) => {
      const index = prev.findIndex((task) => task.id === updated.id);
      if (index === -1) return prev;
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }, []);

  const handleTaskCreated = useCallback((created: TaskWithProject) => {
    setTasks((prev) => {
      if (prev.some((task) => task.id === created.id)) return prev;
      return [...prev, created];
    });
  }, []);

  const handleTaskCreateFailed = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  }, []);

  const handleTaskCreateConfirmed = useCallback(
    (tempId: string, task: TaskWithProject) => {
      setTasks((prev) =>
        prev.map((item) => (item.id === tempId ? task : item))
      );
    },
    []
  );

  const vercelConnected = integrations.some((i) => i.provider === "vercel");
  const githubConnected = integrations.some((i) => i.provider === "github");

  const projectsListProps = {
    tasks,
    recentProjectTypes,
    vercelConnected,
    githubConnected,
    onDelete: handleDeleteRequest,
    onTaskUpdate: handleTaskUpdate,
    onTaskCreated: handleTaskCreated,
    onTaskCreateFailed: handleTaskCreateFailed,
    onTaskCreateConfirmed: handleTaskCreateConfirmed,
    openProjectId,
    openTab,
  };

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          className="mb-0"
          title="Projects"
          subtitle="Client work, status, and next actions at a glance."
          icon={
            <FolderKanban
              className="size-6"
              style={{ color: resolvedTheme === "dark" ? "#aca0ff" : "#4a3db0" }}
            />
          }
          accentColour={resolvedTheme === "dark" ? "#aca0ff" : "#4a3db0"}
        />
        <Button className="shrink-0 gap-2" onClick={openProjectAdd} data-tour="add-project">
          <Plus className="size-4" />
          Add project
        </Button>
      </div>

      {projects.length === 0 ? (
        <ProjectsEmptyState onAdd={openProjectAdd} />
      ) : (
        <>
          <ProjectFiltersBar
            filters={filters}
            serviceTypes={serviceTypes}
            onChange={handleFiltersChange}
          />
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card/40 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No projects match your filters.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 text-muted-foreground"
                onClick={() => handleFiltersChange(DEFAULT_PROJECT_FILTERS)}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              {grouped.active.length > 0 ? (
                <>
                  <h2 className="mt-6 mb-3 text-sm font-medium text-muted-foreground">
                    Active
                  </h2>
                  <ProjectsList
                    projects={grouped.active}
                    {...projectsListProps}
                  />
                </>
              ) : null}

              {grouped.paused.length > 0 ? (
                <>
                  <h2 className="mt-6 mb-3 text-sm font-medium text-muted-foreground">
                    Paused
                  </h2>
                  <ProjectsList
                    projects={grouped.paused}
                    {...projectsListProps}
                  />
                </>
              ) : null}

              {grouped.completedAndArchived.length > 0 ? (
                <>
                  <h2 className="mt-6 mb-3 text-sm font-medium text-muted-foreground">
                    Completed & Archived
                  </h2>
                  <ProjectsList
                    projects={grouped.completedAndArchived}
                    {...projectsListProps}
                  />
                </>
              ) : null}
            </>
          )}
        </>
      )}

      <ProjectFormDialog
        open={projectAddOpen}
        onOpenChange={setProjectAddOpen}
        recentProjectTypes={recentProjectTypes}
      />

      <DeleteProjectDialog
        projectId={deleteTarget?.id ?? null}
        projectName={deleteTarget?.projectName ?? ""}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleDeleted}
      />
    </PageTransition>
  );
}
