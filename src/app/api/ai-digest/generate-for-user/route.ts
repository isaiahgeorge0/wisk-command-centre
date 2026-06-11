import { NextResponse } from "next/server";

import { buildUserContext } from "@/lib/ai/context-builder";
import { generateWeeklyDigest } from "@/lib/ai/digest-generator";
import { storeDigest } from "@/lib/ai/digest-store";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.AI_DIGEST_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  const body = (await request.json()) as { userId?: string };
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // ── Generate digest ────────────────────────────────────────────────────────
  try {
    const supabase = createAdminClient();
    const context = await buildUserContext(userId, supabase);
    const digest = await generateWeeklyDigest(context);
    await storeDigest(userId, digest);

    console.log(`ai-digest/generate-for-user: ✓ user ${userId}`);
    return NextResponse.json({ success: true, userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`ai-digest/generate-for-user: ✗ user ${userId}:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
