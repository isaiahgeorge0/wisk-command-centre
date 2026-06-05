"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { importVercelProjects } from "@/app/(dashboard)/settings/integrations/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VercelProjectSummary } from "@/lib/integrations/types";

type VercelImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: VercelProjectSummary[];
  onImported: (message: string) => void;
};

export function VercelImportDialog({
  open,
  onOpenChange,
  projects,
  onImported,
}: VercelImportDialogProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const importable = projects.filter((project) => !project.alreadyImported);

  useEffect(() => {
    if (!open) {
      setSelected([]);
      setError(null);
      return;
    }

    setSelected(
      projects.filter((project) => !project.alreadyImported).map((p) => p.id)
    );
  }, [open, projects]);

  const toggleProject = (projectId: string, checked: boolean) => {
    setSelected((current) =>
      checked
        ? [...current, projectId]
        : current.filter((id) => id !== projectId)
    );
  };

  const handleImport = () => {
    setError(null);

    startTransition(async () => {
      const result = await importVercelProjects(selected);
      if (!result.success) {
        setError(result.error);
        return;
      }

      const imported = result.data?.imported ?? 0;
      const skipped = result.data?.skipped ?? 0;

      let message = `Imported ${imported} project${imported === 1 ? "" : "s"}.`;
      if (skipped > 0) {
        message += ` ${skipped} duplicate${skipped === 1 ? "" : "s"} already in WISK and ${skipped === 1 ? "was" : "were"} skipped.`;
      }

      onImported(message);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Vercel projects</DialogTitle>
          <DialogDescription>
            Selected projects will be added as active WISK projects with Web
            Development project type and production URLs when available.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 space-y-2 overflow-y-auto py-1">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No Vercel projects found on this account.
            </p>
          ) : (
            projects.map((project) => (
              <label
                key={project.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 px-3 py-2.5 hover:bg-muted/40"
              >
                <Checkbox
                  checked={selected.includes(project.id)}
                  disabled={project.alreadyImported || isPending}
                  onCheckedChange={(checked) =>
                    toggleProject(project.id, checked === true)
                  }
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {project.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {project.productionUrl ?? "No production URL"}
                  </span>
                  {project.alreadyImported ? (
                    <span className="mt-1 block text-xs text-amber-500">
                      Already imported to WISK
                    </span>
                  ) : null}
                </span>
              </label>
            ))
          )}
        </div>

        {importable.length < projects.length ? (
          <p className="text-xs text-muted-foreground">
            Projects already linked by Vercel ID are shown but cannot be
            imported again.
          </p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={isPending || selected.length === 0}
          >
            {isPending ? "Importing…" : "Import selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
