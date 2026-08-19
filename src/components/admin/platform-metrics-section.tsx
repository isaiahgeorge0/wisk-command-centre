import type { PlatformMetrics } from "@/lib/admin/platform";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SectionActivityChart } from "@/components/admin/section-activity-chart";

type PlatformMetricsSectionProps = {
  metrics: PlatformMetrics;
};

export function PlatformMetricsSection({
  metrics,
}: PlatformMetricsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{metrics.totalProjects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-wisk-lime">
              {metrics.totalTasks}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-blue-500">
              {metrics.totalLeads}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total content posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-rose-500">
              {metrics.totalContentPosts}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Most active sections</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionActivityChart sections={metrics.sectionActivity} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform-wide table counts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Exact row counts across the shipped platform tables (admin-service
            view).
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Table</th>
                  <th className="pb-2 text-right font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {metrics.tableCounts.map((row) => (
                  <tr key={row.table} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{row.table}</td>
                    <td className="py-2 text-right tabular-nums">
                      {row.count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
