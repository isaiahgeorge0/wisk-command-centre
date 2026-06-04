import type { Goal, GoalFormInput } from "@/lib/goals/types";
import { GOAL_STATUSES, type GoalStatus } from "@/lib/goals/types";

export const EMPTY_GOAL_FORM: GoalFormInput = {
  title: "",
  target: "",
  unit: "",
  current: "0",
  category: "",
  deadline: "",
  status: "active",
};

export function goalToFormInput(goal: Goal): GoalFormInput {
  return {
    title: goal.title,
    target: goal.target != null ? String(goal.target) : "",
    unit: goal.unit ?? "",
    current: String(goal.current ?? 0),
    category: goal.category ?? "",
    deadline: goal.deadline ?? "",
    status: isGoalStatus(goal.status) ? goal.status : "active",
  };
}

function isGoalStatus(status: string | null): status is GoalStatus {
  return GOAL_STATUSES.includes(status as GoalStatus);
}
