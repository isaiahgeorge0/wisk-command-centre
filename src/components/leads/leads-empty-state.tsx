"use client";

import { Plus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

type LeadsEmptyStateProps = {
  onAdd: () => void;
};

export function LeadsEmptyState({ onAdd }: LeadsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
      <UserPlus className="mb-4 size-10 text-muted-foreground" />
      <h2 className="text-lg font-medium text-foreground">No leads yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Add your first lead to start tracking your pipeline, conversion rate, and
        potential revenue.
      </p>
      <Button className="mt-6 gap-2" onClick={onAdd}>
        <Plus className="size-4" />
        Add lead
      </Button>
    </div>
  );
}
