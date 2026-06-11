import { NextResponse } from "next/server";

import { buildUserContext } from "@/lib/ai/context-builder";
import { generateWeeklyDigest } from "@/lib/ai/digest-generator";
import { storeDigest } from "@/lib/ai/digest-store";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.AI_DIGEST_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // ── Fetch all user IDs ────────────────────────────────────────────────────
  const supabase = createAdminClient();

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id");

  if (usersError || !users) {
    console.error("ai-digest/generate: failed to fetch users:", usersError);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }

  // ── Generate per user ────────────────────────────────────────────────────
  let generated = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const context = await buildUserContext(user.id, supabase);
      const digest = await generateWeeklyDigest(context);
      await storeDigest(user.id, digest);
      console.log(`ai-digest/generate: ✓ user ${user.id}`);
      generated++;
    } catch (err) {
      console.error(
        `ai-digest/generate: ✗ user ${user.id}:`,
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
