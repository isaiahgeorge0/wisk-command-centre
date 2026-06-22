import {
  decryptIntegrationToken,
  encryptIntegrationToken,
} from "@/lib/integrations/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

type IntegrationRow = {
  access_token: string;
  refresh_token: string | null;
  metadata: Record<string, unknown> | null;
};

async function fetchIntegrationRow(
  userId: string,
  provider: "gmail" | "outlook"
): Promise<IntegrationRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("user_integrations")
    .select("access_token, refresh_token, metadata")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error || !data?.access_token) {
    if (error) {
      console.error(`getValid${provider}Token: failed to load integration`, error);
    }
    return null;
  }

  return data as IntegrationRow;
}

function getExpiresAt(metadata: Record<string, unknown> | null): number | null {
  const expiresAt = metadata?.expires_at;
  return typeof expiresAt === "number" ? expiresAt : null;
}

async function persistTokens(
  userId: string,
  provider: "gmail" | "outlook",
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number,
  metadata: Record<string, unknown> | null
) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("user_integrations")
    .update({
      access_token: encryptIntegrationToken(accessToken),
      ...(refreshToken
        ? { refresh_token: encryptIntegrationToken(refreshToken) }
        : {}),
      metadata: {
        ...(metadata ?? {}),
        expires_at: Date.now() + expiresIn * 1000,
      },
      last_synced_at: now,
    })
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) {
    console.error(`getValid${provider}Token: failed to persist refreshed token`, error);
  }
}

async function refreshGmailToken(
  userId: string,
  row: IntegrationRow
): Promise<string | null> {
  if (!row.refresh_token) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  let refreshToken: string;
  try {
    refreshToken = decryptIntegrationToken(row.refresh_token);
  } catch {
    return null;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
  };

  if (!response.ok || !data.access_token) {
    console.error("refreshGmailToken failed:", data.error ?? response.status);
    return null;
  }

  await persistTokens(
    userId,
    "gmail",
    data.access_token,
    data.refresh_token ?? refreshToken,
    data.expires_in ?? 3600,
    row.metadata
  );

  return data.access_token;
}

async function refreshOutlookToken(
  userId: string,
  row: IntegrationRow
): Promise<string | null> {
  if (!row.refresh_token) return null;

  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  let refreshToken: string;
  try {
    refreshToken = decryptIntegrationToken(row.refresh_token);
  } catch {
    return null;
  }

  const response = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: [
          "https://graph.microsoft.com/Mail.Read",
          "https://graph.microsoft.com/User.Read",
          "offline_access",
        ].join(" "),
      }),
    }
  );

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
  };

  if (!response.ok || !data.access_token) {
    console.error("refreshOutlookToken failed:", data.error ?? response.status);
    return null;
  }

  await persistTokens(
    userId,
    "outlook",
    data.access_token,
    data.refresh_token ?? refreshToken,
    data.expires_in ?? 3600,
    row.metadata
  );

  return data.access_token;
}

async function getValidToken(
  userId: string,
  provider: "gmail" | "outlook",
  refresh: (userId: string, row: IntegrationRow) => Promise<string | null>
): Promise<string | null> {
  const row = await fetchIntegrationRow(userId, provider);
  if (!row) return null;

  let accessToken: string;
  try {
    accessToken = decryptIntegrationToken(row.access_token);
  } catch {
    return null;
  }

  const expiresAt = getExpiresAt(row.metadata);
  const needsRefresh =
    expiresAt !== null && expiresAt - Date.now() < REFRESH_BUFFER_MS;

  if (!needsRefresh) {
    return accessToken;
  }

  const refreshed = await refresh(userId, row);
  return refreshed ?? accessToken;
}

export async function getValidGmailToken(userId: string): Promise<string | null> {
  return getValidToken(userId, "gmail", refreshGmailToken);
}

export async function getValidOutlookToken(
  userId: string
): Promise<string | null> {
  return getValidToken(userId, "outlook", refreshOutlookToken);
}
