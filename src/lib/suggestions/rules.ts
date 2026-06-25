import { ACTIVE_PIPELINE_STATUSES, LEAD_STATUS_LABELS } from "@/lib/leads/constants";
import type { LeadStatus } from "@/lib/leads/types";
import {
  addDaysToISO,
  compareDateISO,
  isBeforeToday,
  isWithinNext7Days,
  toDateISO,
} from "@/lib/overview/date";
import type {
  SmartSuggestion,
  SuggestionContext,
  SuggestionPriority,
} from "@/lib/suggestions/types";

const TERMINAL_LEAD_STATUSES = new Set(["won", "lost"]);
const TERMINAL_PROJECT_STATUSES = new Set(["completed", "archived"]);
const PRIORITY_RANK: Record<SuggestionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const CATEGORY_RANK: Record<SmartSuggestion["category"], number> = {
  leads: 0,
  email: 1,
  tasks: 2,
  projects: 3,
  goals: 4,
  content: 5,
  ideas: 6,
};

function isOlderThanDays(isoTimestamp: string, days: number, now: Date): boolean {
  const then = new Date(isoTimestamp).getTime();
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return then < cutoff;
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T12:00:00`);
  const to = new Date(`${toISO}T12:00:00`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function goalProgressPercent(current: number, target: number | null): number {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function sortSuggestions(suggestions: SmartSuggestion[]): SmartSuggestion[] {
  return [...suggestions].sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    const categoryDiff = CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category];
    if (categoryDiff !== 0) return categoryDiff;
    if (a.actionHref && !b.actionHref) return -1;
    if (!a.actionHref && b.actionHref) return 1;
    return 0;
  });
}

export function generateSuggestions(
  data: SuggestionContext
): SmartSuggestion[] {
  const { today } = data;
  const todayISO = toDateISO(today);
  const weekEndISO = addDaysToISO(todayISO, 6);
  const goalHorizonISO = addDaysToISO(todayISO, 30);
  const nextWeekStart = addDaysToISO(todayISO, 7);
  const nextWeekEnd = addDaysToISO(todayISO, 13);
  const dayOfWeek = today.getDay();
  const dayOfMonth = today.getDate();

  const suggestions: SmartSuggestion[] = [];

  // ─── LEADS ────────────────────────────────────────────────────────────────

  for (const lead of data.leads) {
    if (TERMINAL_LEAD_STATUSES.has(lead.status)) continue;

    const stageLabel =
      LEAD_STATUS_LABELS[lead.status as keyof typeof LEAD_STATUS_LABELS] ??
      lead.status;
    const days = lead.daysInCurrentStage;
    const lastActivity = lead.lastActivityAt ?? lead.updated_at;
    const inactiveInStage =
      days >= 14 && isOlderThanDays(lastActivity, 14, today);

    if (inactiveInStage && ACTIVE_PIPELINE_STATUSES.includes(lead.status as LeadStatus)) {
      suggestions.push({
        id: `leads-stalled-${lead.id}`,
        category: "leads",
        priority: days >= 21 ? "high" : "medium",
        title: `${lead.name} hasn't moved in ${days} days`,
        description: `This lead has been in ${stageLabel} for ${days} days. A quick follow-up could keep it moving.`,
        actionLabel: "View lead",
        actionHref: "/leads",
        icon: "User",
        accentColour: "text-indigo-400",
        referenceId: lead.id,
        notificationType:
          days >= 21 ? "suggestion_lead_stalled" : undefined,
      });
    }

    if (lead.follow_up_date && isBeforeToday(lead.follow_up_date, todayISO)) {
      suggestions.push({
        id: `leads-followup-${lead.id}`,
        category: "leads",
        priority: "high",
        title: `Follow up overdue: ${lead.name}`,
        description: `You planned to follow up with ${lead.name} on ${lead.follow_up_date}. Don't let it slip.`,
        actionLabel: "View lead",
        actionHref: "/leads",
        icon: "Phone",
        accentColour: "text-wisk-coral",
        referenceId: lead.id,
        notificationType: "suggestion_overdue_followup",
      });
    }
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const leadsThisMonth = data.allLeads.filter(
    (lead) => new Date(lead.created_at) >= monthStart
  ).length;

  if (dayOfMonth > 7 && leadsThisMonth === 0) {
    suggestions.push({
      id: "leads-no-new-month",
      category: "leads",
      priority: "medium",
      title: "Pipeline needs fresh leads",
      description:
        "You haven't added any new leads this month. Even one new conversation keeps the pipeline moving.",
      actionLabel: "Add a lead",
      actionHref: "/leads",
      icon: "UserPlus",
      accentColour: "text-indigo-400",
    });
  }

  // ─── PROJECTS ───────────────────────────────────────────────────────────

  let missingNextActionCount = 0;

  for (const project of data.projects) {
    const status = project.status ?? "active";
    if (status !== "active") continue;

    const daysSinceActivity = daysBetween(
      toDateISO(new Date(project.lastActivityAt)),
      todayISO
    );

    if (isOlderThanDays(project.lastActivityAt, 7, today)) {
      suggestions.push({
        id: `projects-stalled-${project.id}`,
        category: "projects",
        priority: "medium",
        title: `${project.project_name} has gone quiet`,
        description: `No activity on ${project.project_name} in ${daysSinceActivity} days. What's the next step?`,
        actionLabel: "View project",
        actionHref: "/projects",
        icon: "FolderKanban",
        accentColour: "text-purple-400",
        referenceId: project.id,
      });
    }

    if (
      project.deadline &&
      !TERMINAL_PROJECT_STATUSES.has(status) &&
      isWithinNext7Days(project.deadline, todayISO, weekEndISO) &&
      project.taskStats.percent < 50
    ) {
      const days = daysBetween(todayISO, project.deadline);
      suggestions.push({
        id: `projects-deadline-${project.id}`,
        category: "projects",
        priority: "high",
        title: `${project.project_name} deadline in ${days} day${days === 1 ? "" : "s"}`,
        description: `${project.taskStats.percent}% of tasks complete. You may need to push to hit the deadline.`,
        actionLabel: "View project",
        actionHref: "/projects",
        icon: "CalendarClock",
        accentColour: "text-wisk-coral",
        referenceId: project.id,
        notificationType: "suggestion_project_deadline",
      });
    }

    if (!project.next_action?.trim() && missingNextActionCount < 2) {
      missingNextActionCount += 1;
      suggestions.push({
        id: `projects-next-action-${project.id}`,
        category: "projects",
        priority: "low",
        title: `${project.project_name} has no next action`,
        description:
          "Without a clear next step, projects drift. Add one to keep it moving.",
        actionLabel: "View project",
        actionHref: "/projects",
        icon: "ArrowRight",
        accentColour: "text-purple-400",
        referenceId: project.id,
      });
    }
  }

  // ─── TASKS ──────────────────────────────────────────────────────────────

  const incompleteTasks = data.tasks.filter((task) => !task.completed);
  const overdueCount = incompleteTasks.filter(
    (task) => task.due_date && isBeforeToday(task.due_date, todayISO)
  ).length;

  if (overdueCount > 0) {
    suggestions.push({
      id: "tasks-overdue",
      category: "tasks",
      priority: overdueCount >= 3 ? "high" : "medium",
      title: `${overdueCount} task${overdueCount === 1 ? "" : "s"} overdue`,
      description: `You have ${overdueCount} overdue task${overdueCount === 1 ? "" : "s"}. Clearing even one builds momentum.`,
      actionLabel: "View tasks",
      actionHref: "/tasks",
      icon: "CheckSquare",
      accentColour: "text-wisk-teal",
    });
  }

  const tasksDueThisWeek = incompleteTasks.filter(
    (task) =>
      task.due_date &&
      isWithinNext7Days(task.due_date, todayISO, weekEndISO)
  );

  if (
    dayOfWeek >= 1 &&
    dayOfWeek <= 3 &&
    tasksDueThisWeek.length === 0
  ) {
    suggestions.push({
      id: "tasks-empty-week",
      category: "tasks",
      priority: "low",
      title: "Nothing scheduled this week",
      description:
        "Your task list is clear for the week. A good time to plan ahead.",
      actionLabel: "Add a task",
      actionHref: "/tasks",
      icon: "CalendarDays",
      accentColour: "text-wisk-teal",
    });
  }

  // ─── GOALS ──────────────────────────────────────────────────────────────

  for (const goal of data.goals) {
    const status = goal.status ?? "active";
    if (!["active", "paused"].includes(status)) continue;

    if (
      status === "active" &&
      goal.current === 0 &&
      goal.deadline &&
      compareDateISO(goal.deadline, todayISO) >= 0 &&
      compareDateISO(goal.deadline, goalHorizonISO) <= 0
    ) {
      const days = daysBetween(todayISO, goal.deadline);
      suggestions.push({
        id: `goals-no-progress-${goal.id}`,
        category: "goals",
        priority: "high",
        title: `${goal.title} hasn't started`,
        description: `Your deadline is in ${days} day${days === 1 ? "" : "s"} but progress is at 0. Even a small step counts.`,
        actionLabel: "Update goal",
        actionHref: "/goals",
        icon: "Target",
        accentColour: "text-blue-400",
        referenceId: goal.id,
        notificationType: "suggestion_goal_no_progress",
      });
    }

    const progress = goalProgressPercent(goal.current, goal.target);
    if (status === "active" && progress >= 80 && progress < 100) {
      suggestions.push({
        id: `goals-nearly-${goal.id}`,
        category: "goals",
        priority: "medium",
        title: `${goal.title} is almost done`,
        description: `You're ${progress}% of the way there. One more push and it's complete.`,
        actionLabel: "Update goal",
        actionHref: "/goals",
        icon: "Trophy",
        accentColour: "text-blue-400",
        referenceId: goal.id,
      });
    }
  }

  // ─── CONTENT ────────────────────────────────────────────────────────────

  const publishedToday = data.contentPosts.some(
    (post) =>
      post.status === "published" && post.published_date === todayISO
  );
  const scheduledToday = data.contentPosts.some(
    (post) =>
      post.status === "scheduled" && post.scheduled_date === todayISO
  );

  if (data.contentStreak > 0 && !publishedToday && !scheduledToday) {
    suggestions.push({
      id: "content-streak-risk",
      category: "content",
      priority: "high",
      title: "Content streak at risk",
      description: `Your ${data.contentStreak}-day streak could end today. Publish or schedule something to keep it going.`,
      actionLabel: "View content",
      actionHref: "/content",
      icon: "Flame",
      accentColour: "text-wisk-coral",
      referenceId: "content-streak",
      notificationType: "suggestion_content_streak",
    });
  }

  const scheduledNextWeek = data.contentPosts.some(
    (post) =>
      post.status === "scheduled" &&
      post.scheduled_date &&
      compareDateISO(post.scheduled_date, nextWeekStart) >= 0 &&
      compareDateISO(post.scheduled_date, nextWeekEnd) <= 0
  );

  if (
    (dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) &&
    !scheduledNextWeek
  ) {
    suggestions.push({
      id: "content-empty-next-week",
      category: "content",
      priority: "low",
      title: "Content calendar is empty next week",
      description:
        "Nothing scheduled for next week yet. Plan ahead to keep the momentum.",
      actionLabel: "Add content",
      actionHref: "/content",
      icon: "CalendarPlus",
      accentColour: "text-wisk-coral",
    });
  }

  // ─── IDEAS ──────────────────────────────────────────────────────────────

  if (data.ideas.length >= 5) {
    suggestions.push({
      id: "ideas-unexplored",
      category: "ideas",
      priority: "low",
      title: `You have ${data.ideas.length} unexplored ideas`,
      description:
        "Your ideas bank is building up. Worth reviewing — one of these could be your next project or piece of content.",
      actionLabel: "View ideas",
      actionHref: "/ideas",
      icon: "Lightbulb",
      accentColour: "text-wisk-teal",
    });
  }

  return sortSuggestions(suggestions).slice(0, 6);
}
