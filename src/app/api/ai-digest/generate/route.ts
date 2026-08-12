import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { buildUserContext } from "@/lib/ai/context-builder";
import { generateWeeklyDigest } from "@/lib/ai/digest-generator";
import { storeDigest } from "@/lib/ai/digest-store";
import { logUsage } from "@/lib/ai/usage-logger";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.AI_DIGEST_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // ── Entitled user IDs only (active AI packages + admin ai_access override) ─
  const supabase = createAdminClient();

  const [{ data: subscriptions, error: subscriptionsError }, { data: overrides }] =
    await Promise.all([
      supabase
        .from("user_subscriptions")
        .select("user_id")
        .in("package", ["ai", "ai_pro", "max"])
        .in("status", ["active", "trialing"]),
      supabase
        .from("user_preferences")
        .select("user_id")
        .eq("ai_access", true),
    ]);

  if (subscriptionsError) {
    console.error(
      "ai-digest/generate: failed to fetch subscriptions:",
      subscriptionsError
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch entitled users" },
      { status: 500 }
    );
  }

  const userIds = [
    ...new Set([
      ...(subscriptions ?? []).map((row) => row.user_id),
      ...(overrides ?? []).map((row) => row.user_id),
    ]),
  ];

  if (userIds.length === 0) {
    return NextResponse.json({ success: true, generated: 0, failed: 0, skipped: 0 });
  }

  // ── Generate per entitled user ───────────────────────────────────────────
  let generated = 0;
  let failed = 0;

  for (const userId of userIds) {
    try {
      const context = await buildUserContext(userId, supabase);
      const { digest, inputTokens, outputTokens } =
        await generateWeeklyDigest(context);
      await storeDigest(userId, digest);
      await logUsage(userId, "digest", inputTokens, outputTokens);
      console.log(`ai-digest/generate: ✓ user ${userId}`);
      generated++;
    } catch (err) {
      Sentry.captureException(err);
      console.error(
        `ai-digest/generate: ✗ user ${userId}:`,
        err instanceof Error ? err.message : String(err)
      );
      failed++;
    }
  }

  console.log(
    `ai-digest/generate: complete — ${generated} generated, ${failed} failed`
  );

  return NextResponse.json({ success: true, generated, failed });
}
