export const GOAL_STATUSES = [
  "active",
  "completed",
  "paused",
  "archived",
] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  category: string | null;
  target: number | null;
  current: number;
  unit: string | null;
  deadline: string | null;
  status: GoalStatus | string | null;
  created_at: string;
};

export type GoalFormInput = {
  title: string;
  target: string;
  unit: string;
  current?: string;
  category?: string;
  deadline?: string;
  status?: GoalStatus;
};

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
