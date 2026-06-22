"use client";

import { useTransition } from "react";

import { deleteNote } from "@/app/(dashboard)/notes/actions";
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

type DeleteNoteDialogProps = {
  noteId: string | null;
  noteTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
};

export function DeleteNoteDialog({
  noteId,
  noteTitle,
  open,
  onOpenChange,
  onDeleted,
}: DeleteNoteDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!noteId) return;

    startTransition(async () => {
      const result = await deleteNote(noteId);
      if (result.success) {
        onDeleted(noteId);
        onOpenChange(false);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete note?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <strong>{noteTitle}</strong>. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || !noteId}
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
