import { NextResponse } from "next/server";
import { z } from "zod";

import { UnauthorizedError } from "@/lib/auth/errors";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";
import { generateEmailDraft } from "@/lib/email/generate-draft";
import type { DraftTone, WinstonDraft } from "@/lib/email/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  emailId: z.string().min(1),
  integrationId: z.string().uuid(),
  provider: z.enum(["gmail", "outlook"]),
  tone: z.enum(["professional", "friendly", "casual"]),
});

export async function POST(request: Request) {
  let supabase;
  let userId: string;

  try {
    ({ supabase, userId } = await getScopedSupabase());
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  const hasAiPro = await hasPackageAccess(userId, "ai_pro", supabase);
  if (!hasAiPro) {
    return NextResponse.json(
      { error: "AI Pro subscription required" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { emailId, integrationId, provider, tone } = parsed.data;

  const draft = await generateEmailDraft({
    userId,
    supabase,
    emailId,
    integrationId,
    provider,
    tone: tone as DraftTone,
  });

  if (!draft) {
    return NextResponse.json(
      { error: "Could not generate draft" },
      { status: 500 }
    );
  }

  return NextResponse.json({ draft } satisfies { draft: WinstonDraft });
}
