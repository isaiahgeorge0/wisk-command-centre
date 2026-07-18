import { NextResponse } from "next/server";

import { buildBriefingContext } from "@/lib/morning/briefing-context";
import { generateMorningBriefing } from "@/lib/morning/briefing-generator";
import {
  getTodaysBriefing,
  storeMorningBriefing,
} from "@/lib/morning/briefing-store";
import {
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
    return NextResponse.json({ generated: 0, skipped: 0 });
  }

  const [{ data: preferences }, { data: users }] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("user_id, timezone, display_name")
      .in("user_id", userIds),
    supabase.from("users").select("id, name").in("id", userIds),
  ]);
  const preferencesByUser = new Map(
    (preferences ?? []).map((preference) => [preference.user_id, preference])
  );
  const usersById = new Map((users ?? []).map((user) => [user.id, user]));

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const userId of userIds) {
    try {
      const preference = preferencesByUser.get(userId);
      const timezone = normaliseTimezone(preference?.timezone);
      const { hour, minute } = getLocalTime(timezone, now);
      const isGenerateWindow =
        hour === 7 && minute >= 25 && minute <= 35;

      if (!isGenerateWindow) {
        skipped += 1;
        continue;
      }

      const existing = await getTodaysBriefing(userId, timezone, now);
      if (existing) {
        skipped += 1;
        continue;
      }

      const displayName =
        preference?.display_name?.trim() ||
        usersById.get(userId)?.name?.trim() ||
        "there";
      const context = await buildBriefingContext(userId, timezone);
      const content = await generateMorningBriefing(
        userId,
        displayName,
        context,
        timezone
      );
      await storeMorningBriefing(userId, content, timezone, now);
      generated += 1;
    } catch (error) {
      failed += 1;
      console.error(`morning-briefing/generate: failed for ${userId}`, error);
    }
  }

  return NextResponse.json({ generated, skipped, failed });
}
