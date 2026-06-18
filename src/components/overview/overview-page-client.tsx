"use client";

import { useEffect } from "react";

import { PageTransition } from "@/components/layout/page-transition";
import { NeedsAttentionSection } from "@/components/overview/needs-attention-section";
import { OverviewHeader } from "@/components/overview/overview-header";
import { OverviewStatCards } from "@/components/overview/overview-stat-cards";
import { RecentLeadsSection } from "@/components/overview/recent-leads-section";
import { RecentlyAddedSection } from "@/components/overview/recently-added-section";
import { OverviewWeekStrip } from "@/components/overview/overview-week-strip";
import { ThisWeekSection } from "@/components/overview/this-week-section";
import { WinstonSuggestsSection } from "@/components/overview/winston-suggests-section";
import type { OverviewSnapshot } from "@/lib/overview/selectors";
import type { SmartSuggestion } from "@/lib/suggestions/types";

type OverviewPageClientProps = {
  snapshot: OverviewSnapshot;
  suggestions: SmartSuggestion[];
};

export function OverviewPageClient({
  snapshot,
  suggestions,
}: OverviewPageClientProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <PageTransition>
      <OverviewHeader header={snapshot.header} />
      <OverviewStatCards stats={snapshot.stats} />
      <WinstonSuggestsSection suggestions={suggestions} />
      <NeedsAttentionSection snapshot={snapshot} />
      <OverviewWeekStrip snapshot={snapshot} />
      <ThisWeekSection snapshot={snapshot} />
      <RecentlyAddedSection snapshot={snapshot} />
      <RecentLeadsSection snapshot={snapshot} />
    </PageTransition>
  );
}
