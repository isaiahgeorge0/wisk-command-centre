import type { ContentPost } from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";
import type { Idea } from "@/lib/ideas/types";
import type { Lead } from "@/lib/leads/types";
import type { ProjectTaskStats } from "@/lib/projects/progress";
import type { Project } from "@/lib/projects/types";
import type { Task } from "@/lib/tasks/types";

export type SuggestionCategory =
  | "leads"
  | "projects"
  | "tasks"
  | "goals"
  | "content"
  | "ideas"
  | "email";

export type SuggestionPriority = "high" | "medium" | "low";

export type SmartSuggestion = {
  id: string;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon: string;
  accentColour: string;
  /** Entity reference for notification deduplication */
  referenceId?: string;
  notificationType?: SuggestionNotificationType;
};

export const SUGGESTION_NOTIFICATION_TYPES = [
  "suggestion_lead_stalled",
  "suggestion_project_deadline",
  "suggestion_goal_no_progress",
  "suggestion_content_streak",
  "suggestion_overdue_followup",
] as const;

export type SuggestionNotificationType =
  (typeof SUGGESTION_NOTIFICATION_TYPES)[number];

export type SuggestionTask = Task & {
  updated_at: string;
};

export type SuggestionProject = Project & {
  taskStats: ProjectTaskStats;
  lastActivityAt: string;
};

export type SuggestionLead = Lead & {
  lastActivityAt: string | null;
  daysInCurrentStage: number;
};

export type SuggestionContext = {
  projects: SuggestionProject[];
  tasks: SuggestionTask[];
  goals: Goal[];
  leads: SuggestionLead[];
  allLeads: Lead[];
  contentPosts: ContentPost[];
  ideas: Idea[];
  contentStreak: number;
  today: Date;
};
