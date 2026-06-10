"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { createGoal, updateGoal } from "@/app/(dashboard)/goals/actions";
import { GoalForm } from "@/components/goals/goal-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EMPTY_GOAL_FORM, goalToFormInput } from "@/lib/goals/form";
import type { Goal, GoalFormInput } from "@/lib/goals/types";

type GoalFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
};

export function GoalFormDialog({
  open,
  onOpenChange,
  goal = null,
}: GoalFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(goal);
  const [values, setValues] = useState<GoalFormInput>(EMPTY_GOAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = isEdit ? `edit-goal-${goal?.id}` : "add-goal-form";

  useEffect(() => {
    if (open && goal) {
      setValues(goalToFormInput(goal));
    } else if (open && !goal) {
      setValues(EMPTY_GOAL_FORM);
    }
  }, [open, goal]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValues(EMPTY_GOAL_FORM);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        ...values,
        status: values.status ?? "active",
      };
      const result = isEdit
        ? await updateGoal(goal!.id, payload)
        : await createGoal(payload);
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
          <DialogTitle>{isEdit ? "Edit goal" : "Add goal"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update your goal. Required fields are marked with *."
              : "Set a target to work toward. Required fields are marked with *."}
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit}>
          <GoalForm
            formId={formId}
            values={values}
            onChange={setValues}
            disabled={isPending}
            showCurrent={isEdit}
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
            {isPending ? "Saving…" : isEdit ? "Save changes" : "Add goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
