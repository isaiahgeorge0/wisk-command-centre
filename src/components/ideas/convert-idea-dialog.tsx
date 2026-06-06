"use client";

import { useState } from "react";

import {
  convertIdeaToContent,
  convertIdeaToProject,
} from "@/app/(dashboard)/ideas/actions";
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
import type { Idea } from "@/lib/ideas/types";

type ConvertIdeaDialogProps = {
  idea: Idea | null;
  mode: "project" | "content";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted: () => void;
};

export function ConvertIdeaDialog({
  idea,
  mode,
  open,
  onOpenChange,
  onConverted,
}: ConvertIdeaDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!idea) return null;

  const isProject = mode === "project";
  const title = isProject ? "Convert to project" : "Convert to content";
  const description = isProject
    ? "This will create a new project from this idea."
    : "This will create a new content post from this idea.";
  const confirmLabel = isProject ? "Convert to project" : "Convert to content";

  const handleConvert = async () => {
    setError(null);
    setIsPending(true);

    const result = isProject
      ? await convertIdeaToProject(idea.id)
      : await convertIdeaToContent(idea.id);

    setIsPending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onConverted();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-lg border border-border/60 bg-card/60 p-4">
          <div className="flex flex-col gap-2">
            {isProject ? (
              <>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs text-muted-foreground">
                    Project name
                  </span>
                  <span className="text-sm text-foreground">{idea.title}</span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <span className="text-sm text-foreground">
                    {idea.category?.trim() || "—"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className="text-sm text-foreground">Active</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs text-muted-foreground">Title</span>
                  <span className="text-sm text-foreground">{idea.title}</span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs text-muted-foreground">
                    Description
                  </span>
                  <span className="text-sm text-foreground">
                    {idea.description?.trim() || "—"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className="text-sm text-foreground">Idea</span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <span className="text-sm text-foreground">Other</span>
                </div>
              </>
            )}
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConvert} disabled={isPending}>
            {isPending ? "Converting…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
