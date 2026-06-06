"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createContentPost } from "@/app/(dashboard)/content/actions";
import { ContentForm } from "@/components/content/content-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EMPTY_CONTENT_FORM } from "@/lib/content/form";
import type { ContentFormInput } from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";

type ContentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentGoals: Pick<Goal, "id" | "title">[];
};

export function ContentFormDialog({
  open,
  onOpenChange,
  contentGoals,
}: ContentFormDialogProps) {
  const router = useRouter();
  const [values, setValues] = useState<ContentFormInput>(EMPTY_CONTENT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = "add-content-form";

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValues(EMPTY_CONTENT_FORM);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createContentPost(values);
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add content</DialogTitle>
          <DialogDescription>
            Plan and track content across your platforms.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit}>
          <ContentForm
            formId={formId}
            values={values}
            onChange={setValues}
            contentGoals={contentGoals}
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
            {isPending ? "Saving…" : "Add content"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
