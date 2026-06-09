"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { createTask } from "@/app/(dashboard)/tasks/actions";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EMPTY_TASK_FORM } from "@/lib/tasks/form";
import type { ProjectOption, TaskFormInput } from "@/lib/tasks/types";

type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
};

export function TaskFormDialog({
  open,
  onOpenChange,
  projects,
}: TaskFormDialogProps) {
  const router = useRouter();
  const { taskPrefillDueDate, setTaskPrefillDueDate } = useQuickAdd();
  const [values, setValues] = useState<TaskFormInput>(EMPTY_TASK_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = "add-task-form";

  useEffect(() => {
    if (open && taskPrefillDueDate) {
      setValues({ ...EMPTY_TASK_FORM, due_date: taskPrefillDueDate });
    }
  }, [open, taskPrefillDueDate]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValues(EMPTY_TASK_FORM);
      setError(null);
      setTaskPrefillDueDate(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createTask(values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
          <DialogDescription>
            Capture something to do. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit}>
          <TaskForm
            formId={formId}
            values={values}
            onChange={setValues}
            projects={projects}
            disabled={isPending}
          />
          {error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isPending}>
            {isPending ? "Saving…" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
