"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { createContentPost, updateContentPost } from "@/app/(dashboard)/content/actions";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
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
import { EMPTY_CONTENT_FORM, postToFormInput } from "@/lib/content/form";
import type { ContentFormInput, ContentPost } from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";

type ContentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentGoals: Pick<Goal, "id" | "title">[];
  post?: ContentPost | null;
};

export function ContentFormDialog({
  open,
  onOpenChange,
  contentGoals,
  post = null,
}: ContentFormDialogProps) {
  const router = useRouter();
  const { contentPrefillScheduledDate, setContentPrefillScheduledDate } =
    useQuickAdd();
  const isEdit = Boolean(post);
  const [values, setValues] = useState<ContentFormInput>(EMPTY_CONTENT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = isEdit ? `edit-content-${post?.id}` : "add-content-form";

  useEffect(() => {
    if (!open) return;

    if (post) {
      setValues(postToFormInput(post));
      return;
    }

    setValues({
      ...EMPTY_CONTENT_FORM,
      ...(contentPrefillScheduledDate
        ? { scheduled_date: contentPrefillScheduledDate }
        : {}),
    });
  }, [open, post, contentPrefillScheduledDate]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValues(EMPTY_CONTENT_FORM);
      setError(null);
      if (!isEdit) {
        setContentPrefillScheduledDate(null);
      }
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateContentPost(post!.id, values)
        : await createContentPost(values);
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
          <DialogTitle>{isEdit ? "Edit content" : "Add content"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this content post."
              : "Plan and track content across your platforms."}
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
            {isPending ? "Saving…" : isEdit ? "Save changes" : "Add content"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
