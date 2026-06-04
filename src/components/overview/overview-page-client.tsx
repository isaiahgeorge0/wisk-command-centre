import { NeedsAttentionSection } from "@/components/overview/needs-attention-section";
import { OverviewHeader } from "@/components/overview/overview-header";
import { OverviewStatCards } from "@/components/overview/overview-stat-cards";
import { RecentlyAddedSection } from "@/components/overview/recently-added-section";
import { ThisWeekSection } from "@/components/overview/this-week-section";
import type { OverviewSnapshot } from "@/lib/overview/selectors";

type OverviewPageClientProps = {
  snapshot: OverviewSnapshot;
};

export function OverviewPageClient({ snapshot }: OverviewPageClientProps) {
  return (
    <div>
      <OverviewHeader header={snapshot.header} />
      <OverviewStatCards stats={snapshot.stats} />
      <NeedsAttentionSection snapshot={snapshot} />
      <ThisWeekSection snapshot={snapshot} />
      <RecentlyAddedSection snapshot={snapshot} />
    </div>
  );
}
