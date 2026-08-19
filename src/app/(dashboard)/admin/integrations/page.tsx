import { getEmailIntegrationsHealthReport } from "@/app/(dashboard)/admin/integrations/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

import type {
  EmailIntegrationsHealthReportRow,
  EmailIntegrationsProviderSummary,
  EmailIntegrationsHealthReport,
} from "./actions";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatExpiresAt(expiresAt: number | null): string {
  if (expiresAt === null) return "—";
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatProvider(provider: "gmail" | "outlook"): string {
  return provider === "gmail" ? "Gmail" : "Outlook";
}

function FlagBadge({ flag }: { flag: EmailIntegrationsHealthReportRow["flag"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        flag === "ok" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        flag === "expired_token" &&
          "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
        flag === "expires_soon" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        flag === "missing_refresh_token" &&
          "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
        flag === "missing_expires_at" &&
          "border-border bg-muted/50 text-muted-foreground"
      )}
    >
      {flag === "expired_token"
        ? "Expired"
        : flag === "expires_soon"
          ? "Expires soon"
          : flag === "missing_refresh_token"
            ? "Missing refresh token"
            : flag === "missing_expires_at"
              ? "Missing expires_at"
              : "OK"}
    </Badge>
  );
}

function SummaryCard({
  title,
  summary,
}: {
  title: string;
  summary: EmailIntegrationsProviderSummary;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Active users</p>
            <p className="text-2xl font-semibold">{summary.activeUsers}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Connected users</p>
            <p className="text-2xl font-semibold">{summary.totalUsersConnected}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Flagged integrations</p>
            <p className="text-xl font-semibold text-red-600 dark:text-red-400">
              {summary.flaggedIntegrationsCount}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Flagged users</p>
            <p className="text-xl font-semibold text-red-600 dark:text-red-400">
              {summary.flaggedUsersCount}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminIntegrationsPage() {
  const reportResult = await getEmailIntegrationsHealthReport();

  if (!reportResult.success || !reportResult.data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className={PAGE_TITLE_CLASS}>Integrations</h1>
          <p className={PAGE_SUBTITLE_CLASS}>Gmail/Outlook connection health.</p>
        </div>
        <p className="text-sm text-destructive" role="alert">
          {reportResult.success ? "No report data returned." : reportResult.error}
        </p>
      </div>
    );
  }

  const report: EmailIntegrationsHealthReport = reportResult.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Integrations</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Gmail/Outlook connection status and token health across all users.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard title="Gmail" summary={report.gmail} />
        <SummaryCard title="Outlook" summary={report.outlook} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Flagged connections</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Showing up to {Math.min(100, report.flaggedIntegrations.length)} flagged
              integrations by token urgency.
            </p>
          </div>
          <Badge variant="outline" className="text-muted-foreground">
            Total flagged shown: {report.flaggedIntegrations.length}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.flaggedIntegrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expired/failing tokens detected.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Provider</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 font-medium">Flag</th>
                    <th className="px-4 py-3 font-medium">Expires</th>
                    <th className="px-4 py-3 font-medium">Last synced</th>
                    <th className="px-4 py-3 font-medium">Connected</th>
                  </tr>
                </thead>
                <tbody>
                  {report.flaggedIntegrations.map((row: EmailIntegrationsHealthReportRow) => (
                    <tr key={row.integrationId} className="border-b align-top last:border-b-0">
                      <td className="px-4 py-3 font-medium">{formatProvider(row.provider)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {row.userName ?? row.userEmail ?? row.userId}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {row.userEmail ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{row.accountEmail ?? "—"}</span>
                          <span>{row.accountLabel ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <FlagBadge flag={row.flag} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatExpiresAt(row.expiresAt)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(row.lastSyncedAt)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(row.connectedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

