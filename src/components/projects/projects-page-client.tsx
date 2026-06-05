"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PageTransition } from "@/components/layout/page-transition";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectsEmptyState } from "@/components/projects/projects-empty-state";
import { ProjectsList } from "@/components/projects/projects-list";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { Button } from "@/components/ui/button";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";
import type { Project } from "@/lib/projects/types";
import type { TaskWithProject } from "@/lib/tasks/types";

type ProjectsPageClientProps = {
  initialProjects: Project[];
  initialTasks: TaskWithProject[];
};

export function ProjectsPageClient({
  initialProjects,
  initialTasks,
}: ProjectsPageClientProps) {
  const router = useRouter();
  const { projectAddOpen, setProjectAddOpen, openProjectAdd } = useQuickAdd();
  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState(initialTasks);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    clientName: string;
  } | null>(null);

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
    setDeleteTarget({ id: project.id, clientName: project.client_name });
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

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={PAGE_TITLE_CLASS}>Projects</h1>
          <p className={PAGE_SUBTITLE_CLASS}>
            Client work, status, and next actions at a glance.
          </p>
        </div>
        <Button className="shrink-0 gap-2" onClick={openProjectAdd}>
          <Plus className="size-4" />
          Add project
        </Button>
      </div>

      {projects.length === 0 ? (
        <ProjectsEmptyState onAdd={openProjectAdd} />
      ) : (
        <ProjectsList
          projects={projects}
          tasks={tasks}
          onDelete={handleDeleteRequest}
          onTaskUpdate={handleTaskUpdate}
          onTaskCreated={handleTaskCreated}
          onTaskCreateFailed={handleTaskCreateFailed}
          onTaskCreateConfirmed={handleTaskCreateConfirmed}
        />
      )}

      <ProjectFormDialog
        open={projectAddOpen}
        onOpenChange={setProjectAddOpen}
      />

      <DeleteProjectDialog
        projectId={deleteTarget?.id ?? null}
        clientName={deleteTarget?.clientName ?? ""}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleDeleted}
      />
    </PageTransition>
  );
}
