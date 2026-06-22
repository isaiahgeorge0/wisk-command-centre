import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/lib/auth/errors";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";
import { fetchGmailMessage } from "@/lib/email/gmail";
import { fetchOutlookMessage } from "@/lib/email/outlook";
import {
  getValidEmailTokenForIntegration,
  getValidGmailToken,
  getValidOutlookToken,
} from "@/lib/email/token-manager";
import type { EmailProvider } from "@/lib/email/types";

export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=300, s-maxage=300",
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
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

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") as EmailProvider | null;
  const integrationId = searchParams.get("integrationId");

  if (provider !== "gmail" && provider !== "outlook") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const token = integrationId
    ? await getValidEmailTokenForIntegration(userId, integrationId)
    : provider === "gmail"
      ? await getValidGmailToken(userId)
      : await getValidOutlookToken(userId);

  if (!token) {
    return NextResponse.json(
      { error: "Email provider not connected" },
      { status: 404 }
    );
  }

  const email =
    provider === "gmail"
      ? await fetchGmailMessage(token, id)
      : await fetchOutlookMessage(token, id);

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  return NextResponse.json(email, { headers: CACHE_HEADERS });
}
