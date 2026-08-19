import { getAIUsageBreakdown } from "@/app/(dashboard)/admin/actions";
import { AIUsageSection } from "@/components/admin/ai-usage-section";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";

export default async function AdminAIUsagePage() {
  const now = new Date();
  const dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const dateTo = now.toISOString().slice(0, 10);

  const breakdown = await getAIUsageBreakdown(dateFrom, dateTo);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={PAGE_TITLE_CLASS}>AI Usage</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Token usage and estimated Anthropic cost across all users.
        </p>
      </div>
      <AIUsageSection initialData={breakdown} />
    </div>
  );
}
