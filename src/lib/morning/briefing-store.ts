import type { MorningBriefingContent } from "@/lib/morning/briefing-generator";
import {
  getLocalDateKey,
  normaliseTimezone,
} from "@/lib/morning/timezone";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveTimezone(
  userId: string,
  suppliedTimezone?: string
): Promise<string> {
  if (suppliedTimezone) return normaliseTimezone(suppliedTimezone);

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();

  return normaliseTimezone(data?.timezone);
}

export async function storeMorningBriefing(
  userId: string,
  content: MorningBriefingContent,
  timezone?: string,
  now = new Date()
): Promise<void> {
  const supabase = createAdminClient();
  const userTimezone = await resolveTimezone(userId, timezone);
  const briefingDate = getLocalDateKey(userTimezone, now);
  const { error } = await supabase.from("morning_briefings").upsert(
    {
      user_id: userId,
      content: content as unknown as Record<string, unknown>,
      generated_at: content.generatedAt,
      briefing_date: briefingDate,
    },
    { onConflict: "user_id,briefing_date" }
  );

  if (error) {
    throw new Error(`Could not store morning briefing: ${error.message}`);
  }
}

export async function getTodaysBriefing(
  userId: string,
  timezone?: string,
  now = new Date()
): Promise<MorningBriefingContent | null> {
  const supabase = createAdminClient();
  const userTimezone = await resolveTimezone(userId, timezone);
  const briefingDate = getLocalDateKey(userTimezone, now);
  const { data, error } = await supabase
    .from("morning_briefings")
    .select("content")
    .eq("user_id", userId)
    .eq("briefing_date", briefingDate)
    .maybeSingle();

  if (error) {
    console.error("[morning-briefing] cache read failed:", error.message);
    return null;
  }

  return data
    ? (data.content as unknown as MorningBriefingContent)
    : null;
}

export async function markBriefingSent(
  userId: string,
  briefingDate: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("morning_briefings")
    .update({ sent_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("briefing_date", briefingDate)
    .is("sent_at", null);

  if (error) {
    throw new Error(`Could not mark morning briefing sent: ${error.message}`);
  }
}
