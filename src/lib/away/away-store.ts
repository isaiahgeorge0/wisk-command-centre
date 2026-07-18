import type {
  AwaySummary,
  AwaySummaryItem,
} from "@/lib/away/build-away-summary";
import { createAdminClient } from "@/lib/supabase/admin";

type AwaySummaryRow = {
  last_synced_at: string;
  has_updates: boolean;
  new_emails: AwaySummaryItem[] | null;
  new_leads: AwaySummaryItem[] | null;
  overdue_tasks: AwaySummaryItem[] | null;
  new_messages: AwaySummaryItem[] | null;
};

export async function storeAwaySummary(
  userId: string,
  summary: AwaySummary
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("away_summaries").upsert(
    {
      user_id: userId,
      last_synced_at: summary.lastSyncedAt,
      new_emails: summary.newEmails,
      new_leads: summary.newLeads,
      overdue_tasks: summary.overdueTasks,
      new_messages: summary.newMessages,
      has_updates: summary.hasUpdates,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(`Could not store away summary: ${error.message}`);
  }
}

export async function getAwaySummary(userId: string): Promise<{
  summary: AwaySummary | null;
  lastSyncedAt: Date | null;
}> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("away_summaries")
    .select(
      "last_synced_at, has_updates, new_emails, new_leads, overdue_tasks, new_messages"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[away-summary] cache read failed:", error.message);
    }
    return { summary: null, lastSyncedAt: null };
  }

  const row = data as AwaySummaryRow;
  return {
    summary: {
      lastSyncedAt: row.last_synced_at,
      hasUpdates: row.has_updates,
      newEmails: row.new_emails ?? [],
      newLeads: row.new_leads ?? [],
      overdueTasks: row.overdue_tasks ?? [],
      newMessages: row.new_messages ?? [],
    },
    lastSyncedAt: new Date(row.last_synced_at),
  };
}
