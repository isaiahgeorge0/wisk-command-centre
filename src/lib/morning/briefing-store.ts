import type { MorningBriefingContent } from "@/lib/morning/briefing-generator";
import {
  getLocalDateKey,
  normaliseTimezone,
} from "@/lib/morning/timezone";
import { createAdminClient } from "@/lib/supabase/admin";

const LOCAL_ORIGIN_RE =
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?/i;

/**
 * Rewrite absolute loopback origins in stored briefing JSON to relative paths
 * (or strip the origin) so in-app cards never point at localhost.
 */
export function sanitizeBriefingContent(
  content: MorningBriefingContent
): MorningBriefingContent {
  const scrub = (value: string): string => {
    if (!LOCAL_ORIGIN_RE.test(value) && !/localhost|127\.0\.0\.1/i.test(value)) {
      return value;
    }
    try {
      if (/^https?:\/\//i.test(value)) {
        const url = new URL(value);
        return `${url.pathname}${url.search}${url.hash}` || "/";
      }
    } catch {
      // fall through
    }
    return value.replace(LOCAL_ORIGIN_RE, "");
  };

  return {
    ...content,
    greeting: scrub(content.greeting),
    date: scrub(content.date),
    teaser: content.teaser != null ? scrub(content.teaser) : content.teaser,
    insight: content.insight != null ? scrub(content.insight) : content.insight,
    headline: scrub(content.headline),
    summary: content.summary != null ? scrub(content.summary) : content.summary,
    encouragement: scrub(content.encouragement ?? ""),
    focuses: (content.focuses ?? []).map((focus) => ({
      ...focus,
      item: scrub(focus.item),
      href: scrub(focus.href) || "/",
      category: focus.category,
    })),
  };
}

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
  const safeContent = sanitizeBriefingContent(content);
  const { error } = await supabase.from("morning_briefings").upsert(
    {
      user_id: userId,
      content: safeContent as unknown as Record<string, unknown>,
      generated_at: safeContent.generatedAt,
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
    ? sanitizeBriefingContent(data.content as unknown as MorningBriefingContent)
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
