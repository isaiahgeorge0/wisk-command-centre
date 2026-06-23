import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { hasPackageAccess } from "@/lib/billing/access";
import { logUsage } from "@/lib/ai/usage-logger";
import {
  buildPropertyPortfolioContext,
  generatePropertyInsights,
  startOfMonthUtc,
  startOfWeekUtc,
} from "@/lib/properties/insights-generator";
import type { PropertyInsightType } from "@/lib/properties/types";
import { createAdminClient } from "@/lib/supabase/admin";

async function generateForUser(
  userId: string,
  force = false
): Promise<{ generated: boolean; skipped?: string }> {
  const supabase = createAdminClient();

  const hasAccess = await hasPackageAccess(userId, "properties", supabase);
  if (!hasAccess) {
    return { generated: false, skipped: "no subscription" };
  }

  const context = await buildPropertyPortfolioContext(userId, supabase);
  if (context.propertyCount === 0) {
    return { generated: false, skipped: "no properties" };
  }

  const insightType: PropertyInsightType =
    context.propertyCount >= 3 ? "weekly_digest" : "monthly_digest";

  const now = new Date();
  const periodStart =
    insightType === "weekly_digest"
      ? startOfWeekUtc(now).toISOString()
      : startOfMonthUtc(now).toISOString();

  if (!force) {
    const { data: existing } = await supabase
      .from("property_insights")
      .select("id")
      .eq("user_id", userId)
      .eq("insight_type", insightType)
      .gte("generated_at", periodStart)
      .limit(1);

    if (existing?.length) {
      return { generated: false, skipped: "already generated this period" };
    }
  }

  const { content, inputTokens, outputTokens } =
    await generatePropertyInsights(context);

  const { error } = await supabase.from("property_insights").insert({
    user_id: userId,
    insight_type: insightType,
    content,
    period_start: context.periodStart,
    period_end: context.periodEnd,
  });

  if (error) {
    throw new Error(error.message);
  }

  await logUsage(userId, "property_insights", inputTokens, outputTokens);
  return { generated: true };
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.PROPERTY_ALERTS_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: { userId?: string; force?: boolean } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as { userId?: string; force?: boolean };
  } catch {
    // empty body is fine for bulk cron
  }

  const supabase = createAdminClient();
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  if (body.userId) {
    try {
      const result = await generateForUser(body.userId, body.force === true);
      if (result.generated) generated++;
      else skipped++;
    } catch (err) {
      Sentry.captureException(err);
      failed++;
    }
    return NextResponse.json({ success: true, generated, skipped, failed });
  }

  const { data: subscriptions } = await supabase
    .from("user_subscriptions")
    .select("user_id, package, status")
    .in("status", ["active", "trialing"]);

  const userIds = [
    ...new Set(
      (subscriptions ?? [])
        .filter(
          (s) =>
            s.package === "properties" ||
            s.package === "max"
        )
        .map((s) => s.user_id as string)
    ),
  ];

  for (const userId of userIds) {
    try {
      const result = await generateForUser(userId);
      if (result.generated) generated++;
      else skipped++;
    } catch (err) {
      Sentry.captureException(err);
      console.error(
        `generate-insights: failed for user ${userId}:`,
        err instanceof Error ? err.message : String(err)
      );
      failed++;
    }
  }

  console.log(
    `generate-insights: complete — ${generated} generated, ${skipped} skipped, ${failed} failed`
  );

  return NextResponse.json({ success: true, generated, skipped, failed });
}
