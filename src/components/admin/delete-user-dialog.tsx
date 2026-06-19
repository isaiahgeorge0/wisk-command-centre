"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { deleteUser } from "@/app/(dashboard)/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type DeleteUserDialogProps = {
  userId: string;
  displayName: string | null;
  email: string;
  onDeleted: (userId: string) => void;
};

export function DeleteUserDialog({
  userId,
  displayName,
  email,
  onDeleted,
}: DeleteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nameLabel = displayName?.trim() || "Unnamed user";

  function handleOpenChange(nextOpen: boolean) {
    if (pending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setError(null);
    }
  }

  function handleDelete() {
    setError(null);

    startTransition(async () => {
      const result = await deleteUser(userId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onDeleted(userId);
      setOpen(false);
      setError(null);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        aria-label={`Delete ${nameLabel}`}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors",
          "hover:bg-destructive/10 hover:text-destructive",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        )}
      >
        <Trash2 className="size-4" aria-hidden />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete user</DialogTitle>
          <DialogDescription>
            Review the account below before confirming permanent deletion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
            <p className="font-medium text-foreground">{nameLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
          </div>

          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-4 py-3">
            <p className="text-sm leading-relaxed text-rose-700 dark:text-rose-300">
              This will permanently delete this user and all of their data
              including projects, tasks, goals, leads, content, and AI history.
              This cannot be undone.
            </p>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Deleting…
              </>
            ) : (
              "Delete user"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
