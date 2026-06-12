import { NextResponse } from "next/server";

import { buildUserContext } from "@/lib/ai/context-builder";
import { generateWeeklyDigest } from "@/lib/ai/digest-generator";
import { storeDigest } from "@/lib/ai/digest-store";
import { logUsage } from "@/lib/ai/usage-logger";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.AI_DIGEST_SECRET;

    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    let body: { userId?: string };
    try {
      body = (await request.json()) as { userId?: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { userId } = body;
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // ── Generate digest ──────────────────────────────────────────────────────
    const supabase = createAdminClient();
    const context = await buildUserContext(userId, supabase);
    const { digest, inputTokens, outputTokens } = await generateWeeklyDigest(context);
    await storeDigest(userId, digest);
    await logUsage(userId, "digest", inputTokens, outputTokens);

    console.log(`ai-digest/generate-for-user: ✓ user ${userId}`);
    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error("generate-for-user error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
