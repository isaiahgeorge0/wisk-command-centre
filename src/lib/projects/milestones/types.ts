export type ProjectMilestone = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  date: string;
  completed: boolean;
  created_at: string;
};

export type MilestoneFormInput = {
  title: string;
  date: string;
};

export type MilestoneActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
