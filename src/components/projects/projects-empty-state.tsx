"use client";

import { FolderOpen, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type ProjectsEmptyStateProps = {
  onAdd: () => void;
};

export function ProjectsEmptyState({ onAdd }: ProjectsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
      <FolderOpen className="mb-4 size-10 text-muted-foreground" />
      <h2 className="text-lg font-medium text-foreground">No projects yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Add your first client project to start tracking work, deadlines, and
        value from your command centre.
      </p>
      <Button className="mt-6 gap-2" onClick={onAdd}>
        <Plus className="size-4" />
        Add project
      </Button>
    </div>
  );
}
