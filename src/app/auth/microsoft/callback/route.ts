import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { UnauthorizedError } from "@/lib/auth/errors";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { encryptIntegrationToken } from "@/lib/integrations/crypto";

export const runtime = "nodejs";

const OUTLOOK_SCOPES = [
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/User.Read",
  "offline_access",
].join(" ");

type MicrosoftTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type MicrosoftUserInfo = {
  mail?: string;
  userPrincipalName?: string;
};

function clearOAuthStateCookie(response: NextResponse) {
  response.cookies.set("microsoft_oauth_state", "", {
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

type OutlookMailboxSettings = {
  automaticRepliesSetting?: {
    externalReplyMessage?: string;
    internalReplyMessage?: string;
  };
  userPurpose?: string;
};

async function fetchOutlookSignature(accessToken: string): Promise<{
  signature: string | null;
  signaturePlain: string | null;
}> {
  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/mailboxSettings",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return { signature: null, signaturePlain: null };
    }

    const data = (await response.json()) as OutlookMailboxSettings & {
      signature?: string;
    };

    const signatureHtml =
      typeof data.signature === "string" && data.signature.trim()
        ? data.signature.trim()
        : null;

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

async function persistOutlookSignature(
  supabase: Awaited<ReturnType<typeof getScopedSupabase>>["supabase"],
  userId: string,
  email: string,
  accessToken: string,
  existingMetadata: Record<string, unknown>
) {
  const { signature, signaturePlain } = await fetchOutlookSignature(accessToken);

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
    .eq("provider", "outlook")
    .eq("email_address", email);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  const cookieStore = await cookies();
  const storedState = cookieStore.get("microsoft_oauth_state")?.value;

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

  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/auth/microsoft/callback`;

  if (!clientId || !clientSecret) {
    console.error("[auth/microsoft/callback] Microsoft OAuth is not configured");
    const response = NextResponse.redirect(`${baseUrl}/settings?error=outlook`);
    return clearOAuthStateCookie(response);
  }

  try {
    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: OUTLOOK_SCOPES,
        }),
      }
    );

    const tokenData = (await tokenResponse.json()) as MicrosoftTokenResponse;

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error(
        "[auth/microsoft/callback] Token exchange failed:",
        tokenData.error ?? tokenResponse.status
      );
      const response = NextResponse.redirect(`${baseUrl}/settings?error=outlook`);
      return clearOAuthStateCookie(response);
    }

    const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userInfo = (await userInfoResponse.json()) as MicrosoftUserInfo;
    const email = userInfo.mail ?? userInfo.userPrincipalName;

    if (!userInfoResponse.ok || !email) {
      console.error(
        "[auth/microsoft/callback] Failed to fetch Outlook account email:",
        userInfoResponse.status
      );
      const response = NextResponse.redirect(`${baseUrl}/settings?error=outlook`);
      return clearOAuthStateCookie(response);
    }

    const { count: duplicateCount } = await supabase
      .from("user_integrations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("provider", "outlook")
      .eq("email_address", email);

    if ((duplicateCount ?? 0) > 0) {
      const response = NextResponse.redirect(
        `${baseUrl}/settings?error=outlook-duplicate`
      );
      return clearOAuthStateCookie(response);
    }

    const { count: existingCount } = await supabase
      .from("user_integrations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("provider", "outlook");

    const expiresIn = tokenData.expires_in ?? 3600;
    const encryptedAccessToken = encryptIntegrationToken(tokenData.access_token);
    const encryptedRefreshToken = tokenData.refresh_token
      ? encryptIntegrationToken(tokenData.refresh_token)
      : null;
    const now = new Date().toISOString();
    const integrationMetadata = {
      email,
      expires_at: Date.now() + expiresIn * 1000,
    };

    const { error } = await supabase.from("user_integrations").upsert(
      {
        user_id: userId,
        provider: "outlook",
        email_address: email,
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
      console.error("[auth/microsoft/callback] Failed to store integration:", error);
      const response = NextResponse.redirect(`${baseUrl}/settings?error=outlook`);
      return clearOAuthStateCookie(response);
    }

    await persistOutlookSignature(
      supabase,
      userId,
      email,
      tokenData.access_token,
      integrationMetadata
    );

    const response = NextResponse.redirect(`${baseUrl}/settings?connected=outlook`);
    return clearOAuthStateCookie(response);
  } catch (error) {
    console.error("[auth/microsoft/callback] Unexpected error:", error);
    const response = NextResponse.redirect(`${baseUrl}/settings?error=outlook`);
    return clearOAuthStateCookie(response);
  }
}
