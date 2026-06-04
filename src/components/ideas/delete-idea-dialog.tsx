"use client";

import { useTransition } from "react";

import { deleteIdea } from "@/app/(dashboard)/ideas/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteIdeaDialogProps = {
  ideaId: string | null;
  ideaTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
};

export function DeleteIdeaDialog({
  ideaId,
  ideaTitle,
  open,
  onOpenChange,
  onDeleted,
}: DeleteIdeaDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!ideaId) return;

    startTransition(async () => {
      const result = await deleteIdea(ideaId);
      if (result.success) {
        onDeleted(ideaId);
        onOpenChange(false);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete idea?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <strong>{ideaTitle}</strong>. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || !ideaId}
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
