"use client";

import {
  Activity,
  BarChart3,
  Radar,
  Search,
  Sparkles,
  UserSearch,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { StaggerItem } from "@/components/motion/stagger-item";
import { StaggerList } from "@/components/motion/stagger-list";
import { SectionCard } from "@/components/overview/section-card";
import { useResearchAccent } from "@/components/research/use-research-accent";
import { useStaggerOnce } from "@/lib/motion/use-stagger-once";
import type { ResearchOverviewStats } from "@/lib/research/types";

type ResearchOverviewClientProps = {
  stats: ResearchOverviewStats;
};

function formatPercent(value: number | null): string {
  if (value == null) return "-";
  return `${value}%`;
}

export function ResearchOverviewClient({ stats }: ResearchOverviewClientProps) {
  const accent = useResearchAccent();
  const stagger = useStaggerOnce();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Research"
        subtitle="Your intelligence hub: watch competitors, track win rate, and brief leads"
        accent="research"
        icon={
          <Search className="size-5 text-wisk-section-research" aria-hidden />
        }
      />

      <StaggerList
        stagger={stagger}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
      >
        <StaggerItem stagger={stagger} as="div">
          <SectionCard
            cardId="research-overview-watchlist"
            title="Watchlist"
            href="/research/watchlist"
            accent={accent}
            icon={<Radar size={16} style={{ color: accent }} />}
            stat={{
              label: "tracked",
              value: `${stats.competitorCount}/${stats.competitorCap}`,
            }}
            items={
              stats.competitorCount > 0
                ? [
                    {
                      label: `${stats.competitorCap - stats.competitorCount} slot${stats.competitorCap - stats.competitorCount === 1 ? "" : "s"} left`,
                    },
                    {
                      label: stats.canAccessResearchPro
                        ? "Research Pro cap"
                        : "Research cap",
                    },
                  ]
                : []
            }
            emptyMessage="Add your first competitor to start daily checks."
            cta="Open watchlist"
            onExpand={() => router.push("/research/watchlist")}
          />
        </StaggerItem>

        <StaggerItem stagger={stagger} as="div">
          <SectionCard
            cardId="research-overview-win-rate"
            title="Win-rate"
            href="/research/win-rate"
            accent={accent}
            icon={<BarChart3 size={16} style={{ color: accent }} />}
            stat={{
              label: stats.winRatePeriodLabel.toLowerCase(),
              value: formatPercent(stats.winRatePercent),
            }}
            items={[
              { label: "From closed Won / Lost leads" },
              { label: "Data-driven, not AI estimates" },
            ]}
            emptyMessage="Close a few deals to see your win rate."
            cta="Open dashboard"
            onExpand={() => router.push("/research/win-rate")}
          />
        </StaggerItem>

        <StaggerItem stagger={stagger} as="div">
          <SectionCard
            cardId="research-overview-chat"
            title="Ask Winston"
            href="/research/chat"
            accent={accent}
            icon={<Sparkles size={16} style={{ color: accent }} />}
            stat={{
              label: stats.canAccessResearchPro ? "ready" : "locked",
              value: stats.canAccessResearchPro ? "Pro" : "—",
            }}
            items={
              stats.canAccessResearchPro
                ? [
                    { label: "Cited market and competitor answers" },
                    { label: "Findings → Winston proposals" },
                  ]
                : [{ label: "Research Pro unlocks open research chat" }]
            }
            emptyMessage="Upgrade to Research Pro for open cited chat."
            cta={stats.canAccessResearchPro ? "Ask Winston" : "See Research Pro"}
            onExpand={() =>
              router.push(
                stats.canAccessResearchPro
                  ? "/research/chat"
                  : "/upgrade/research-pro"
              )
            }
          />
        </StaggerItem>

        <StaggerItem stagger={stagger} as="div">
          <SectionCard
            cardId="research-overview-leads"
            title="Lead Intelligence"
            href="/research/leads"
            accent={accent}
            icon={<UserSearch size={16} style={{ color: accent }} />}
            stat={{
              label: "briefs this month",
              value: stats.briefsThisMonth,
            }}
            items={[
              { label: `${stats.briefsTotal} total with a brief` },
              ...(stats.leadsWithoutBrief > 0
                ? [
                    {
                      label: `${stats.leadsWithoutBrief} lead${stats.leadsWithoutBrief === 1 ? "" : "s"} still need a brief`,
                    },
                  ]
                : [{ label: "Generate briefs from the Leads panel" }]),
            ]}
            emptyMessage="Generate your first brief from a lead in Leads."
            cta="View briefs"
            onExpand={() => router.push("/research/leads")}
          />
        </StaggerItem>

        <StaggerItem stagger={stagger} as="div">
          <SectionCard
            cardId="research-overview-signals"
            title="Signals"
            href="/research/signals"
            accent={accent}
            icon={<Activity size={16} style={{ color: accent }} />}
            stat={{
              label: "live",
              value: stats.signalCount,
            }}
            items={
              stats.signalCount > 0
                ? [
                    { label: "From daily competitor checks" },
                    { label: "Also surfaces on Overview Focus" },
                  ]
                : []
            }
            emptyMessage="Meaningful changes will show up here after checks run."
            cta="Open signals"
            onExpand={() => router.push("/research/signals")}
          />
        </StaggerItem>
      </StaggerList>
    </div>
  );
}
