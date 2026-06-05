export const PROJECT_STATUSES = [
  "active",
  "paused",
  "completed",
  "archived",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type Project = {
  id: string;
  user_id: string;
  client_name: string;
  service_type: string | null;
  status: ProjectStatus | string | null;
  next_action: string | null;
  deadline: string | null;
  value: number | null;
  notes: string | null;
  site_url: string | null;
  github_repo: string | null;
  vercel_project_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectFormInput = {
  client_name: string;
  service_type: string;
  status: ProjectStatus;
  next_action?: string;
  deadline?: string;
  value?: string;
  notes?: string;
  site_url?: string;
  github_repo?: string;
};

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
