"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createIdea } from "@/app/ideas/actions";
import { IdeaForm } from "@/components/ideas/idea-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EMPTY_IDEA_FORM } from "@/lib/ideas/form";
import type { IdeaFormInput } from "@/lib/ideas/types";

type IdeaFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IdeaFormDialog({ open, onOpenChange }: IdeaFormDialogProps) {
  const router = useRouter();
  const [values, setValues] = useState<IdeaFormInput>(EMPTY_IDEA_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = "add-idea-form";

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValues(EMPTY_IDEA_FORM);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createIdea({
        ...values,
        status: values.status ?? "new",
      });
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
          <DialogTitle>Add idea</DialogTitle>
          <DialogDescription>
            Capture a thought to explore later. Only title is required.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit}>
          <IdeaForm
            formId={formId}
            values={values}
            onChange={setValues}
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
            {isPending ? "Saving…" : "Add idea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
