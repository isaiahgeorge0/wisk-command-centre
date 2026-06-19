"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { createProject } from "@/app/(dashboard)/projects/actions";
import { usePreferences } from "@/components/preferences/preferences-context";
import { ProjectForm } from "@/components/projects/project-form";
import { useSpotlightTour } from "@/components/spotlight-tour/spotlight-tour-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EMPTY_PROJECT_FORM } from "@/lib/projects/form";
import type { ProjectFormInput } from "@/lib/projects/types";

type ProjectFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recentProjectTypes: string[];
};

export function ProjectFormDialog({
  open,
  onOpenChange,
  recentProjectTypes,
}: ProjectFormDialogProps) {
  const { serviceTypes } = usePreferences();
  const { isActive: tourActive, handleProjectCreated } = useSpotlightTour();
  const router = useRouter();
  const [values, setValues] = useState<ProjectFormInput>(EMPTY_PROJECT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = "add-project-form";

  useEffect(() => {
    if (!open) {
      setValues(EMPTY_PROJECT_FORM);
      setError(null);
    }
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && tourActive) {
      return;
    }
    if (!nextOpen) {
      setValues(EMPTY_PROJECT_FORM);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createProject(values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      handleOpenChange(false);
      if (tourActive) {
        handleProjectCreated();
      }
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add project</DialogTitle>
          <DialogDescription>
            Create a new client project. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit} noValidate>
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
            {isPending ? "Saving…" : "Add project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
