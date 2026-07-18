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
  publishedPostCounts: Record<string, number>;
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
  publishedPostCounts,
  stagger,
}: {
  goals: Goal[];
  showProgressAccent?: boolean;
  publishedPostCounts: Record<string, number>;
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
            publishedPostCount={publishedPostCounts[goal.id] ?? 0}
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
  publishedPostCounts,
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
        <div className="mb-4 flex items-center gap-2">
          <span
            className="inline-block size-1.5 shrink-0 rounded-full"
            style={{ background: "#baf7e1" }}
          />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
            Active
          </span>
          <span className="rounded-full bg-wisk-section-goals/10 px-1.5 py-0.5 text-[10px] font-bold text-wisk-section-goals">
            {active.length}
          </span>
        </div>
        {active.length > 0 ? (
          <GoalGrid
            goals={active}
            showProgressAccent
            publishedPostCounts={publishedPostCounts}
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
            publishedPostCounts={publishedPostCounts}
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
              publishedPostCounts={publishedPostCounts}
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
