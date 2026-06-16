import type { SupabaseClient } from "@supabase/supabase-js";

import { toDateISO, addDaysToISO } from "@/lib/overview/date";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActiveProject = {
  id: string;
  name: string;
  status: string;
  next_action: string | null;
  deadline: string | null;
  value: number | null;
  task_count: number;
};

export type ProjectContext = {
  active: ActiveProject[];
  stalled: string[]; // project names with no update in 7+ days
  deadlineSoon: string[]; // project names with deadline in next 7 days
};

export type TaskContext = {
  completedCount: number;
  completedTitles: string[];
  overdue: string[]; // titles of overdue incomplete tasks
  dueSoon: string[]; // titles due in next 7 days
  highPriorityIncomplete: string[]; // titles
};

export type GoalContext = {
  all: Array<{
    title: string;
    current: number;
    target: number;
    unit: string | null;
    deadline: string | null;
    status: string;
    percentComplete: number;
  }>;
  noProgressStalled: string[]; // goal titles with no progress in 7+ days
  completedThisWeek: string[]; // goal titles that hit 100% in last 7 days
};

export type LeadContext = {
  newThisWeek: string[]; // lead names added in last 7 days
  wonThisWeek: Array<{ name: string; value: number | null }>;
  stalled: string[]; // lead names in same stage 14+ days
  totalPipelineValue: number;
  overdueFollowUps: Array<{ name: string; follow_up_date: string }>;
  engagementSummary: Array<{
    name: string;
    status: string;
    daysSinceActivity: number | null;
  }>;
};

export type ContentContext = {
  publishedThisWeek: Array<{ title: string; platforms: string }>;
  scheduledNextWeek: Array<{ title: string; platforms: string }>;
};

export type IdeaContext = {
  newThisWeek: string[]; // idea titles added in last 7 days
};

export type UserContext = {
  user: { name: string };
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  projects: ProjectContext;
  tasks: TaskContext;
  goals: GoalContext;
  leads: LeadContext;
  content: ContentContext;
  ideas: IdeaContext;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPlatforms(platforms: string | null | undefined): string {
  if (!platforms) return "";
  try {
    const parsed: unknown = JSON.parse(platforms);
    if (Array.isArray(parsed)) return (parsed as string[]).join(", ");
  } catch {
    // not JSON — return as-is
  }
  return String(platforms);
}

// ─── Main function ─────────────────────────────────────────────────────────────

export async function buildUserContext(
  userId: string,
  supabase: SupabaseClient
): Promise<UserContext> {
  const now = new Date();
  const todayISO = toDateISO(now);
  const sevenDaysAgo = addDaysToISO(todayISO, -7);
  const fourteenDaysAgo = addDaysToISO(todayISO, -14);
  const sevenDaysAhead = addDaysToISO(todayISO, 7);

  // ── User name ──────────────────────────────────────────────────────────────
  const { data: userRow } = await supabase
    .from("users")
    .select("name")
    .eq("id", userId)
    .single();

  const userName = userRow?.name ?? "there";

  // ── Projects ───────────────────────────────────────────────────────────────
  const { data: projects } = await supabase
    .from("projects")
    .select("id, project_name, status, next_action, deadline, value, updated_at")
    .eq("user_id", userId)
    .eq("status", "active");

  const activeProjectIds = (projects ?? []).map((p) => p.id);

  // Task counts per project
  const taskCountMap = new Map<string, number>();
  if (activeProjectIds.length > 0) {
    const { data: taskRows } = await supabase
      .from("tasks")
      .select("project_id")
      .eq("user_id", userId)
      .eq("completed", false)
      .in("project_id", activeProjectIds);

    for (const row of taskRows ?? []) {
      if (row.project_id) {
        taskCountMap.set(
          row.project_id,
          (taskCountMap.get(row.project_id) ?? 0) + 1
        );
      }
    }
  }

  const activeProjects: ActiveProject[] = (projects ?? []).map((p) => ({
    id: p.id,
    name: p.project_name,
    status: p.status ?? "active",
    next_action: p.next_action,
    deadline: p.deadline,
    value: p.value,
    task_count: taskCountMap.get(p.id) ?? 0,
  }));

  const stalledProjects = (projects ?? [])
    .filter((p) => p.updated_at && p.updated_at < `${sevenDaysAgo}T00:00:00`)
    .map((p) => p.project_name);

  const deadlineSoonProjects = (projects ?? [])
    .filter(
      (p) =>
        p.deadline &&
        p.deadline >= todayISO &&
        p.deadline <= sevenDaysAhead
    )
    .map((p) => p.project_name);

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const { data: allTasks } = await supabase
    .from("tasks")
    .select("title, due_date, priority, completed, updated_at")
    .eq("user_id", userId);

  const completedThisWeek = (allTasks ?? []).filter(
    (t) =>
      t.completed &&
      t.updated_at &&
      t.updated_at >= `${sevenDaysAgo}T00:00:00`
  );

  const overdueTasks = (allTasks ?? []).filter(
    (t) => !t.completed && t.due_date && t.due_date < todayISO
  );

  const dueSoonTasks = (allTasks ?? []).filter(
    (t) =>
      !t.completed &&
      t.due_date &&
      t.due_date >= todayISO &&
      t.due_date <= sevenDaysAhead
  );

  const highPriorityTasks = (allTasks ?? []).filter(
    (t) => !t.completed && t.priority === "high"
  );

  // ── Goals ──────────────────────────────────────────────────────────────────
  const { data: goals } = await supabase
    .from("goals")
    .select("id, title, current, target, unit, deadline, status, updated_at")
    .eq("user_id", userId)
    .not("status", "eq", "archived");

  const goalContextAll = (goals ?? []).map((g) => ({
    title: g.title,
    current: g.current ?? 0,
    target: g.target ?? 0,
    unit: g.unit ?? null,
    deadline: g.deadline ?? null,
    status: g.status ?? "active",
    percentComplete:
      g.target > 0 ? Math.round(((g.current ?? 0) / g.target) * 100) : 0,
  }));

  const stalledGoals = (goals ?? [])
    .filter(
      (g) =>
        g.status === "active" &&
        g.updated_at &&
        g.updated_at < `${sevenDaysAgo}T00:00:00` &&
        (g.current ?? 0) < (g.target ?? 0)
    )
    .map((g) => g.title);

  const completedGoalsThisWeek = (goals ?? [])
    .filter(
      (g) =>
        g.current >= g.target &&
        g.target > 0 &&
        g.updated_at &&
        g.updated_at >= `${sevenDaysAgo}T00:00:00`
    )
    .map((g) => g.title);

  // ── Leads ──────────────────────────────────────────────────────────────────
  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, status, value, created_at, updated_at, follow_up_date")
    .eq("user_id", userId);

  const newLeads = (leads ?? [])
    .filter(
      (l) =>
        l.created_at &&
        l.created_at >= `${sevenDaysAgo}T00:00:00`
    )
    .map((l) => l.name);

  const wonLeads = (leads ?? [])
    .filter(
      (l) =>
        l.status === "won" &&
        l.updated_at &&
        l.updated_at >= `${sevenDaysAgo}T00:00:00`
    )
    .map((l) => ({ name: l.name, value: l.value }));

  const stalledLeads = (leads ?? [])
    .filter(
      (l) =>
        l.status !== "won" &&
        l.status !== "lost" &&
        l.updated_at &&
        l.updated_at < `${fourteenDaysAgo}T00:00:00`
    )
    .map((l) => l.name);

  const totalPipelineValue = (leads ?? [])
    .filter((l) => l.status !== "lost")
    .reduce((sum, l) => sum + (l.value ?? 0), 0);

  const overdueFollowUps = (leads ?? [])
    .filter(
      (l) =>
        l.follow_up_date &&
        l.follow_up_date < todayISO &&
        l.status !== "won" &&
        l.status !== "lost"
    )
    .map((l) => ({ name: l.name, follow_up_date: l.follow_up_date as string }));

  // Fetch last activity date per active lead
  const activeLeadIds = (leads ?? [])
    .filter((l) => l.status !== "won" && l.status !== "lost")
    .map((l) => l.id);

  const lastActivityMap = new Map<string, string>();
  if (activeLeadIds.length > 0) {
    const { data: activityRows } = await supabase
      .from("lead_activities")
      .select("lead_id, created_at")
      .in("lead_id", activeLeadIds)
      .order("created_at", { ascending: false });

    for (const row of activityRows ?? []) {
      if (row.lead_id && !lastActivityMap.has(row.lead_id)) {
        lastActivityMap.set(row.lead_id, row.created_at);
      }
    }
  }

  const engagementSummary = (leads ?? [])
    .filter((l) => l.status !== "won" && l.status !== "lost")
    .map((l) => {
      const lastActivity = lastActivityMap.get(l.id);
      const daysSinceActivity = lastActivity
        ? Math.floor(
            (now.getTime() - new Date(lastActivity).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;
      return {
        name: l.name,
        status: l.status ?? "new",
        daysSinceActivity,
      };
    })
    .slice(0, 10);

  // ── Content ────────────────────────────────────────────────────────────────
  const { data: contentPosts } = await supabase
    .from("content_posts")
    .select("title, platforms, status, published_date, scheduled_date")
    .eq("user_id", userId);

  const publishedThisWeek = (contentPosts ?? [])
    .filter(
      (p) =>
        p.status === "published" &&
        p.published_date &&
        p.published_date >= sevenDaysAgo
    )
    .map((p) => ({
      title: p.title,
      platforms: formatPlatforms(p.platforms),
    }));

  const scheduledNextWeek = (contentPosts ?? [])
    .filter(
      (p) =>
        p.status !== "published" &&
        p.scheduled_date &&
        p.scheduled_date >= todayISO &&
        p.scheduled_date <= sevenDaysAhead
    )
    .map((p) => ({
      title: p.title,
      platforms: formatPlatforms(p.platforms),
    }));

  // ── Ideas ──────────────────────────────────────────────────────────────────
  const { data: ideas } = await supabase
    .from("ideas")
    .select("title, created_at")
    .eq("user_id", userId)
    .gte("created_at", `${sevenDaysAgo}T00:00:00`);

  return {
    user: { name: userName },
    generatedAt: now.toISOString(),
    weekStart: sevenDaysAgo,
    weekEnd: sevenDaysAhead,
    projects: {
      active: activeProjects,
      stalled: stalledProjects,
      deadlineSoon: deadlineSoonProjects,
    },
    tasks: {
      completedCount: completedThisWeek.length,
      completedTitles: completedThisWeek.map((t) => t.title),
      overdue: overdueTasks.map((t) => t.title),
      dueSoon: dueSoonTasks.map((t) => t.title),
      highPriorityIncomplete: highPriorityTasks.map((t) => t.title),
    },
    goals: {
      all: goalContextAll,
      noProgressStalled: stalledGoals,
      completedThisWeek: completedGoalsThisWeek,
    },
    leads: {
      newThisWeek: newLeads,
      wonThisWeek: wonLeads,
      stalled: stalledLeads,
      totalPipelineValue,
      overdueFollowUps,
      engagementSummary,
    },
    content: {
      publishedThisWeek,
      scheduledNextWeek,
    },
    ideas: {
      newThisWeek: (ideas ?? []).map((i) => i.title),
    },
  };
}
