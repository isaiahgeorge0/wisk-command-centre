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

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type GmailSendAsResponse = {
  sendAs?: Array<{
    isDefault?: boolean;
    signature?: string;
  }>;
};

async function fetchGmailSignature(accessToken: string): Promise<{
  signature: string | null;
  signaturePlain: string | null;
}> {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs?access_token=${encodeURIComponent(accessToken)}`
    );

    if (!response.ok) {
      return { signature: null, signaturePlain: null };
    }

    const data = (await response.json()) as GmailSendAsResponse;
    const defaultSendAs = data.sendAs?.find((entry) => entry.isDefault);
    const signatureHtml = defaultSendAs?.signature?.trim();

    if (!signatureHtml) {
      return { signature: null, signaturePlain: null };
    }

    return {
      signature: signatureHtml,
      signaturePlain: htmlToPlainText(signatureHtml),
    };
  } catch {
    return { signature: null, signaturePlain: null };
  }
}

async function persistGmailSignature(
  supabase: Awaited<ReturnType<typeof getScopedSupabase>>["supabase"],
  userId: string,
  email: string,
  accessToken: string,
  existingMetadata: Record<string, unknown>
) {
  const { signature, signaturePlain } = await fetchGmailSignature(accessToken);

  await supabase
    .from("user_integrations")
    .update({
      signature,
      signature_plain: signaturePlain,
      metadata: {
        ...existingMetadata,
        signature_auto_fetched: Boolean(signature),
      },
    })
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .eq("email_address", email);
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

    const { count: duplicateCount } = await supabase
      .from("user_integrations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("provider", "gmail")
      .eq("email_address", userInfo.email);

    if ((duplicateCount ?? 0) > 0) {
      const response = NextResponse.redirect(
        `${baseUrl}/settings?error=gmail-duplicate`
      );
      return clearOAuthStateCookie(response);
    }

    const { count: existingCount } = await supabase
      .from("user_integrations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("provider", "gmail");

    const expiresIn = tokenData.expires_in ?? 3600;
    const encryptedAccessToken = encryptIntegrationToken(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token
      ? encryptIntegrationToken(tokenData.refresh_token)
      : null;
    const now = new Date().toISOString();
    const integrationMetadata = {
      email: userInfo.email,
      expires_at: Date.now() + expiresIn * 1000,
    };

    const { error } = await supabase.from("user_integrations").upsert(
      {
        user_id: userId,
        provider: "gmail",
        email_address: userInfo.email,
        label: null,
        display_order: existingCount ?? 0,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        metadata: integrationMetadata,
        connected_at: now,
        last_synced_at: now,
      },
      { onConflict: "user_id,provider,email_address" }
    );

    if (error) {
      console.error("[auth/google/callback] Failed to store integration:", error);
      const response = NextResponse.redirect(`${baseUrl}/settings?error=gmail`);
      return clearOAuthStateCookie(response);
    }

    await persistGmailSignature(
      supabase,
      userId,
      userInfo.email,
      tokenData.access_token,
      integrationMetadata
    );

    const response = NextResponse.redirect(`${baseUrl}/settings?connected=gmail`);
    return clearOAuthStateCookie(response);
  } catch (error) {
    console.error("[auth/google/callback] Unexpected error:", error);
    const response = NextResponse.redirect(`${baseUrl}/settings?error=gmail`);
    return clearOAuthStateCookie(response);
  }
}
