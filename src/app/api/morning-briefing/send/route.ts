import { NextResponse } from "next/server";

import { sendMorningBriefingEmail } from "@/lib/morning/briefing-email";
import type { MorningBriefingContent } from "@/lib/morning/briefing-generator";
import { isMorningBriefingFrequentCronEnabled } from "@/lib/morning/cron";
import { markBriefingSent } from "@/lib/morning/briefing-store";
import { assertMorningBriefingCronAllowed } from "@/lib/morning/runtime-guard";
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

  try {
    assertMorningBriefingCronAllowed("send");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    console.error("[morning-briefing/send]", message);
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const frequentCron = isMorningBriefingFrequentCronEnabled();

  const recentCutoff = new Date(now.getTime() - 36 * 60 * 60 * 1000);
  const { data: briefings, error: briefingError } = await supabase
    .from("morning_briefings")
    .select("user_id, content, briefing_date")
    .is("sent_at", null)
    .gte("generated_at", recentCutoff.toISOString());

  if (briefingError) {
    console.error("[morning-briefing/send] briefing query failed:", {
      message: briefingError.message,
    });
    return NextResponse.json(
      { error: "Could not load briefings" },
      { status: 500 }
    );
  }

  const eligible = (briefings ?? []).length;
  if (eligible === 0) {
    const summary = {
      eligible: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      frequentCron,
    };
    console.info(
      `[morning-briefing/send] run complete eligible=0 sent=0 skipped=0 failed=0 frequentCron=${frequentCron}`
    );
    return NextResponse.json(summary);
  }

  const briefingUserIds = [
    ...new Set((briefings ?? []).map((briefing) => briefing.user_id)),
  ];

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
      const isTodaysBriefing =
        briefing.briefing_date === getLocalDateKey(timezone, now);

      // Pro */5 cadence: only send inside each user's local send window.
      // Hobby once-daily: cron fire is the trigger — skip the window check.
      let isSendWindow = true;
      if (frequentCron) {
        const { hour, minute } = getLocalTime(timezone, now);
        isSendWindow = hour === 7 && minute >= 30 && minute <= 40;
      }

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
        `[morning-briefing/send] failed for ${briefing.user_id}`,
        error
      );
    }
  }

  const summary = { eligible, sent, skipped, failed, frequentCron };
  console.info(
    `[morning-briefing/send] run complete eligible=${eligible} sent=${sent} skipped=${skipped} failed=${failed} frequentCron=${frequentCron}`
  );
  return NextResponse.json(summary);
}
