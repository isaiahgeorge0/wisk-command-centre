"use client";

import { Target, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type GoalsEmptyStateProps = {
  onAdd: () => void;
};

export function GoalsEmptyState({ onAdd }: GoalsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
      <Target className="mb-4 size-10 text-muted-foreground" />
      <h2 className="text-lg font-medium text-foreground">No goals yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Set targets for revenue, projects, content, or personal milestones — and
        track your progress as you build.
      </p>
      <Button className="mt-6 gap-2" onClick={onAdd}>
        <Plus className="size-4" />
        Add goal
      </Button>
    </div>
  );
}
