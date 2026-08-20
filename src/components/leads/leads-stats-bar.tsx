"use client";

import { formatPipelineValueSplit } from "@/lib/leads/format";
import type { LeadStats } from "@/lib/leads/selectors";
import { monthLabel } from "@/lib/leads/selectors";
import { cn } from "@/lib/utils";

type LeadsStatsBarProps = {
  stats: LeadStats;
};

export function LeadsStatsBar({ stats }: LeadsStatsBarProps) {
  const pipelineLabel = formatPipelineValueSplit(stats.pipelineValue);
  const pipelineIsSplit =
    stats.pipelineValue.oneTime > 0 && stats.pipelineValue.monthly > 0;

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
        value={pipelineLabel}
        compact={pipelineIsSplit}
        accent="#aca0ff"
      />
      <StatTile
        label="Avg response time"
        value={
          stats.averageResponseDays != null
            ? `${stats.averageResponseDays} days`
            : "-"
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
  compact,
}: {
  label: string;
  value: string;
  accent?: string;
  compact?: boolean;
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
      <p
        className={cn(
          "mt-2 font-bold tabular-nums text-foreground",
          compact ? "text-sm leading-snug sm:text-base" : "text-2xl"
        )}
      >
        {value}
      </p>
    </div>
  );
}
