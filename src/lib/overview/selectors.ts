import {
  getOverviewDateContext,
  getOverviewHeader,
  isBeforeToday,
  isOnOrBeforeToday,
  isWithinNext7Days,
  type OverviewDateContext,
  type OverviewHeaderContent,
} from "@/lib/overview/date";
import type { Goal } from "@/lib/goals/types";
import type { ContentPost } from "@/lib/content/types";
import {
  buildContentStats,
  getPostsDueThisWeek,
} from "@/lib/content/selectors";
import type { Idea } from "@/lib/ideas/types";
import { getRecentLeads } from "@/lib/leads/selectors";
import type { Lead } from "@/lib/leads/types";
import { getProjectTaskStatsMap, type ProjectTaskStats } from "@/lib/projects/progress";
import type { Project } from "@/lib/projects/types";
import type { TaskWithProject } from "@/lib/tasks/types";

export type OverviewStats = {
  activeProjects: number;
  tasksDueTodayOrOverdue: number;
  activeGoals: number;
  ideasCount: number;
  contentPublishedThisMonth: number;
  contentScheduled: number;
  contentInProgress: number;
  contentStreak: number;
};

export type OverviewSnapshot = {
  header: OverviewHeaderContent;
  dateContext: OverviewDateContext;
  stats: OverviewStats;
  overdueTasks: TaskWithProject[];
  projectsMissingNextAction: Project[];
  goalsAtZeroWithDeadline: Goal[];
  tasksDueThisWeekGrouped: { date: string; tasks: TaskWithProject[] }[];
  projectDeadlinesThisWeek: Project[];
  contentDueThisWeekGrouped: { date: string; posts: ContentPost[] }[];
  recentIdeas: Idea[];
  recentProjects: Project[];
  recentLeads: Lead[];
  projectTaskStats: Record<string, ProjectTaskStats>;
};

function isActiveProject(project: Project): boolean {
  return (project.status ?? "active") === "active";
}

function isActiveGoal(goal: Goal): boolean {
  return (goal.status ?? "active") === "active";
}

export function buildOverviewSnapshot(
  projects: Project[],
  tasks: TaskWithProject[],
  goals: Goal[],
  ideas: Idea[],
  leads: Lead[] = [],
  contentPosts: ContentPost[] = [],
  now: Date = new Date(),
  displayName?: string | null
): OverviewSnapshot {
  const dateContext = getOverviewDateContext(now);
  const { todayISO, weekEndISO } = dateContext;

  const incompleteTasks = tasks.filter((t) => !t.completed);

  const tasksDueTodayOrOverdue = incompleteTasks.filter(
    (t) => t.due_date && isOnOrBeforeToday(t.due_date, todayISO)
  ).length;

  const overdueTasks = incompleteTasks
    .filter((t) => t.due_date && isBeforeToday(t.due_date, todayISO))
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  const projectsMissingNextAction = projects.filter(
    (p) => isActiveProject(p) && !p.next_action?.trim()
  );

  const goalsAtZeroWithDeadline = goals.filter(
    (g) => isActiveGoal(g) && g.deadline && (g.current ?? 0) === 0
  );

  const tasksThisWeek = incompleteTasks
    .filter(
      (t) =>
        t.due_date &&
        isWithinNext7Days(t.due_date, todayISO, weekEndISO)
    )
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  const tasksDueThisWeekGrouped = groupTasksByDueDate(tasksThisWeek);

  const projectDeadlinesThisWeek = projects
    .filter(
      (p) =>
        p.deadline &&
        isWithinNext7Days(p.deadline, todayISO, weekEndISO)
    )
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));

  const recentIdeas = [...ideas]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 3);

  // TODO: Once updated_at is added to the projects table, sort recentProjects by last updated instead of created_at.
  const recentProjects = [...projects]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 3);

  const contentStats = buildContentStats(contentPosts, now);
  const contentDueThisWeekGrouped = getPostsDueThisWeek(
    contentPosts,
    todayISO,
    weekEndISO
  );

  return {
    header: getOverviewHeader(now, displayName),
    dateContext,
    stats: {
      activeProjects: projects.filter(isActiveProject).length,
      tasksDueTodayOrOverdue,
      activeGoals: goals.filter(isActiveGoal).length,
      ideasCount: ideas.length,
      contentPublishedThisMonth: contentStats.publishedThisMonth,
      contentScheduled: contentStats.scheduledUpcoming,
      contentInProgress: contentStats.inProgress,
      contentStreak: contentStats.streak,
    },
    overdueTasks,
    projectsMissingNextAction,
    goalsAtZeroWithDeadline,
    tasksDueThisWeekGrouped,
    projectDeadlinesThisWeek,
    contentDueThisWeekGrouped,
    recentIdeas,
    recentProjects,
    recentLeads: getRecentLeads(leads),
    projectTaskStats: getProjectTaskStatsMap(tasks),
  };
}

function groupTasksByDueDate(
  tasks: TaskWithProject[]
): { date: string; tasks: TaskWithProject[] }[] {
  const map = new Map<string, TaskWithProject[]>();

  for (const task of tasks) {
    if (!task.due_date) continue;
    const existing = map.get(task.due_date) ?? [];
    existing.push(task);
    map.set(task.due_date, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, grouped]) => ({ date, tasks: grouped }));
}

export function hasNeedsAttention(snapshot: OverviewSnapshot): boolean {
  return (
    snapshot.overdueTasks.length > 0 ||
    snapshot.projectsMissingNextAction.length > 0 ||
    snapshot.goalsAtZeroWithDeadline.length > 0
  );
}
