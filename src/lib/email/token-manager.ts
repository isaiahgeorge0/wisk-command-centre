import {
  decryptIntegrationToken,
  encryptIntegrationToken,
} from "@/lib/integrations/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ValidEmailToken } from "@/lib/email/types";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

type IntegrationRow = {
  id: string;
  access_token: string;
  refresh_token: string | null;
  email_address: string | null;
  label: string | null;
  metadata: Record<string, unknown> | null;
};

async function fetchIntegrationRows(
  userId: string,
  provider: "gmail" | "outlook"
): Promise<IntegrationRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("user_integrations")
    .select("id, access_token, refresh_token, email_address, label, metadata")
    .eq("user_id", userId)
    .eq("provider", provider)
    .order("display_order", { ascending: true });

  if (error) {
    console.error(`getValid${provider}Tokens: failed to load integrations`, error);
    return [];
  }

  return (data ?? []) as IntegrationRow[];
}

function getExpiresAt(metadata: Record<string, unknown> | null): number | null {
  const expiresAt = metadata?.expires_at;
  return typeof expiresAt === "number" ? expiresAt : null;
}

function getAccountEmail(row: IntegrationRow): string {
  return (
    row.email_address ??
    (typeof row.metadata?.email === "string" ? row.metadata.email : "") ??
    ""
  );
}

async function persistTokens(
  integrationId: string,
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
    .eq("id", integrationId);

  if (error) {
    console.error("persistTokens: failed to persist refreshed token", error);
  }
}

async function refreshGmailToken(row: IntegrationRow): Promise<string | null> {
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
    row.id,
    data.access_token,
    data.refresh_token ?? refreshToken,
    data.expires_in ?? 3600,
    row.metadata
  );

  return data.access_token;
}

async function refreshOutlookToken(row: IntegrationRow): Promise<string | null> {
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
    row.id,
    data.access_token,
    data.refresh_token ?? refreshToken,
    data.expires_in ?? 3600,
    row.metadata
  );

  return data.access_token;
}

async function getValidTokensForProvider(
  userId: string,
  provider: "gmail" | "outlook",
  refresh: (row: IntegrationRow) => Promise<string | null>
): Promise<ValidEmailToken[]> {
  const rows = await fetchIntegrationRows(userId, provider);
  const tokens: ValidEmailToken[] = [];

  for (const row of rows) {
    if (!row.access_token) continue;

    let accessToken: string;
    try {
      accessToken = decryptIntegrationToken(row.access_token);
    } catch (error) {
      console.error(`getValid${provider}Tokens: decrypt failed`, error);
      continue;
    }

    const expiresAt = getExpiresAt(row.metadata);
    const needsRefresh =
      expiresAt !== null && expiresAt - Date.now() < REFRESH_BUFFER_MS;

    if (needsRefresh) {
      const refreshed = await refresh(row);
      if (!refreshed) {
        console.error(
          `getValid${provider}Tokens: refresh failed for integration ${row.id}`
        );
        continue;
      }
      accessToken = refreshed;
    }

    const email = getAccountEmail(row);
    if (!email) continue;

    tokens.push({
      integrationId: row.id,
      email,
      label: row.label,
      accessToken,
    });
  }

  return tokens;
}

export async function getValidGmailTokens(
  userId: string
): Promise<ValidEmailToken[]> {
  return getValidTokensForProvider(userId, "gmail", refreshGmailToken);
}

export async function getValidOutlookTokens(
  userId: string
): Promise<ValidEmailToken[]> {
  return getValidTokensForProvider(userId, "outlook", refreshOutlookToken);
}

/** @deprecated Use getValidGmailTokens for multi-account support. */
export async function getValidGmailToken(userId: string): Promise<string | null> {
  const tokens = await getValidGmailTokens(userId);
  return tokens[0]?.accessToken ?? null;
}

/** @deprecated Use getValidOutlookTokens for multi-account support. */
export async function getValidOutlookToken(
  userId: string
): Promise<string | null> {
  const tokens = await getValidOutlookTokens(userId);
  return tokens[0]?.accessToken ?? null;
}

export async function getValidEmailTokenForIntegration(
  userId: string,
  integrationId: string
): Promise<string | null> {
  const gmailTokens = await getValidGmailTokens(userId);
  const gmailMatch = gmailTokens.find((token) => token.integrationId === integrationId);
  if (gmailMatch) return gmailMatch.accessToken;

  const outlookTokens = await getValidOutlookTokens(userId);
  const outlookMatch = outlookTokens.find(
    (token) => token.integrationId === integrationId
  );
  return outlookMatch?.accessToken ?? null;
}
