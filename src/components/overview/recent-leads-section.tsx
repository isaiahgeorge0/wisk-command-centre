"use client";

import Link from "next/link";

import { LeadSourceBadge } from "@/components/leads/lead-source-badge";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { StaggerItem } from "@/components/motion/stagger-item";
import { StaggerList } from "@/components/motion/stagger-list";
import { useStaggerOnce } from "@/lib/motion/use-stagger-once";
import type { OverviewSnapshot } from "@/lib/overview/selectors";

type RecentLeadsSectionProps = {
  snapshot: OverviewSnapshot;
};

export function RecentLeadsSection({ snapshot }: RecentLeadsSectionProps) {
  const stagger = useStaggerOnce();
  const { recentLeads } = snapshot;

  if (recentLeads.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Recent leads
        </h2>
        <Link
          href="/leads"
          className="text-xs font-medium text-wisk-teal hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-4">
        <StaggerList stagger={stagger} as="ul" className="space-y-3">
          {recentLeads.map((lead) => (
            <StaggerItem key={lead.id} stagger={stagger} as="li">
              <Link
                href="/leads"
                className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{lead.name}</p>
                  <LeadStatusBadge status={lead.status} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <LeadSourceBadge source={lead.source} />
                  <span className="truncate text-xs text-muted-foreground">
                    {lead.service_interest}
                  </span>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}
