"use client";

import { useTransition } from "react";

import { deleteLead } from "@/app/(dashboard)/leads/actions";
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

type DeleteLeadDialogProps = {
  leadId: string | null;
  leadName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
};

export function DeleteLeadDialog({
  leadId,
  leadName,
  open,
  onOpenChange,
  onDeleted,
}: DeleteLeadDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!leadId) return;

    startTransition(async () => {
      const result = await deleteLead(leadId);
      if (result.success) {
        onDeleted(leadId);
        onOpenChange(false);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete lead?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <strong>{leadName}</strong>. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || !leadId}
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
