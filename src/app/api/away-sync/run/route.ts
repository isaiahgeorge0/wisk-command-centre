import { NextResponse } from "next/server";

import { getAwaySummary, storeAwaySummary } from "@/lib/away/away-store";
import { buildAwaySummary } from "@/lib/away/build-away-summary";
import { createAdminClient } from "@/lib/supabase/admin";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

function isAuthorised(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const validSecrets = [
    process.env.AI_DIGEST_SECRET,
    process.env.CRON_SECRET,
  ].filter((secret): secret is string => Boolean(secret));

  return validSecrets.some((secret) => auth === `Bearer ${secret}`);
}

async function runAwaySync(request: Request) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: subscriptions, error } = await supabase
    .from("user_subscriptions")
    .select("user_id, package")
    .in("package", ["ai_pro", "max"])
    .in("status", ["active", "trialing"]);

  if (error) {
    console.error("[away-sync] subscription query failed:", error.message);
    return NextResponse.json({ error: "Could not load subscribers" }, { status: 500 });
  }

  const userIds = [
    ...new Set((subscriptions ?? []).map((subscription) => subscription.user_id)),
  ];
  if (userIds.length === 0) {
    return NextResponse.json({ synced: 0, skipped: 0 });
  }

  let synced = 0;
  let skipped = 0;

  for (const userId of userIds) {
    try {
      const { lastSyncedAt } = await getAwaySummary(userId);
      if (
        lastSyncedAt &&
        Date.now() - lastSyncedAt.getTime() < FIFTEEN_MINUTES
      ) {
        skipped += 1;
        continue;
      }

      const { data: preferences } = await supabase
        .from("user_preferences")
        .select("last_active_at")
        .eq("user_id", userId)
        .maybeSingle();

      const parsedLastActive = preferences?.last_active_at
        ? new Date(preferences.last_active_at)
        : null;
      const sinceAt =
        parsedLastActive && Number.isFinite(parsedLastActive.getTime())
          ? parsedLastActive
          : new Date(Date.now() - ONE_DAY);

      const summary = await buildAwaySummary(userId, sinceAt);
      await storeAwaySummary(userId, summary);
      synced += 1;
    } catch (syncError) {
      console.error(`away-sync: failed for ${userId}`, syncError);
    }
  }

  return NextResponse.json({ synced, skipped });
}

export async function GET(request: Request) {
  return runAwaySync(request);
}

export async function POST(request: Request) {
  return runAwaySync(request);
}
