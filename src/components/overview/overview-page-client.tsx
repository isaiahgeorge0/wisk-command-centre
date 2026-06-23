"use client";

import { useEffect, useState } from "react";

import { PageTransition } from "@/components/layout/page-transition";
import { useNavMode } from "@/components/layout/nav-mode-context";
import { NeedsAttentionSection } from "@/components/overview/needs-attention-section";
import { OverviewHeader } from "@/components/overview/overview-header";
import { OverviewStatCards } from "@/components/overview/overview-stat-cards";
import {
  OverviewViewToggle,
  type OverviewView,
} from "@/components/overview/overview-view-toggle";
import { PropertiesOverviewSummary } from "@/components/overview/properties-overview-summary";
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
  hasProperties: boolean;
};

export function OverviewPageClient({
  snapshot,
  suggestions,
  hasProperties,
}: OverviewPageClientProps) {
  const [view, setView] = useState<OverviewView>("overview");
  const { setNavMode } = useNavMode();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    if (!hasProperties) {
      setNavMode("standard");
      return;
    }
    setNavMode(view === "properties" ? "properties" : "standard");
  }, [hasProperties, setNavMode, view]);

  return (
    <PageTransition>
      {hasProperties ? (
        <div className="mb-6">
          <OverviewViewToggle value={view} onChange={setView} />
        </div>
      ) : null}

      {hasProperties && view === "properties" ? (
        <>
          <OverviewHeader header={snapshot.header} />
          <PropertiesOverviewSummary />
        </>
      ) : (
        <>
          <OverviewHeader header={snapshot.header} />
          <OverviewStatCards stats={snapshot.stats} />
          <WinstonSuggestsSection suggestions={suggestions} />
          <NeedsAttentionSection snapshot={snapshot} />
          <OverviewWeekStrip snapshot={snapshot} />
          <ThisWeekSection snapshot={snapshot} />
          <RecentlyAddedSection snapshot={snapshot} />
          <RecentLeadsSection snapshot={snapshot} />
        </>
      )}
    </PageTransition>
  );
}
