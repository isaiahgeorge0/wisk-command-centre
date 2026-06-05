"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createTask } from "@/app/(dashboard)/tasks/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TaskPriority, TaskWithProject } from "@/lib/tasks/types";
import { TASK_PRIORITIES } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

const selectClassName =
  "flex h-9 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

type ProjectTaskQuickAddProps = {
  projectId: string;
  onCreated: (task: TaskWithProject) => void;
  onCreateFailed: (taskId: string) => void;
  onCreateConfirmed: (tempId: string, task: TaskWithProject) => void;
};

export function ProjectTaskQuickAdd({
  projectId,
  onCreated,
  onCreateFailed,
  onCreateConfirmed,
}: ProjectTaskQuickAddProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    const trimmedTitle = title.trim();
    const tempId = `optimistic-${Date.now()}`;
    const optimisticTask: TaskWithProject = {
      id: tempId,
      user_id: "",
      project_id: projectId,
      title: trimmedTitle,
      due_date: dueDate || null,
      priority,
      completed: false,
      created_at: new Date().toISOString(),
      project_name: null,
    };

    onCreated(optimisticTask);

    startTransition(async () => {
      const result = await createTask({
        title: trimmedTitle,
        priority,
        due_date: dueDate || undefined,
        project_id: projectId,
      });

      if (!result.success) {
        onCreateFailed(tempId);
        setError(result.error);
        return;
      }

      if (result.data) {
        onCreateConfirmed(tempId, result.data);
      }

      setTitle("");
      setDueDate("");
      setPriority("medium");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      className="mt-3 space-y-2 border-t border-border/50 pt-3"
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          disabled={isPending}
          className="h-9"
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={isPending}
          className="h-9"
          aria-label="Due date"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          disabled={isPending}
          className={cn(selectClassName)}
          aria-label="Priority"
        >
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button
        type="submit"
        size="sm"
        className="gap-1.5"
        disabled={isPending || !title.trim()}
      >
        <Plus className="size-3.5" />
        Add task
      </Button>
    </form>
  );
}
