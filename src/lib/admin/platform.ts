export type SectionKey =
  | "projects"
  | "tasks"
  | "goals"
  | "ideas"
  | "leads"
  | "content";

export type SectionActivity = {
  key: SectionKey;
  label: string;
  count: number;
  barClass: string;
};

export const SECTION_BAR_COLORS: Record<SectionKey, string> = {
  projects: "bg-wisk-purple",
  tasks: "bg-wisk-teal",
  goals: "bg-amber-500",
  ideas: "bg-wisk-coral",
  leads: "bg-blue-500",
  content: "bg-rose-500",
};

export const SECTION_LABELS: Record<SectionKey, string> = {
  projects: "Projects",
  tasks: "Tasks",
  goals: "Goals",
  ideas: "Ideas",
  leads: "Leads",
  content: "Content",
};

export type PlatformMetrics = {
  totalProjects: number;
  totalTasks: number;
  totalLeads: number;
  totalContentPosts: number;
  sectionActivity: SectionActivity[];
};

export type UserActivityStatus = "active" | "inactive" | "dormant";

export type AdminUserHealth = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  project_count: number;
  task_count: number;
  days_since_joined: number;
  activity_status: UserActivityStatus;
};

export type UserHealthSummary = {
  active: number;
  inactive: number;
  dormant: number;
};

export const DEFAULT_INVITE_WELCOME_MESSAGE =
  "Welcome to WISK Command Centre — we're glad to have you. Set your password using the link below and you'll be up and running in minutes.";
