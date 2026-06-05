"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type ContentEmptyStateProps = {
  onAdd: () => void;
};

export function ContentEmptyState({ onAdd }: ContentEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 px-6 py-16 text-center">
      <p className="text-lg font-medium text-foreground">No content yet</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Plan posts, reels, and videos across your platforms — then track them
        from idea to published.
      </p>
      <Button className="mt-6 gap-2" onClick={onAdd}>
        <Plus className="size-4" />
        Add content
      </Button>
    </div>
  );
}
