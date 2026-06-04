"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createProject } from "@/app/(dashboard)/projects/actions";
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
import { EMPTY_PROJECT_FORM } from "@/lib/projects/form";
import type { ProjectFormInput } from "@/lib/projects/types";

type ProjectFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProjectFormDialog({ open, onOpenChange }: ProjectFormDialogProps) {
  const { serviceTypes } = usePreferences();
  const router = useRouter();
  const [values, setValues] = useState<ProjectFormInput>(EMPTY_PROJECT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = "add-project-form";

  const handleOpenChange = (nextOpen: boolean) => {
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
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add project</DialogTitle>
          <DialogDescription>
            Create a new client project. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit}>
          <ProjectForm
            formId={formId}
            values={values}
            onChange={setValues}
            serviceTypeOptions={serviceTypes}
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
