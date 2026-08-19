import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { getMorningBriefingHealthReport } from "@/app/(dashboard)/admin/briefing-health/actions";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";
import type { MorningBriefingHealthReport } from "./actions";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function SectionCard({
  title,
  value,
  badge,
}: {
  title: string;
  value: string | number;
  badge?: { text: string; variant: "default" | "outline" | "destructive" };
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-2xl font-semibold">{value}</p>
          {badge ? (
            <Badge variant={badge.variant}>{badge.text}</Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function PendingBadge({
  report,
}: {
  report: MorningBriefingHealthReport;
}) {
  const hasStaleLastSent =
    report.lastSentAtISO !== null &&
    new Date(report.lastSentAtISO).getTime() <
      new Date(report.generatedAtCutoffISO).getTime();

  const showWarning = report.recentPendingCount > 0 || hasStaleLastSent;

  if (!showWarning) return null;

  return (
    <Badge variant="destructive">
      {report.recentPendingCount > 0 ? "Pending exists" : "No recent sends"}
    </Badge>
  );
}

export default async function AdminBriefingHealthPage() {
  const reportResult = await getMorningBriefingHealthReport();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Briefing health</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Detect silent morning-briefing cron failures early.
        </p>
      </div>

      {!reportResult.success || !reportResult.data ? (
        <p className="text-sm text-destructive" role="alert">
          {reportResult.success ? "No report data returned." : reportResult.error}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SectionCard
              title="Last sent"
              value={formatDateTime(reportResult.data.lastSentAtISO)}
            />
            <SectionCard
              title={`Delivered (last ${36}h)`}
              value={reportResult.data.recentDeliveredCount}
            />
            <SectionCard
              title={`Pending (last ${36}h)`}
              value={reportResult.data.recentPendingCount}
              badge={
                reportResult.data.recentPendingCount > 0
                  ? { text: "Investigate", variant: "destructive" }
                  : undefined
              }
            />
            <SectionCard
              title="Oldest pending"
              value={formatDateTime(
                reportResult.data.oldestPendingGeneratedAtISO
              )}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <CardTitle className="text-base">Interpretation</CardTitle>
              <PendingBadge report={reportResult.data} />
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                “Pending” means briefings generated within the last 36 hours that
                still have `sent_at = NULL`. This includes both true send failures
                and briefings intentionally skipped by the cron (e.g. outside the local
                send window).
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

