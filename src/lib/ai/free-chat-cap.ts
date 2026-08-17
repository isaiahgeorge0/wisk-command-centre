import { createAdminClient } from "@/lib/supabase/admin";
import { WINSTON_FREE_DAILY_MESSAGE_CAP } from "@/lib/ai/constants";
import { getLocalDateKey } from "@/lib/morning/timezone";

export async function countChatExchangesOnLocalDay(
  userId: string,
  timezone: string | null | undefined
): Promise<number> {
  const todayKey = getLocalDateKey(timezone ?? "Europe/London");
  const windowStart = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_usage_log")
    .select("created_at")
    .eq("user_id", userId)
    .eq("feature", "chat")
    .gte("created_at", windowStart);

  return (data ?? []).filter(
    (row) => getLocalDateKey(timezone ?? "Europe/London", new Date(row.created_at)) === todayKey
  ).length;
}

export function freeDailyCapReached(used: number): boolean {
  return used >= WINSTON_FREE_DAILY_MESSAGE_CAP;
}
