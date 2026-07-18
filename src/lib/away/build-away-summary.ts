import type { WinstonPick } from "@/lib/email/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type AwaySummaryItem = {
  label: string;
  sub?: string;
  href?: string;
};

export type AwaySummary = {
  lastSyncedAt: string;
  hasUpdates: boolean;
  newEmails: AwaySummaryItem[];
  newLeads: AwaySummaryItem[];
  overdueTasks: AwaySummaryItem[];
  newMessages: AwaySummaryItem[];
};

type EmailPicksRow = {
  picks: WinstonPick[] | null;
  generated_at: string;
};

export async function buildAwaySummary(
  userId: string,
  sinceAt: Date
): Promise<AwaySummary> {
  const supabase = createAdminClient();
  const since = sinceAt.toISOString();
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: leads },
    { data: tasks },
    { data: messages },
    { data: emailPickRows },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id, name, status, created_at")
      .eq("user_id", userId)
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("tasks")
      .select("id, title, due_date, project_id")
      .eq("user_id", userId)
      .eq("completed", false)
      .not("due_date", "is", null)
      .lt("due_date", today)
      .gt("updated_at", since)
      .order("due_date", { ascending: true })
      .limit(10),
    supabase
      .from("tenant_messages")
      .select("id, message, created_at, tenant_id, property_id")
      .eq("landlord_user_id", userId)
      .eq("sender_type", "tenant")
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("winston_email_picks")
      .select("picks, generated_at")
      .eq("user_id", userId)
      .gt("generated_at", since)
      .order("generated_at", { ascending: false })
      .limit(10),
  ]);

  const newLeads: AwaySummaryItem[] = (leads ?? []).map((lead) => ({
    label: lead.name,
    sub: lead.status ?? undefined,
    href: "/leads",
  }));

  const overdueTasks: AwaySummaryItem[] = (tasks ?? []).map((task) => ({
    label: task.title,
    sub: task.due_date ?? undefined,
    href: "/tasks",
  }));

  const newMessages: AwaySummaryItem[] = (messages ?? []).map((message) => ({
    label: message.message?.slice(0, 60) || "New message",
    sub: "Tenant message",
    href: "/properties/communication",
  }));

  const seenEmailIds = new Set<string>();
  const newEmails: AwaySummaryItem[] = (
    (emailPickRows ?? []) as EmailPicksRow[]
  )
    .flatMap((row) => row.picks ?? [])
    .filter((pick) => {
      if (seenEmailIds.has(pick.emailId)) return false;
      seenEmailIds.add(pick.emailId);
      return true;
    })
    .slice(0, 10)
    .map((pick) => ({
      label: pick.subject || "No subject",
      sub: pick.fromName || pick.fromEmail || undefined,
      href: "/email",
    }));

  const hasUpdates =
    newLeads.length > 0 ||
    overdueTasks.length > 0 ||
    newMessages.length > 0 ||
    newEmails.length > 0;

  return {
    lastSyncedAt: new Date().toISOString(),
    hasUpdates,
    newEmails,
    newLeads,
    overdueTasks,
    newMessages,
  };
}
