"use client";

import { Flame } from "lucide-react";

import type { ContentStats } from "@/lib/content/selectors";
import { cn } from "@/lib/utils";

type ContentStatsBarProps = {
  stats: ContentStats;
};

export function ContentStatsBar({ stats }: ContentStatsBarProps) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
