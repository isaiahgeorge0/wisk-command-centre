"use client";

import { useTransition } from "react";

import { deleteProperty } from "@/app/(dashboard)/properties/actions";
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
import { formatPropertyAddress } from "@/lib/properties/format";
import type { PropertyWithStats } from "@/lib/properties/types";

type DeletePropertyDialogProps = {
  property: PropertyWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
};

export function DeletePropertyDialog({
  property,
  open,
  onOpenChange,
  onDeleted,
}: DeletePropertyDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!property) return;

    startTransition(async () => {
      const result = await deleteProperty(property.id);
      if (result.success) {
        onDeleted(property.id);
        onOpenChange(false);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete property?</AlertDialogTitle>
          <AlertDialogDescription>
            {property ? (
              <>
                You are about to delete <strong>{property.name}</strong> at{" "}
                <strong>{formatPropertyAddress(property)}</strong>.
              </>
            ) : (
              "This action cannot be undone."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300">
          This will permanently delete this property and all associated tenant
          records, maintenance tickets, and financial data.
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} className="min-h-11">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || !property}
            className="min-h-11"
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
