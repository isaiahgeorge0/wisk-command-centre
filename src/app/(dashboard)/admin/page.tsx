import Link from "next/link";

import {
  getAdminStats,
  getAIUsageBreakdown,
  getPlatformMetrics,
  getPropertiesOverview,
  getSubscriptionRevenueBreakdown,
  getUsers,
  getWinstonEngagementTrend,
} from "@/app/(dashboard)/admin/actions";
import { getMorningBriefingHealthReport } from "@/app/(dashboard)/admin/briefing-health/actions";
import { getEmailIntegrationsHealthReport } from "@/app/(dashboard)/admin/integrations/actions";
import { AdminOverviewClient } from "@/components/admin/admin-overview-client";
import type { AdminOverviewData } from "@/components/admin/admin-overview-client";
import { AdminQuickActions } from "@/components/admin/admin-quick-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminOverviewPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [
    stats,
    platformMetrics,
    users,
    revenue,
    aiUsage,
    properties,
    winston,
    integrationsResult,
    briefingResult,
  ] = await Promise.all([
    getAdminStats(),
    getPlatformMetrics(),
    getUsers(),
    getSubscriptionRevenueBreakdown(),
    getAIUsageBreakdown(monthStart, monthEnd),
    getPropertiesOverview(),
    getWinstonEngagementTrend(thirtyDaysAgo, today),
    getEmailIntegrationsHealthReport(),
    getMorningBriefingHealthReport(),
  ]);

  const integrations = integrationsResult.success ? integrationsResult.data : null;
  const briefing = briefingResult.success ? briefingResult.data : null;

  const totalRows = platformMetrics.tableCounts.reduce((sum, t) => sum + t.count, 0);
  const topTables = platformMetrics.tableCounts
    .slice(0, 3)
    .map((t) => ({ name: t.table, count: t.count }));

  const topPackages = revenue.rows
    .filter((r) => r.mrrContributionGBP !== null && r.mrrContributionGBP > 0)
    .sort((a, b) => (b.mrrContributionGBP ?? 0) - (a.mrrContributionGBP ?? 0))
    .slice(0, 3)
    .map((r) => ({ name: r.package, mrr: r.mrrContributionGBP ?? 0 }));

  const topFeatures = aiUsage.byFeature
    .sort((a, b) => b.estimatedCostUSD - a.estimatedCostUSD)
    .slice(0, 3)
    .map((f) => ({ name: f.feature, costUSD: f.estimatedCostUSD }));

  const totalOverdueCerts = properties.rows.reduce(
    (sum, r) => sum + r.overdueCertificatesCount,
    0
  );
  const totalOpenMaintenance = properties.rows.reduce(
    (sum, r) => sum + r.openMaintenanceTicketsCount,
    0
  );
  const totalMissingRent = properties.rows.reduce(
    (sum, r) => sum + r.missingRentDataCount,
    0
  );

  const winstonLast = winston.points ?? [];
  const noteCount = winstonLast.reduce((s, p) => s + p.noteCount, 0);
  const sectionCount = winstonLast.reduce((s, p) => s + p.sectionCount, 0);
  const generalCount = winstonLast.reduce((s, p) => s + p.generalCount, 0);

  const overviewData: AdminOverviewData = {
    revenue: {
      totalMRR: revenue.totalMRRKnownGBP,
      topPackages,
      unconfiguredCount: revenue.unknownPricePackages.length,
    },
    aiUsage: {
      estimatedCostUSD: aiUsage.totalEstimatedCostUSD,
      topFeatures,
    },
    properties: {
      totalProperties: properties.totalProperties,
      overdueCerts: totalOverdueCerts,
      openMaintenance: totalOpenMaintenance,
      missingRent: totalMissingRent,
    },
    winston: {
      totalConversations: winston.totalConversations,
      noteCount,
      sectionCount,
      generalCount,
    },
    integrations: {
      totalConnected: integrations
        ? integrations.gmail.totalUsersConnected + integrations.outlook.totalUsersConnected
        : 0,
      gmailCount: integrations?.gmail.totalUsersConnected ?? 0,
      outlookCount: integrations?.outlook.totalUsersConnected ?? 0,
      flaggedCount: integrations?.flaggedIntegrations.length ?? 0,
    },
    briefing: {
      lastSentAtISO: briefing?.lastSentAtISO ?? null,
      deliveredCount: briefing?.recentDeliveredCount ?? 0,
      pendingCount: briefing?.recentPendingCount ?? 0,
    },
    platform: {
      totalTables: platformMetrics.tableCounts.length,
      totalRows,
      topTables,
    },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Admin overview</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Operational insights across the platform.
        </p>
      </div>

      <AdminOverviewClient data={overviewData} />

      <AdminQuickActions users={users} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent access requests</CardTitle>
            <Link
              href="/admin/requests"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            ) : (
              stats.recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{request.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(request.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline">{request.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent signups</CardTitle>
            <Link
              href="/admin/users"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users yet.</p>
            ) : (
              stats.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <p className="font-medium">
                    {user.name?.trim() || user.email.split("@")[0]}
                  </p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {formatDate(user.created_at)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
