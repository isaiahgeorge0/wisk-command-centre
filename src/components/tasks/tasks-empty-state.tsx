"use client";

import { ListTodo, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type TasksEmptyStateProps = {
  onAdd: () => void;
};

export function TasksEmptyState({ onAdd }: TasksEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
      <ListTodo className="mb-4 size-10 text-muted-foreground" />
      <h2 className="text-lg font-medium text-foreground">No tasks yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Add your first task to track what needs doing, when it&apos;s due, and
        which client it belongs to.
      </p>
      <Button className="mt-6 gap-2" onClick={onAdd}>
        <Plus className="size-4" />
        Add task
      </Button>
    </div>
  );
}
