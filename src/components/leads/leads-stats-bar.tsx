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
        accent="#ff5d00"
      />
      <StatTile
        label="Conversion rate"
        value={`${stats.conversionRate}%`}
        accent="#baf7e1"
      />
      <StatTile
        label="Pipeline value"
        value={formatLeadValue(stats.pipelineValue)}
        accent="#aca0ff"
      />
      <StatTile
        label="Avg response time"
        value={
          stats.averageResponseDays != null
            ? `${stats.averageResponseDays} days`
            : "—"
        }
        accent="#2dd4bf"
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/60 px-4 py-4">
      {accent ? (
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: accent }}
        />
      ) : null}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
