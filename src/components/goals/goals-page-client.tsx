"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PageTransition } from "@/components/layout/page-transition";
import { DeleteGoalDialog } from "@/components/goals/delete-goal-dialog";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { GoalsEmptyState } from "@/components/goals/goals-empty-state";
import { GoalsList } from "@/components/goals/goals-list";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { Button } from "@/components/ui/button";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";
import type { Goal } from "@/lib/goals/types";

type GoalsPageClientProps = {
  initialGoals: Goal[];
};

export function GoalsPageClient({ initialGoals }: GoalsPageClientProps) {
  const router = useRouter();
  const { goalAddOpen, setGoalAddOpen, openGoalAdd } = useQuickAdd();
  const [goals, setGoals] = useState(initialGoals);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    setGoals(initialGoals);
  }, [initialGoals]);

  const handleGoalUpdate = useCallback((updated: Goal) => {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  }, []);

  const handleDeleted = useCallback(
    (id: string) => {
      setGoals((prev) => prev.filter((g) => g.id !== id));
      router.refresh();
    },
    [router]
  );

  const handleDeleteRequest = useCallback((goal: Goal) => {
    setDeleteTarget({ id: goal.id, title: goal.title });
  }, []);

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={PAGE_TITLE_CLASS}>Goals</h1>
          <p className={PAGE_SUBTITLE_CLASS}>
            Targets you are building toward — revenue, delivery, and growth.
          </p>
        </div>
        <Button className="shrink-0 gap-2" onClick={openGoalAdd}>
          <Plus className="size-4" />
          Add goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <GoalsEmptyState onAdd={openGoalAdd} />
      ) : (
        <GoalsList
          goals={goals}
          onGoalUpdate={handleGoalUpdate}
          onGoalDelete={handleDeleteRequest}
        />
      )}

      <GoalFormDialog open={goalAddOpen} onOpenChange={setGoalAddOpen} />

      <DeleteGoalDialog
        goalId={deleteTarget?.id ?? null}
        goalTitle={deleteTarget?.title ?? ""}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleDeleted}
      />
    </PageTransition>
  );
}
