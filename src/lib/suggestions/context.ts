import type { SupabaseClient } from "@supabase/supabase-js";

import { computeContentStreak } from "@/lib/content/selectors";
import type { ContentPost } from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";
import type { Idea } from "@/lib/ideas/types";
import { daysInStage } from "@/lib/leads/format";
import type { Lead } from "@/lib/leads/types";
import { getProjectTaskStats } from "@/lib/projects/progress";
import type { Project } from "@/lib/projects/types";
import type {
  SuggestionContext,
  SuggestionLead,
  SuggestionProject,
  SuggestionTask,
} from "@/lib/suggestions/types";

export async function buildSuggestionContext(
  userId: string,
  supabase: SupabaseClient
): Promise<SuggestionContext> {
  const today = new Date();

  const [
    projectsRes,
    tasksRes,
    goalsRes,
    leadsRes,
    contentRes,
    ideasRes,
    activitiesRes,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "paused"]),
    supabase
      .from("tasks")
      .select("id, user_id, project_id, title, due_date, priority, completed, raw_content, created_at, updated_at")
      .eq("user_id", userId),
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "paused"]),
    supabase.from("leads").select("*").eq("user_id", userId),
    supabase.from("content_posts").select("*").eq("user_id", userId),
    supabase
      .from("ideas")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["new", "exploring"]),
    supabase
      .from("lead_activities")
      .select("lead_id, created_at")
      .eq("user_id", userId),
  ]);

  if (projectsRes.error) throw new Error(projectsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (leadsRes.error) throw new Error(leadsRes.error.message);
  if (contentRes.error) throw new Error(contentRes.error.message);
  if (ideasRes.error) throw new Error(ideasRes.error.message);
  if (activitiesRes.error) throw new Error(activitiesRes.error.message);

  const tasks = (tasksRes.data ?? []) as SuggestionTask[];
  const projects = (projectsRes.data ?? []) as Project[];
  const allLeads = (leadsRes.data ?? []) as Lead[];
  const contentPosts = (contentRes.data ?? []) as ContentPost[];
  const ideas = (ideasRes.data ?? []) as Idea[];
  const goals = (goalsRes.data ?? []) as Goal[];

  const lastActivityByLead = new Map<string, string>();
  for (const activity of activitiesRes.data ?? []) {
    const existing = lastActivityByLead.get(activity.lead_id);
    if (!existing || activity.created_at > existing) {
      lastActivityByLead.set(activity.lead_id, activity.created_at);
    }
  }

  const suggestionProjects: SuggestionProject[] = projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.project_id === project.id);
    const taskStats = getProjectTaskStats(
      projectTasks.map((task) => ({ ...task, project_name: null })),
      project.id
    );
    const lastTaskUpdate = projectTasks.reduce<string | null>((latest, task) => {
      if (!latest || task.updated_at > latest) return task.updated_at;
      return latest;
    }, null);
    const lastActivityAt =
      lastTaskUpdate && lastTaskUpdate > project.updated_at
        ? lastTaskUpdate
        : project.updated_at;

    return {
      ...project,
      taskStats,
      lastActivityAt,
    };
  });

  const suggestionLeads: SuggestionLead[] = allLeads.map((lead) => ({
    ...lead,
    lastActivityAt: lastActivityByLead.get(lead.id) ?? null,
    daysInCurrentStage: daysInStage(lead, today),
  }));

  return {
    projects: suggestionProjects,
    tasks,
    goals,
    leads: suggestionLeads,
    allLeads,
    contentPosts,
    ideas,
    contentStreak: computeContentStreak(contentPosts, today),
    today,
  };
}
