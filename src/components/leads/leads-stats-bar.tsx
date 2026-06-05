"use client";

import { formatLeadValue } from "@/lib/leads/format";
import type { LeadStats } from "@/lib/leads/selectors";
import { monthLabel } from "@/lib/leads/selectors";

type LeadsStatsBarProps = {
  stats: LeadStats;
};

export function LeadsStatsBar({ stats }: LeadsStatsBarProps) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label={`Leads this month (${monthLabel()})`}
        value={String(stats.leadsThisMonth)}
      />
      <StatTile label="Conversion rate" value={`${stats.conversionRate}%`} />
      <StatTile
        label="Pipeline value"
        value={formatLeadValue(stats.pipelineValue)}
      />
      <StatTile
        label="Avg response time"
        value={
          stats.averageResponseDays != null
            ? `${stats.averageResponseDays} days`
            : "—"
        }
      />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
