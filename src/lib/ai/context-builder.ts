import type { SupabaseClient } from "@supabase/supabase-js";

import { ACTIVE_PIPELINE_STATUSES } from "@/lib/leads/constants";
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
  velocityByGoal: Array<{
    title: string;
    percentComplete: number;
    projectedCompletion: string | null;
  }>;
};

export type LeadContext = {
  newThisWeek: string[]; // lead names added in last 7 days
  wonThisWeek: Array<{
    name: string;
    value: number | null;
    value_type?: "one_time" | "monthly";
  }>;
  stalled: string[]; // lead names in same stage 14+ days
  /** Prefer pipelineValue split; annualized kept for any legacy consumers. */
  totalPipelineValue: number;
  pipelineValue: { oneTime: number; monthly: number };
  overdueFollowUps: Array<{ name: string; follow_up_date: string }>;
  engagementSummary: Array<{
    name: string;
    status: string;
    daysSinceActivity: number | null;
  }>;
  conversionRate: number;
  avgResponseTimeDays: number | null;
  activeLeadCount: number;
};

export type ContentContext = {
  publishedThisWeek: Array<{ title: string; platforms: string }>;
  scheduledNextWeek: Array<{ title: string; platforms: string }>;
  publishingStreak: number;
  avgPostsPerWeek: number;
};

export type IdeaContext = {
  newThisWeek: string[]; // idea titles added in last 7 days
};

export type SubscriptionTier = "free" | "ai" | "ai_pro" | "max";

export type UserContext = {
  user: { name: string };
  subscriptionTier: SubscriptionTier;
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

function resolveSubscriptionTier(
  subs: Array<{ package: string }>
): SubscriptionTier {
  const packages = subs.map((sub) => sub.package);
  if (packages.includes("max")) return "max";
  if (packages.includes("ai_pro")) return "ai_pro";
  if (packages.includes("ai")) return "ai";
  return "free";
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  return d;
}

function computePublishingStreak(
  posts: Array<{ published_date: string | null; status: string }>,
  now: Date
): number {
  const publishedDates = posts
    .filter((post) => post.status === "published" && post.published_date)
    .map((post) => post.published_date!.split("T")[0]);

  let streak = 0;
  for (let weekIndex = 0; weekIndex < 8; weekIndex++) {
    const weekStart = startOfWeekMonday(now);
    weekStart.setDate(weekStart.getDate() - weekIndex * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekStartISO = toDateISO(weekStart);
    const weekEndISO = toDateISO(weekEnd);

    const hasPost = publishedDates.some(
      (date) => date >= weekStartISO && date <= weekEndISO
    );

    if (weekIndex === 0) {
      if (!hasPost) break;
      streak = 1;
    } else if (hasPost) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function computeAvgPostsPerWeek(
  posts: Array<{ published_date: string | null; status: string }>,
  now: Date
): number {
  const windowStart = startOfWeekMonday(now);
  windowStart.setDate(windowStart.getDate() - 7 * 7);
  const windowStartISO = toDateISO(windowStart);

  const count = posts.filter(
    (post) =>
      post.status === "published" &&
      post.published_date &&
      post.published_date.split("T")[0] >= windowStartISO
  ).length;

  return Math.round((count / 8) * 10) / 10;
}

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

  const { data: subRows } = await supabase
    .from("user_subscriptions")
    .select("package, status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"]);

  const subscriptionTier = resolveSubscriptionTier(subRows ?? []);

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

  // ── Tasks (scoped queries — not every task the user has ever created) ──────
  const [
    { data: incompleteTasks },
    { data: completedThisWeekRows },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("title, due_date, priority, completed, updated_at")
      .eq("user_id", userId)
      .eq("completed", false),
    supabase
      .from("tasks")
      .select("title, due_date, priority, completed, updated_at")
      .eq("user_id", userId)
      .eq("completed", true)
      .gte("updated_at", `${sevenDaysAgo}T00:00:00`),
  ]);

  const completedThisWeek = completedThisWeekRows ?? [];

  const overdueTasks = (incompleteTasks ?? []).filter(
    (t) => t.due_date && t.due_date < todayISO
  );

  const dueSoonTasks = (incompleteTasks ?? []).filter(
    (t) =>
      t.due_date &&
      t.due_date >= todayISO &&
      t.due_date <= sevenDaysAhead
  );

  const highPriorityTasks = (incompleteTasks ?? []).filter(
    (t) => t.priority === "high"
  );

  // ── Goals ──────────────────────────────────────────────────────────────────
  const { data: goals } = await supabase
    .from("goals")
    .select(
      "id, title, current, target, unit, deadline, status, updated_at, created_at"
    )
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

  const velocityByGoal = (goals ?? [])
    .filter(
      (g) =>
        g.status === "active" &&
        (g.target ?? 0) > 0 &&
        (g.current ?? 0) > 0 &&
        g.deadline
    )
    .map((g) => {
      const target = g.target ?? 0;
      const current = g.current ?? 0;
      const percentComplete =
        target > 0 ? Math.round((current / target) * 100) : 0;

      if (!g.created_at) {
        return { title: g.title, percentComplete, projectedCompletion: null };
      }

      const daysSinceCreated = Math.max(
        1,
        Math.floor(
          (now.getTime() - new Date(g.created_at).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      const rate = current / daysSinceCreated;

      if (rate <= 0) {
        return { title: g.title, percentComplete, projectedCompletion: null };
      }

      const daysToComplete = (target - current) / rate;
      const projected = new Date(now);
      projected.setDate(projected.getDate() + Math.ceil(daysToComplete));

      return {
        title: g.title,
        percentComplete,
        projectedCompletion: toDateISO(projected),
      };
    });

  // ── Leads (active + recent closed; counts for conversion) ──────────────────
  const ninetyDaysAgo = addDaysToISO(todayISO, -90);
  const leadSelect =
    "id, name, status, value, value_type, created_at, updated_at, follow_up_date, contacted_at";

  const [
    { data: activeLeads },
    { data: recentClosedLeads },
    { data: newLeadRows },
    { count: wonCount },
    { count: lostCount },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select(leadSelect)
      .eq("user_id", userId)
      .in("status", [...ACTIVE_PIPELINE_STATUSES]),
    supabase
      .from("leads")
      .select(leadSelect)
      .eq("user_id", userId)
      .in("status", ["won", "lost"])
      .gte("updated_at", `${ninetyDaysAgo}T00:00:00`),
    supabase
      .from("leads")
      .select("name, created_at")
      .eq("user_id", userId)
      .gte("created_at", `${sevenDaysAgo}T00:00:00`),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "won"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "lost"),
  ]);

  const activeLeadRows = activeLeads ?? [];
  const closedRows = recentClosedLeads ?? [];

  const newLeads = (newLeadRows ?? []).map((l) => l.name);

  const wonLeads = closedRows
    .filter(
      (l) =>
        l.status === "won" &&
        l.updated_at &&
        l.updated_at >= `${sevenDaysAgo}T00:00:00`
    )
    .map((l) => ({
      name: l.name,
      value: l.value,
      value_type:
        l.value_type === "monthly"
          ? ("monthly" as const)
          : ("one_time" as const),
    }));

  const stalledLeads = activeLeadRows
    .filter(
      (l) => l.updated_at && l.updated_at < `${fourteenDaysAgo}T00:00:00`
    )
    .map((l) => l.name);

  const pipelineValue = activeLeadRows.reduce(
    (acc, l) => {
      const amount = l.value ?? 0;
      if (amount <= 0) return acc;
      if (l.value_type === "monthly") acc.monthly += amount;
      else acc.oneTime += amount;
      return acc;
    },
    { oneTime: 0, monthly: 0 }
  );
  // Annualized for a single comparable figure in prompts that need one number.
  const totalPipelineValue = pipelineValue.oneTime + pipelineValue.monthly * 12;

  const overdueFollowUps = activeLeadRows
    .filter((l) => l.follow_up_date && l.follow_up_date < todayISO)
    .map((l) => ({ name: l.name, follow_up_date: l.follow_up_date as string }));

  const activeLeadIds = activeLeadRows.map((l) => l.id);

  const lastActivityMap = new Map<string, string>();
  if (activeLeadIds.length > 0) {
    // Only need the newest activity per lead; bound lookback to a year.
    const { data: activityRows } = await supabase
      .from("lead_activities")
      .select("lead_id, created_at")
      .in("lead_id", activeLeadIds)
      .gte("created_at", `${addDaysToISO(todayISO, -365)}T00:00:00`)
      .order("created_at", { ascending: false });

    for (const row of activityRows ?? []) {
      if (row.lead_id && !lastActivityMap.has(row.lead_id)) {
        lastActivityMap.set(row.lead_id, row.created_at);
      }
    }
  }

  const engagementSummary = activeLeadRows
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

  const closedTotal = (wonCount ?? 0) + (lostCount ?? 0);
  const conversionRate =
    closedTotal > 0
      ? Math.round(((wonCount ?? 0) / closedTotal) * 1000) / 10
      : 0;

  const responseTimeSource = [...activeLeadRows, ...closedRows];
  const responseTimes: number[] = [];
  for (const lead of responseTimeSource) {
    if (!lead.created_at || !lead.contacted_at) continue;
    const days = Math.floor(
      (new Date(lead.contacted_at).getTime() -
        new Date(lead.created_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (days >= 0) responseTimes.push(days);
  }
  const avgResponseTimeDays =
    responseTimes.length > 0
      ? Math.round(
          (responseTimes.reduce((sum, value) => sum + value, 0) /
            responseTimes.length) *
            10
        ) / 10
      : null;

  const activeLeadCount = activeLeadRows.length;

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

  const publishingStreak = computePublishingStreak(contentPosts ?? [], now);
  const avgPostsPerWeek = computeAvgPostsPerWeek(contentPosts ?? [], now);

  // ── Ideas ──────────────────────────────────────────────────────────────────
  const { data: ideas } = await supabase
    .from("ideas")
    .select("title, created_at")
    .eq("user_id", userId)
    .gte("created_at", `${sevenDaysAgo}T00:00:00`);

  return {
    user: { name: userName },
    subscriptionTier,
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
      velocityByGoal,
    },
    leads: {
      newThisWeek: newLeads,
      wonThisWeek: wonLeads,
      stalled: stalledLeads,
      totalPipelineValue,
      pipelineValue,
      overdueFollowUps,
      engagementSummary,
      conversionRate,
      avgResponseTimeDays,
      activeLeadCount,
    },
    content: {
      publishedThisWeek,
      scheduledNextWeek,
      publishingStreak,
      avgPostsPerWeek,
    },
    ideas: {
      newThisWeek: (ideas ?? []).map((i) => i.title),
    },
  };
}
