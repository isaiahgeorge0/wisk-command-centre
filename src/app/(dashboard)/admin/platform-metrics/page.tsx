import { getPlatformMetrics } from "@/app/(dashboard)/admin/actions";
import { PlatformMetricsSection } from "@/components/admin/platform-metrics-section";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

export default async function AdminPlatformMetricsPage() {
  const metrics = await getPlatformMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Platform Metrics</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Table-level row counts and most active sections across the platform.
        </p>
      </div>

      <PlatformMetricsSection metrics={metrics} />
    </div>
  );
}
