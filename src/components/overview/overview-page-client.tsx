import { PageTransition } from "@/components/layout/page-transition";
import { NeedsAttentionSection } from "@/components/overview/needs-attention-section";
import { OverviewHeader } from "@/components/overview/overview-header";
import { OverviewStatCards } from "@/components/overview/overview-stat-cards";
import { RecentLeadsSection } from "@/components/overview/recent-leads-section";
import { RecentlyAddedSection } from "@/components/overview/recently-added-section";
import { OverviewWeekStrip } from "@/components/overview/overview-week-strip";
import { ThisWeekSection } from "@/components/overview/this-week-section";
import type { OverviewSnapshot } from "@/lib/overview/selectors";

type OverviewPageClientProps = {
  snapshot: OverviewSnapshot;
};

export function OverviewPageClient({ snapshot }: OverviewPageClientProps) {
  return (
    <PageTransition>
      <OverviewHeader header={snapshot.header} />
      <OverviewStatCards stats={snapshot.stats} />
      <NeedsAttentionSection snapshot={snapshot} />
      <OverviewWeekStrip snapshot={snapshot} />
      <ThisWeekSection snapshot={snapshot} />
      <RecentlyAddedSection snapshot={snapshot} />
      <RecentLeadsSection snapshot={snapshot} />
    </PageTransition>
  );
}
