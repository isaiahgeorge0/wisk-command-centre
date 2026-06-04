"use client";

import { Lightbulb, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type IdeasEmptyStateProps = {
  onAdd: () => void;
};

export function IdeasEmptyState({ onAdd }: IdeasEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
      <Lightbulb className="mb-4 size-10 text-muted-foreground" />
      <h2 className="text-lg font-medium text-foreground">No ideas yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Capture content angles, product thoughts, and business opportunities
        before they slip away.
      </p>
      <Button className="mt-6 gap-2" onClick={onAdd}>
        <Plus className="size-4" />
        Add idea
      </Button>
    </div>
  );
}
