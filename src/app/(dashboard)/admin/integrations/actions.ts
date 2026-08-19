"use server";

import { z } from "zod";

import type { ActionResult } from "@/lib/admin/types";
import { toSafeActionError } from "@/lib/errors/to-safe-action-error";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const providerSchema = z.enum(["gmail", "outlook"]);
type EmailProvider = z.infer<typeof providerSchema>;

const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const FLAGGED_INTEGRATIONS_LIMIT = 100;

type UserIntegrationsRow = {
  id: string;
  user_id: string;
  provider: EmailProvider;
  refresh_token: string | null;
  metadata: Record<string, unknown> | null;
  last_synced_at: string | null;
  connected_at: string;
  email_address: string | null;
  label: string | null;
};

function getExpiresAt(
  metadata: Record<string, unknown> | null
): number | null {
  const expiresAt = metadata?.expires_at;
  return typeof expiresAt === "number" ? expiresAt : null;
}

type IntegrationFlag =
  | "ok"
  | "expired_token"
  | "expires_soon"
  | "missing_refresh_token"
  | "missing_expires_at";

function computeIntegrationFlag(
  row: UserIntegrationsRow,
  nowMs: number
): IntegrationFlag {
  if (!row.refresh_token) return "missing_refresh_token";

  const expiresAt = getExpiresAt(row.metadata);
  if (expiresAt === null) return "missing_expires_at";

  if (expiresAt < nowMs) return "expired_token";

  if (expiresAt - nowMs < REFRESH_BUFFER_MS) return "expires_soon";

  return "ok";
}

export type EmailIntegrationsHealthReportRow = {
  integrationId: string;
  userId: string;
  provider: EmailProvider;
  flag: IntegrationFlag;
  accountEmail: string | null;
  accountLabel: string | null;
  userEmail: string | null;
  userName: string | null;
  expiresAt: number | null;
  lastSyncedAt: string | null;
  connectedAt: string;
};

export type EmailIntegrationsProviderSummary = {
  totalUsersConnected: number;
  activeUsers: number;
  flaggedIntegrationsCount: number;
  flaggedUsersCount: number;
};

export type EmailIntegrationsHealthReport = {
  generatedAt: string;
  gmail: EmailIntegrationsProviderSummary;
  outlook: EmailIntegrationsProviderSummary;
  flaggedIntegrations: EmailIntegrationsHealthReportRow[];
};

export async function getEmailIntegrationsHealthReport(): Promise<
  ActionResult<EmailIntegrationsHealthReport>
> {
  await requireAdmin();

  try {
    const admin = createAdminClient();
    const nowMs = Date.now();
    const generatedAt = new Date().toISOString();

    const { data: integrations, error } = await admin
      .from("user_integrations")
      .select(
        "id, user_id, provider, refresh_token, metadata, last_synced_at, connected_at, email_address, label"
      )
      .in("provider", ["gmail", "outlook"]);

    if (error) {
      return {
        success: false,
        error: toSafeActionError(
          error,
          "Could not load Gmail/Outlook integration health."
        ),
      };
    }

    const rows = (integrations ?? []) as unknown as UserIntegrationsRow[];

    const byProvider: Record<
      EmailProvider,
      {
        totalUsers: Set<string>;
        activeUsers: Set<string>;
        flaggedIntegrationsCount: number;
        flaggedUsers: Set<string>;
        flaggedRows: UserIntegrationsRow[];
      }
    > = {
      gmail: {
        totalUsers: new Set(),
        activeUsers: new Set(),
        flaggedIntegrationsCount: 0,
        flaggedUsers: new Set(),
        flaggedRows: [],
      },
      outlook: {
        totalUsers: new Set(),
        activeUsers: new Set(),
        flaggedIntegrationsCount: 0,
        flaggedUsers: new Set(),
        flaggedRows: [],
      },
    };

    for (const row of rows) {
      const provider = providerSchema.parse(row.provider);
      const flag = computeIntegrationFlag(row, nowMs);
      const userId = row.user_id;

      byProvider[provider].totalUsers.add(userId);

      if (flag === "ok") {
        byProvider[provider].activeUsers.add(userId);
        continue;
      }

      byProvider[provider].flaggedIntegrationsCount += 1;
      byProvider[provider].flaggedUsers.add(userId);
      byProvider[provider].flaggedRows.push(row);
    }

    // Fetch signup user details for the flagged integrations list.
    const flaggedRowsAll = [
      ...byProvider.gmail.flaggedRows,
      ...byProvider.outlook.flaggedRows,
    ];

    flaggedRowsAll.sort((a, b) => {
      const aExpires = getExpiresAt(a.metadata);
      const bExpires = getExpiresAt(b.metadata);
      // Most urgent first: expired/soon (lower dates) then null/unknown last.
      const aVal = aExpires ?? Number.POSITIVE_INFINITY;
      const bVal = bExpires ?? Number.POSITIVE_INFINITY;
      if (aVal !== bVal) return aVal - bVal;
      return (
        new Date(a.last_synced_at ?? 0).getTime() -
        new Date(b.last_synced_at ?? 0).getTime()
      );
    });

    const flaggedRowsLimited = flaggedRowsAll.slice(
      0,
      FLAGGED_INTEGRATIONS_LIMIT
    );

    const flaggedUserIds = Array.from(
      new Set(flaggedRowsLimited.map((r) => r.user_id))
    );
    const { data: userRows, error: usersError } = await admin
      .from("users")
      .select("id, email, name")
      .in("id", flaggedUserIds);

    if (usersError) {
      return {
        success: false,
        error: toSafeActionError(
          usersError,
          "Could not load user details for flagged integrations."
        ),
      };
    }

    const userById = new Map(
      (userRows ?? []).map((u) => [u.id, u] as const)
    );

    const flaggedIntegrations: EmailIntegrationsHealthReportRow[] = flaggedRowsLimited.map(
      (row) => {
        const flag = computeIntegrationFlag(row, nowMs);
        const expiresAt = getExpiresAt(row.metadata);
        const user = userById.get(row.user_id);
        return {
          integrationId: row.id,
          userId: row.user_id,
          provider: row.provider,
          flag,
          accountEmail: row.email_address,
          accountLabel: row.label,
          userEmail: user?.email ?? null,
          userName: user?.name ?? null,
          expiresAt,
          lastSyncedAt: row.last_synced_at,
          connectedAt: row.connected_at,
        };
      }
    );

    function summaryFor(provider: EmailProvider): EmailIntegrationsProviderSummary {
      const s = byProvider[provider];
      return {
        totalUsersConnected: s.totalUsers.size,
        activeUsers: s.activeUsers.size,
        flaggedIntegrationsCount: s.flaggedIntegrationsCount,
        flaggedUsersCount: s.flaggedUsers.size,
      };
    }

    return {
      success: true,
      data: {
        generatedAt,
        gmail: summaryFor("gmail"),
        outlook: summaryFor("outlook"),
        flaggedIntegrations,
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: toSafeActionError(
        error,
        "Could not generate Gmail/Outlook integration health report."
      ),
    };
  }
}

