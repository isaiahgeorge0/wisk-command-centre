import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/lib/auth/errors";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getAwaySummary, storeAwaySummary } from "@/lib/away/away-store";
import { buildAwaySummary } from "@/lib/away/build-away-summary";
import { hasPackageAccess } from "@/lib/billing/access";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await getScopedSupabase();

    const hasAccess = await hasPackageAccess(userId, "ai_pro", supabase);
    if (!hasAccess) {
      return NextResponse.json({ error: "AI Pro required" }, { status: 403 });
    }

    const { lastSyncedAt } = await getAwaySummary(userId);
    if (
      lastSyncedAt &&
      Date.now() - lastSyncedAt.getTime() < FIFTEEN_MINUTES
    ) {
      return NextResponse.json({ skipped: true });
    }

    let requestedSinceAt: string | null = null;
    try {
      const body = (await request.json()) as { sinceAt?: unknown };
      requestedSinceAt =
        typeof body.sinceAt === "string" ? body.sinceAt : null;
    } catch {
      // A body is optional; fall back to the stored activity timestamp.
    }

    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("last_active_at")
      .eq("user_id", userId)
      .maybeSingle();

    const candidate = requestedSinceAt ?? preferences?.last_active_at ?? null;
    const parsedSinceAt = candidate ? new Date(candidate) : null;
    const sinceAt =
      parsedSinceAt && Number.isFinite(parsedSinceAt.getTime())
        ? parsedSinceAt
        : new Date(Date.now() - ONE_DAY);

    const summary = await buildAwaySummary(userId, sinceAt);
    await storeAwaySummary(userId, summary);

    return NextResponse.json({
      synced: true,
      hasUpdates: summary.hasUpdates,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[away-sync] user sync failed:", error);
    return NextResponse.json({ error: "Could not sync updates" }, { status: 500 });
  }
}
