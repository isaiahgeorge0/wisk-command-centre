"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

import { StaggerItem } from "@/components/motion/stagger-item";
import { StaggerList } from "@/components/motion/stagger-list";
import { GoalCard } from "@/components/goals/goal-card";
import { Button } from "@/components/ui/button";
import { useStaggerOnce } from "@/lib/motion/use-stagger-once";
import type { Goal } from "@/lib/goals/types";
import type { GoalStatus } from "@/lib/goals/types";

type GoalsListProps = {
  goals: Goal[];
  onGoalUpdate: (goal: Goal) => void;
  onGoalDelete: (goal: Goal) => void;
};

function isStatus(goal: Goal, status: GoalStatus): boolean {
  return (goal.status ?? "active") === status;
}

function GoalGrid({
  goals,
  showProgressAccent,
  onGoalUpdate,
  onGoalDelete,
  stagger,
}: {
  goals: Goal[];
  showProgressAccent?: boolean;
  onGoalUpdate: (goal: Goal) => void;
  onGoalDelete: (goal: Goal) => void;
  stagger: boolean;
}) {
  if (goals.length === 0) {
    return null;
  }

  return (
    <StaggerList
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      stagger={stagger}
    >
      {goals.map((goal) => (
        <StaggerItem key={goal.id} stagger={stagger}>
          <GoalCard
            goal={goal}
            showProgressAccent={showProgressAccent}
            onUpdate={onGoalUpdate}
            onDelete={onGoalDelete}
          />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}

export function GoalsList({
  goals,
  onGoalUpdate,
  onGoalDelete,
}: GoalsListProps) {
  const activeStagger = useStaggerOnce();
  const pausedStagger = useStaggerOnce();
  const archivedStagger = useStaggerOnce();
  const [archivedExpanded, setArchivedExpanded] = useState(false);

  const { active, paused, completedArchived } = useMemo(() => {
    const activeGoals: Goal[] = [];
    const pausedGoals: Goal[] = [];
    const completedArchivedGoals: Goal[] = [];

    for (const goal of goals) {
      if (isStatus(goal, "active")) {
        activeGoals.push(goal);
      } else if (isStatus(goal, "paused")) {
        pausedGoals.push(goal);
      } else if (
        isStatus(goal, "completed") ||
        isStatus(goal, "archived")
      ) {
        completedArchivedGoals.push(goal);
      } else {
        activeGoals.push(goal);
      }
    }

    return {
      active: activeGoals,
      paused: pausedGoals,
      completedArchived: completedArchivedGoals,
    };
  }, [goals]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Active
        </h2>
        {active.length > 0 ? (
          <GoalGrid
            goals={active}
            showProgressAccent
            onGoalUpdate={onGoalUpdate}
            onGoalDelete={onGoalDelete}
            stagger={activeStagger}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No active goals right now.</p>
        )}
      </section>

      {paused.length > 0 ? (
        <section>
          <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Paused
          </h2>
          <GoalGrid
            goals={paused}
            onGoalUpdate={onGoalUpdate}
            onGoalDelete={onGoalDelete}
            stagger={pausedStagger}
          />
        </section>
      ) : null}

      {completedArchived.length > 0 ? (
        <section className="border-t border-border/60 pt-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-4 h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setArchivedExpanded((prev) => !prev)}
          >
            {archivedExpanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            {archivedExpanded
              ? "Hide completed & archived"
              : `Show completed & archived (${completedArchived.length})`}
          </Button>

          {archivedExpanded ? (
            <GoalGrid
              goals={completedArchived}
              onGoalUpdate={onGoalUpdate}
              onGoalDelete={onGoalDelete}
              stagger={archivedStagger}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
