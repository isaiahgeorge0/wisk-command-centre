"use client";

import { useTransition } from "react";

import { deleteGoal } from "@/app/(dashboard)/goals/actions";
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

type DeleteGoalDialogProps = {
  goalId: string | null;
  goalTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
};

export function DeleteGoalDialog({
  goalId,
  goalTitle,
  open,
  onOpenChange,
  onDeleted,
}: DeleteGoalDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!goalId) return;

    startTransition(async () => {
      const result = await deleteGoal(goalId);
      if (result.success) {
        onDeleted(goalId);
        onOpenChange(false);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete goal?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <strong>{goalTitle}</strong>. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || !goalId}
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
