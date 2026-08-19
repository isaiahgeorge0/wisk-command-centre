import { WinstonEngagementSection } from "@/components/admin/winston-engagement-section";
import { getWinstonEngagementTrend } from "@/app/(dashboard)/admin/actions";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

export default async function AdminWinstonEngagementPage() {
  const now = new Date();
  const dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const dateTo = now.toISOString().slice(0, 10);

  const trend = await getWinstonEngagementTrend(dateFrom, dateTo);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>Winston engagement</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Conversation volume over time, split by Winston scope.
        </p>
      </div>
      <WinstonEngagementSection initialData={trend} />
    </div>
  );
}

