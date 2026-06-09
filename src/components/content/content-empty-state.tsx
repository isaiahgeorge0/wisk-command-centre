"use client";

import { Clapperboard, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type ContentEmptyStateProps = {
  onAdd: () => void;
};

export function ContentEmptyState({ onAdd }: ContentEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
      <Clapperboard className="mb-4 size-10 text-muted-foreground" />
      <h2 className="text-lg font-medium text-foreground">No content yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Plan your first content post to start building your content calendar and
        tracking your streak.
      </p>
      <Button className="mt-6 gap-2" onClick={onAdd}>
        <Plus className="size-4" />
        Add content
      </Button>
    </div>
  );
}
