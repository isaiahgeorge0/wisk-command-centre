import { NextResponse } from "next/server";

import { sendMorningBriefingEmail } from "@/lib/morning/briefing-email";
import type { MorningBriefingContent } from "@/lib/morning/briefing-generator";
import { markBriefingSent } from "@/lib/morning/briefing-store";
import {
  getLocalDateKey,
  getLocalTime,
  normaliseTimezone,
} from "@/lib/morning/timezone";
import { createAdminClient } from "@/lib/supabase/admin";

function isAuthorised(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return [process.env.AI_DIGEST_SECRET, process.env.CRON_SECRET]
    .filter((secret): secret is string => Boolean(secret))
    .some((secret) => auth === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .in("package", ["ai_pro", "max"])
    .in("status", ["active", "trialing"]);

  if (subscriptionError) {
    return NextResponse.json(
      { error: "Could not load subscribers" },
      { status: 500 }
    );
  }

  const userIds = [
    ...new Set((subscriptions ?? []).map((subscription) => subscription.user_id)),
  ];
  if (userIds.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0 });
  }

  const recentCutoff = new Date(now.getTime() - 36 * 60 * 60 * 1000);
  const { data: briefings, error: briefingError } = await supabase
    .from("morning_briefings")
    .select("user_id, content, briefing_date")
    .in("user_id", userIds)
    .is("sent_at", null)
    .gte("generated_at", recentCutoff.toISOString());

  if (briefingError) {
    return NextResponse.json(
      { error: "Could not load briefings" },
      { status: 500 }
    );
  }

  const briefingUserIds = [
    ...new Set((briefings ?? []).map((briefing) => briefing.user_id)),
  ];
  if (briefingUserIds.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0 });
  }

  const [{ data: preferences }, { data: users }] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("user_id, timezone, display_name")
      .in("user_id", briefingUserIds),
    supabase
      .from("users")
      .select("id, email, name")
      .in("id", briefingUserIds),
  ]);
  const preferencesByUser = new Map(
    (preferences ?? []).map((preference) => [preference.user_id, preference])
  );
  const usersById = new Map((users ?? []).map((user) => [user.id, user]));

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const briefing of briefings ?? []) {
    try {
      const preference = preferencesByUser.get(briefing.user_id);
      const user = usersById.get(briefing.user_id);
      const timezone = normaliseTimezone(preference?.timezone);
      const { hour, minute } = getLocalTime(timezone, now);
      const isSendWindow = hour === 7 && minute >= 30 && minute <= 40;
      const isTodaysBriefing =
        briefing.briefing_date === getLocalDateKey(timezone, now);

      if (!user?.email || !isSendWindow || !isTodaysBriefing) {
        skipped += 1;
        continue;
      }

      const displayName =
        preference?.display_name?.trim() || user.name?.trim() || "there";
      await sendMorningBriefingEmail({
        to: user.email,
        displayName,
        content: briefing.content as unknown as MorningBriefingContent,
      });
      await markBriefingSent(briefing.user_id, briefing.briefing_date);
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `morning-briefing/send: failed for ${briefing.user_id}`,
        error
      );
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
