import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { getAuthContext } from "@/lib/auth/get-auth-context";
import { hasPackageAccess } from "@/lib/billing/access";
import { proposeContentFromCompetitorSignal } from "@/lib/research/propose-content-from-signal";
import { researchCheckToSignal } from "@/lib/research/monitoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  ResearchCompetitor,
  ResearchCompetitorCheck,
} from "@/lib/research/types";

const bodySchema = z.object({
  checkId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsedBody = bodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { user } = await getAuthContext();
    const userId = user.id;
    const admin = createAdminClient();
    const canAccessResearchPro = await hasPackageAccess(
      userId,
      "research_pro",
      admin
    );
    if (!canAccessResearchPro) {
      return NextResponse.json(
        {
          error:
            "Proposing content from research findings needs WISK Research Pro.",
        },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const { data: check, error: checkError } = await supabase
      .from("research_competitor_checks")
      .select("*")
      .eq("id", parsedBody.data.checkId)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) {
      console.error("propose-content check fetch:", checkError);
      return NextResponse.json(
        { error: "Could not load this competitor signal" },
        { status: 500 }
      );
    }
    if (!check) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    const checkRow = check as ResearchCompetitorCheck;
    if (!checkRow.has_meaningful_change) {
      return NextResponse.json({
        found: false,
        message: "This check has no meaningful change to propose from.",
      });
    }

    const { data: competitor, error: competitorError } = await supabase
      .from("research_competitors")
      .select("*")
      .eq("id", checkRow.competitor_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (competitorError || !competitor) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    const signal = researchCheckToSignal(
      competitor as ResearchCompetitor,
      checkRow
    );
    if (!signal) {
      return NextResponse.json({
        found: false,
        message: "This check has no meaningful change to propose from.",
      });
    }

    Sentry.setUser({ id: userId });
    const result = await proposeContentFromCompetitorSignal({ userId, signal });

    if (!result.found) {
      return NextResponse.json({
        found: false,
        message: result.message,
      });
    }

    return NextResponse.json({
      found: true,
      message: result.summary,
      proposal: result.proposal,
    });
  } catch (error) {
    console.error("propose-content-from-signal error:", error);
    Sentry.captureException(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
