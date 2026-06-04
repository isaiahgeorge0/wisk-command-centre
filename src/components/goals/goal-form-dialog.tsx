"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createGoal } from "@/app/goals/actions";
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
import { EMPTY_GOAL_FORM } from "@/lib/goals/form";
import type { GoalFormInput } from "@/lib/goals/types";

type GoalFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GoalFormDialog({ open, onOpenChange }: GoalFormDialogProps) {
  const router = useRouter();
  const [values, setValues] = useState<GoalFormInput>(EMPTY_GOAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = "add-goal-form";

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
      const result = await createGoal({
        ...values,
        status: values.status ?? "active",
      });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add goal</DialogTitle>
          <DialogDescription>
            Set a target to work toward. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit}>
          <GoalForm
            formId={formId}
            values={values}
            onChange={setValues}
            disabled={isPending}
            showCurrent={false}
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
            {isPending ? "Saving…" : "Add goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
