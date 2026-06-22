import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/lib/auth/errors";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";

export const runtime = "nodejs";

const OUTLOOK_SCOPES = [
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/User.Read",
  "offline_access",
].join(" ");

export async function GET() {
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

  const { count } = await supabase
    .from("user_integrations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("provider", "outlook");

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: "Maximum of 3 Outlook accounts allowed" },
      { status: 400 }
    );
  }

  const clientId = process.env.AZURE_CLIENT_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!clientId || !siteUrl) {
    return NextResponse.json(
      { error: "Microsoft OAuth is not configured" },
      { status: 500 }
    );
  }

  const state = randomUUID();
  const redirectUri = `${siteUrl}/auth/microsoft/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OUTLOOK_SCOPES,
    response_mode: "query",
    state,
  });

  const response = NextResponse.redirect(
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
  );

  response.cookies.set("microsoft_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
