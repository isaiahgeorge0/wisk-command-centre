"use client";

import { Flame } from "lucide-react";

import { ContentPlatformBadge } from "@/components/content/content-platform-badge";
import type { ContentStats } from "@/lib/content/selectors";
import { cn } from "@/lib/utils";

type ContentStatsBarProps = {
  stats: ContentStats;
};

export function ContentStatsBar({ stats }: ContentStatsBarProps) {
  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Published this month"
          value={String(stats.publishedThisMonth)}
        />
        <StatTile
          label="Scheduled upcoming"
          value={String(stats.scheduledUpcoming)}
        />
        <StatTile label="In progress" value={String(stats.inProgress)} />
        <StatTile
          label="Content streak"
          value={String(stats.streak)}
          highlight
          icon={<Flame className="size-4 text-orange-400" aria-hidden />}
          suffix={stats.streak === 1 ? " day" : " days"}
        />
      </div>

      {stats.platformBreakdown.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-4 py-2.5">
          <span className="text-xs text-muted-foreground">By platform</span>
          {stats.platformBreakdown.map(({ platform, count }) => (
            <span key={platform} className="inline-flex items-center gap-1.5">
              <ContentPlatformBadge platform={platform} />
              <span className="text-xs font-medium tabular-nums text-foreground">
                {count}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatTile({
  label,
  value,
  highlight,
  icon,
  suffix = "",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: React.ReactNode;
  suffix?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        highlight
          ? "border-orange-500/30 bg-orange-500/[0.06]"
          : "border-border/60 bg-card/40"
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {icon}
        <p
          className={cn(
            "text-lg font-semibold tabular-nums",
            highlight ? "text-orange-300" : "text-foreground"
          )}
        >
          {value}
          {suffix}
        </p>
      </div>
    </div>
  );
}
