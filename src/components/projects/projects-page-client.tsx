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

type ProjectsPageClientProps = {
  initialProjects: Project[];
};

export function ProjectsPageClient({
  initialProjects,
}: ProjectsPageClientProps) {
  const router = useRouter();
  const { projectAddOpen, setProjectAddOpen, openProjectAdd } = useQuickAdd();
  const [projects, setProjects] = useState(initialProjects);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    clientName: string;
  } | null>(null);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const handleDeleted = useCallback(
    (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    },
    [router]
  );

  const handleDeleteRequest = useCallback((project: Project) => {
    setDeleteTarget({ id: project.id, clientName: project.client_name });
  }, []);

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
        <ProjectsList projects={projects} onDelete={handleDeleteRequest} />
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
