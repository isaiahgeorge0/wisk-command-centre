"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updateProject } from "@/app/(dashboard)/projects/actions";
import { usePreferences } from "@/components/preferences/preferences-context";
import { ProjectForm } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { projectToFormInput } from "@/lib/projects/form";
import { EMPTY_PROJECT_FORM } from "@/lib/projects/form";
import type { Project, ProjectFormInput } from "@/lib/projects/types";

type ProjectEditFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  recentProjectTypes: string[];
};

export function ProjectEditFormDialog({
  open,
  onOpenChange,
  project,
  recentProjectTypes,
}: ProjectEditFormDialogProps) {
  const { serviceTypes } = usePreferences();
  const router = useRouter();
  const [values, setValues] = useState<ProjectFormInput>(EMPTY_PROJECT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = project ? `edit-project-dialog-${project.id}` : "edit-project-dialog";

  useEffect(() => {
    if (open && project) {
      setValues(projectToFormInput(project));
    }
  }, [open, project]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    setError(null);

    startTransition(async () => {
      const result = await updateProject(project.id, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Update project details. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit}>
          <ProjectForm
            formId={formId}
            values={values}
            onChange={setValues}
            projectTypeOptions={serviceTypes}
            recentProjectTypes={recentProjectTypes}
            disabled={isPending}
          />
          {error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
