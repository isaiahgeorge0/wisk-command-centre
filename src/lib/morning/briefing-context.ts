import type { BriefingContext } from "@/lib/morning/briefing-generator";
import { getLocalDateKey } from "@/lib/morning/timezone";
import { createAdminClient } from "@/lib/supabase/admin";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function buildBriefingContext(
  userId: string,
  timezone: string
): Promise<BriefingContext> {
  const supabase = createAdminClient();
  const today = getLocalDateKey(timezone);
  const deadlineCutoff = getLocalDateKey(
    timezone,
    new Date(Date.now() + 14 * DAY_MS)
  );

  const [tasks, leads, goals, content, maintenance, rent] = await Promise.all([
    supabase
      .from("tasks")
      .select("title, due_date, completed")
      .eq("user_id", userId)
      .eq("completed", false)
      .not("due_date", "is", null)
      .lte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(10),
    supabase
      .from("leads")
      .select("name, updated_at, status")
      .eq("user_id", userId)
      .not("status", "in", "(won,lost)")
      .lt("updated_at", new Date(Date.now() - 7 * DAY_MS).toISOString())
      .limit(5),
    supabase
      .from("goals")
      .select("title, deadline, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .not("deadline", "is", null)
      .gte("deadline", today)
      .lte("deadline", deadlineCutoff)
      .order("deadline", { ascending: true })
      .limit(5),
    supabase
      .from("content_posts")
      .select("title, scheduled_date")
      .eq("user_id", userId)
      .eq("scheduled_date", today)
      .limit(5),
    supabase
      .from("maintenance_tickets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["new", "in_progress"]),
    supabase
      .from("rent_payments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending")
      .lte("due_date", today),
  ]);

  const taskRows = (tasks.data ?? []).filter(
    (task): task is typeof task & { due_date: string } =>
      typeof task.due_date === "string"
  );

  return {
    overdueTasks: taskRows
      .filter((task) => task.due_date < today)
      .map((task) => ({ title: task.title, due_date: task.due_date })),
    dueTodayTasks: taskRows
      .filter((task) => task.due_date === today)
      .map((task) => ({ title: task.title })),
    stalledLeads: (leads.data ?? []).map((lead) => ({
      name: lead.name,
      days: Math.floor(
        (Date.now() - new Date(lead.updated_at).getTime()) / DAY_MS
      ),
    })),
    goalDeadlines: (goals.data ?? [])
      .filter(
        (goal): goal is typeof goal & { deadline: string } =>
          typeof goal.deadline === "string"
      )
      .map((goal) => ({ title: goal.title, deadline: goal.deadline })),
    contentDueToday: (content.data ?? []).map((post) => ({
      title: post.title,
    })),
    openMaintenance: maintenance.count ?? 0,
    rentDueCount: rent.count ?? 0,
  };
}
