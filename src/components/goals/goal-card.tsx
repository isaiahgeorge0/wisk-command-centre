"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateGoal, updateGoalCurrent } from "@/app/(dashboard)/goals/actions";
import { usePreferences } from "@/components/preferences/preferences-context";
import { GoalCategoryTag } from "@/components/goals/goal-category-tag";
import { GoalForm } from "@/components/goals/goal-form";
import { GoalProgressBar, useGoalProgress } from "@/components/goals/goal-progress-bar";
import { GoalStatusBadge } from "@/components/goals/goal-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PROGRESS_ACCENT_BORDER_CLASS } from "@/lib/goals/constants";
import { CONTENT_GOAL_CATEGORY } from "@/lib/content/constants";
import {
  formatGoalDeadline,
  formatGoalProgressLabel,
} from "@/lib/goals/format";
import { goalToFormInput } from "@/lib/goals/form";
import type { Goal, GoalFormInput } from "@/lib/goals/types";
import { cn } from "@/lib/utils";

type GoalCardProps = {
  goal: Goal;
  showProgressAccent?: boolean;
  publishedPostCount?: number;
  onUpdate: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
};

export function GoalCard({
  goal,
  showProgressAccent = false,
  publishedPostCount = 0,
  onUpdate,
  onDelete,
}: GoalCardProps) {
  const { fieldVisibility } = usePreferences();
  const vis = fieldVisibility.goals;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<GoalFormInput>(goalToFormInput(goal));
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickValue, setQuickValue] = useState(String(goal.current));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = `edit-goal-${goal.id}`;

  const { tone } = useGoalProgress(goal.current, goal.target);

  const applyCurrent = (nextCurrent: number) => {
    const clamped = Math.max(0, nextCurrent);
    const previous = goal.current;
    onUpdate({ ...goal, current: clamped });

    startTransition(async () => {
      const result = await updateGoalCurrent(goal.id, clamped);
      if (!result.success) {
        onUpdate({ ...goal, current: previous });
        return;
      }
      if (result.data) {
        onUpdate(result.data);
        setQuickValue(String(result.data.current));
      }
      router.refresh();
    });
  };

  const handleStep = (delta: number) => {
    applyCurrent(goal.current + delta);
  };

  const handleQuickApply = () => {
    const parsed = Number(quickValue);
    if (!Number.isFinite(parsed)) {
      setError("Enter a valid number");
      return;
    }
    setError(null);
    applyCurrent(parsed);
    setQuickOpen(false);
  };

  const cancelEdit = () => {
    setValues(goalToFormInput(goal));
    setError(null);
    setEditing(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateGoal(goal.id, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data) {
        onUpdate(result.data);
        setQuickValue(String(result.data.current));
      }
      setEditing(false);
      router.refresh();
    });
  };

  if (editing) {
    return (
      <Card className="border-wisk-section-goals/25 bg-card/90">
        <CardHeader className="pb-2">
          <p className="text-sm font-medium text-muted-foreground">Editing goal</p>
        </CardHeader>
        <CardContent>
          <form id={formId} onSubmit={handleSave}>
            <GoalForm
              formId={formId}
              values={values}
              onChange={setValues}
              disabled={isPending}
              compact
            />
            {error ? (
              <p className="mt-3 text-sm text-destructive">{error}</p>
            ) : null}
          </form>
        </CardContent>
        <CardFooter className="gap-2 border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cancelEdit}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} size="sm" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "group border-border/60 bg-card/80 transition-colors hover:border-border hover:bg-card",
        showProgressAccent && "border-l-4",
        showProgressAccent && PROGRESS_ACCENT_BORDER_CLASS[tone]
      )}
      onClick={() => setEditing(true)}
    >
      <CardHeader className="gap-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground">{goal.title}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {vis.categoryTag ? (
                <GoalCategoryTag category={goal.category} />
              ) : null}
              <GoalStatusBadge status={goal.status} />
              {goal.category === CONTENT_GOAL_CATEGORY &&
              publishedPostCount > 0 ? (
                <Link
                  href="/content"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-wisk-section-goals hover:underline"
                >
                  {publishedPostCount} post
                  {publishedPostCount === 1 ? "" : "s"} published
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent
        className="space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <Popover
          open={quickOpen}
          onOpenChange={(open) => {
            setQuickOpen(open);
            if (open) {
              setQuickValue(String(goal.current));
              setError(null);
            }
          }}
        >
          <PopoverTrigger
            className="block w-full cursor-pointer text-left outline-none"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <GoalProgressBar current={goal.current} target={goal.target} />
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <PopoverHeader>
              <PopoverTitle>Update progress</PopoverTitle>
            </PopoverHeader>
            <div className="grid gap-2 px-0.5 pb-0.5">
              <Label htmlFor={`${goal.id}-quick-current`}>Current value</Label>
              <Input
                id={`${goal.id}-quick-current`}
                type="number"
                min="0"
                step="any"
                value={quickValue}
                onChange={(e) => setQuickValue(e.target.value)}
                disabled={isPending}
              />
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <Button size="sm" onClick={handleQuickApply} disabled={isPending}>
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <p className="text-sm font-medium text-foreground">
          {formatGoalProgressLabel(goal.current, goal.target, goal.unit)}
        </p>

        {vis.deadline || vis.quickControls ? (
          <div className="flex items-center justify-between gap-2">
            {vis.deadline ? (
              <span className="text-xs text-muted-foreground">
                Deadline: {formatGoalDeadline(goal.deadline)}
              </span>
            ) : (
              <span />
            )}
            {vis.quickControls ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={() => handleStep(-1)}
                  disabled={isPending || goal.current <= 0}
                  aria-label="Decrease progress"
                >
                  <Minus className="size-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={() => handleStep(1)}
                  disabled={isPending}
                  aria-label="Increase progress"
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <CardFooter
        className="gap-2 border-t border-border/50 pt-3 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-destructive hover:text-destructive"
          onClick={() => onDelete(goal)}
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
