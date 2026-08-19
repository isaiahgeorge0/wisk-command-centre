"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { toSafeActionError } from "@/lib/errors/to-safe-action-error";
import type { ActionResult } from "@/lib/admin/types";

export type MorningBriefingHealthReport = {
  generatedAtCutoffISO: string;
  lastSentAtISO: string | null;
  recentDeliveredCount: number;
  recentPendingCount: number;
  oldestPendingGeneratedAtISO: string | null;
};

const RECENT_CUTOFF_HOURS = 36;

export async function getMorningBriefingHealthReport(): Promise<
  ActionResult<MorningBriefingHealthReport>
> {
  await requireAdmin();

  try {
    const admin = createAdminClient();
    const now = new Date();
    const cutoff = new Date(now.getTime() - RECENT_CUTOFF_HOURS * 60 * 60 * 1000);

    const [
      lastSentRes,
      deliveredCountRes,
      pendingCountRes,
      oldestPendingRes,
    ] = await Promise.all([
      admin
        .from("morning_briefings")
        .select("sent_at")
        .not("sent_at", "is", null)
        .order("sent_at", { ascending: false })
        .limit(1),
      admin
        .from("morning_briefings")
        .select("id", { count: "exact", head: true })
        .not("sent_at", "is", null)
        .gte("generated_at", cutoff.toISOString()),
      admin
        .from("morning_briefings")
        .select("id", { count: "exact", head: true })
        .is("sent_at", null)
        .gte("generated_at", cutoff.toISOString()),
      admin
        .from("morning_briefings")
        .select("generated_at")
        .is("sent_at", null)
        .order("generated_at", { ascending: true })
        .limit(1)
        .gte("generated_at", cutoff.toISOString()),
    ]);

    if (lastSentRes.error) {
      return {
        success: false,
        error: toSafeActionError(
          lastSentRes.error,
          "Could not load the last morning briefing send time."
        ),
      };
    }

    if (deliveredCountRes.error) {
      return {
        success: false,
        error: toSafeActionError(
          deliveredCountRes.error,
          "Could not load recent delivered morning briefing count."
        ),
      };
    }

    if (pendingCountRes.error) {
      return {
        success: false,
        error: toSafeActionError(
          pendingCountRes.error,
          "Could not load recent pending morning briefing count."
        ),
      };
    }

    if (oldestPendingRes.error) {
      return {
        success: false,
        error: toSafeActionError(
          oldestPendingRes.error,
          "Could not load the oldest pending morning briefing timestamp."
        ),
      };
    }

    const lastSentAtISO = lastSentRes.data?.[0]?.sent_at ?? null;
    const recentDeliveredCount = deliveredCountRes.count ?? 0;
    const recentPendingCount = pendingCountRes.count ?? 0;
    const oldestPendingGeneratedAtISO =
      oldestPendingRes.data?.[0]?.generated_at ?? null;

    return {
      success: true,
      data: {
        generatedAtCutoffISO: cutoff.toISOString(),
        lastSentAtISO,
        recentDeliveredCount,
        recentPendingCount,
        oldestPendingGeneratedAtISO,
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: toSafeActionError(
        error,
        "Could not generate morning briefing health report."
      ),
    };
  }
}

