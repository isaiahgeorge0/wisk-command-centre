import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/lib/auth/errors";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { encryptIntegrationToken } from "@/lib/integrations/crypto";

export const runtime = "nodejs";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  email?: string;
};

function clearOAuthStateCookie(response: NextResponse) {
  response.cookies.set("google_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  const cookieStore = await cookies();
  const storedState = cookieStore.get("google_oauth_state")?.value;

  if (!code || !state || !storedState || state !== storedState) {
    const response = NextResponse.json(
      { error: "Invalid OAuth state" },
      { status: 400 }
    );
    return clearOAuthStateCookie(response);
  }

  let supabase;
  let userId: string;

  try {
    ({ supabase, userId } = await getScopedSupabase());
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      const response = NextResponse.redirect(`${baseUrl}/sign-in`);
      return clearOAuthStateCookie(response);
    }
    throw error;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/auth/google/callback`;

  if (!clientId || !clientSecret) {
    console.error("[auth/google/callback] Google OAuth is not configured");
    const response = NextResponse.redirect(`${baseUrl}/settings?error=gmail`);
    return clearOAuthStateCookie(response);
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error(
        "[auth/google/callback] Token exchange failed:",
        tokenData.error ?? tokenResponse.status
      );
      const response = NextResponse.redirect(`${baseUrl}/settings?error=gmail`);
      return clearOAuthStateCookie(response);
    }

    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

    if (!userInfoResponse.ok || !userInfo.email) {
      console.error(
        "[auth/google/callback] Failed to fetch Gmail account email:",
        userInfoResponse.status
      );
      const response = NextResponse.redirect(`${baseUrl}/settings?error=gmail`);
      return clearOAuthStateCookie(response);
    }

    const expiresIn = tokenData.expires_in ?? 3600;
    const encryptedAccessToken = encryptIntegrationToken(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token
      ? encryptIntegrationToken(tokenData.refresh_token)
      : null;
    const now = new Date().toISOString();

    const { error } = await supabase.from("user_integrations").upsert(
      {
        user_id: userId,
        provider: "gmail",
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        metadata: {
          email: userInfo.email,
          expires_at: Date.now() + expiresIn * 1000,
        },
        connected_at: now,
        last_synced_at: now,
      },
      { onConflict: "user_id,provider" }
    );

    if (error) {
      console.error("[auth/google/callback] Failed to store integration:", error);
      const response = NextResponse.redirect(`${baseUrl}/settings?error=gmail`);
      return clearOAuthStateCookie(response);
    }

    const response = NextResponse.redirect(`${baseUrl}/settings?connected=gmail`);
    return clearOAuthStateCookie(response);
  } catch (error) {
    console.error("[auth/google/callback] Unexpected error:", error);
    const response = NextResponse.redirect(`${baseUrl}/settings?error=gmail`);
    return clearOAuthStateCookie(response);
  }
}
