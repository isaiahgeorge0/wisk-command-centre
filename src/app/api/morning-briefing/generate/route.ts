import { NextResponse } from "next/server";

import { buildBriefingContext } from "@/lib/morning/briefing-context";
import { generateMorningBriefing } from "@/lib/morning/briefing-generator";
import { isMorningBriefingFrequentCronEnabled } from "@/lib/morning/cron";
import { normalizeGender } from "@/lib/morning/greeting";
import {
  getTodaysBriefing,
  storeMorningBriefing,
} from "@/lib/morning/briefing-store";
import { assertMorningBriefingCronAllowed } from "@/lib/morning/runtime-guard";
import {
  getLocalTime,
  normaliseTimezone,
} from "@/lib/morning/timezone";
import { createAdminClient } from "@/lib/supabase/admin";

const PAID_AI_PACKAGES = ["ai", "ai_pro", "max"] as const;

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
    assertMorningBriefingCronAllowed("generate");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    console.error("[morning-briefing/generate]", message);
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const frequentCron = isMorningBriefingFrequentCronEnabled();

  const [
    { data: users, error: usersError },
    { data: preferences, error: prefsError },
    { data: subscriptions, error: subscriptionError },
  ] = await Promise.all([
    supabase.from("users").select("id, name"),
    supabase
      .from("user_preferences")
      .select(
        "user_id, timezone, display_name, gender, greeting_term, ai_access"
      ),
    supabase
      .from("user_subscriptions")
      .select("user_id, package")
      .in("package", [...PAID_AI_PACKAGES])
      .in("status", ["active", "trialing"]),
  ]);

  if (usersError) {
    console.error("[morning-briefing/generate] users query failed:", {
      message: usersError.message,
    });
    return NextResponse.json(
      { error: "Could not load users" },
      { status: 500 }
    );
  }
  if (prefsError) {
    console.error("[morning-briefing/generate] preferences query failed:", {
      message: prefsError.message,
    });
    return NextResponse.json(
      { error: "Could not load preferences" },
      { status: 500 }
    );
  }
  if (subscriptionError) {
    console.error("[morning-briefing/generate] subscription query failed:", {
      message: subscriptionError.message,
    });
    return NextResponse.json(
      { error: "Could not load subscribers" },
      { status: 500 }
    );
  }

  const userIds = (users ?? []).map((user) => user.id);
  const eligible = userIds.length;

  if (eligible === 0) {
    const summary = {
      eligible: 0,
      generated: 0,
      skipped: 0,
      failed: 0,
      freeGenerated: 0,
      paidGenerated: 0,
      frequentCron,
    };
    console.info(
      `[morning-briefing/generate] run complete eligible=0 generated=0 skipped=0 failed=0 frequentCron=${frequentCron}`
    );
    return NextResponse.json(summary);
  }

  const preferencesByUser = new Map(
    (preferences ?? []).map((preference) => [preference.user_id, preference])
  );
  const usersById = new Map((users ?? []).map((user) => [user.id, user]));
  const paidUserIds = new Set(
    (subscriptions ?? []).map((subscription) => subscription.user_id)
  );

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  let freeGenerated = 0;
  let paidGenerated = 0;

  for (const userId of userIds) {
    try {
      const preference = preferencesByUser.get(userId);
      const timezone = normaliseTimezone(preference?.timezone);

      // Pro */5 cadence: only act in each user's local generate window.
      // Hobby once-daily: cron fire is the trigger — skip the window check.
      if (frequentCron) {
        const { hour, minute } = getLocalTime(timezone, now);
        const isGenerateWindow = hour === 7 && minute >= 25 && minute <= 35;
        if (!isGenerateWindow) {
          skipped += 1;
          continue;
        }
      }

      const existing = await getTodaysBriefing(userId, timezone, now);
      if (existing) {
        skipped += 1;
        continue;
      }

      const isPaid =
        preference?.ai_access === true || paidUserIds.has(userId);
      const tier = isPaid ? "paid" : "free";

      const displayName =
        preference?.display_name?.trim() ||
        usersById.get(userId)?.name?.trim() ||
        "there";
      const context = await buildBriefingContext(userId, timezone);
      const content = await generateMorningBriefing({
        userId,
        displayName,
        gender: normalizeGender(preference?.gender),
        greetingTerm: preference?.greeting_term ?? null,
        context,
        timezone,
        tier,
      });
      await storeMorningBriefing(userId, content, timezone, now);
      generated += 1;
      if (tier === "free") freeGenerated += 1;
      else paidGenerated += 1;
    } catch (error) {
      failed += 1;
      console.error(`[morning-briefing/generate] failed for ${userId}`, error);
    }
  }

  const summary = {
    eligible,
    generated,
    skipped,
    failed,
    freeGenerated,
    paidGenerated,
    frequentCron,
  };
  console.info(
    `[morning-briefing/generate] run complete eligible=${eligible} generated=${generated} free=${freeGenerated} paid=${paidGenerated} skipped=${skipped} failed=${failed} frequentCron=${frequentCron}`
  );
  return NextResponse.json(summary);
}
