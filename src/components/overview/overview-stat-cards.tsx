import Link from "next/link";

import { cn } from "@/lib/utils";
import type { OverviewStats } from "@/lib/overview/selectors";

type StatCardProps = {
  label: string;
  value: number;
  href: string;
  alert?: boolean;
};

function StatCard({ label, value, href, alert }: StatCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-xl border bg-card/80 p-4 transition-colors hover:bg-card",
        alert
          ? "border-red-500/40 bg-red-500/5 hover:border-red-500/50"
          : "border-border/60 hover:border-border"
      )}
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold tabular-nums",
          alert ? "text-red-400" : "text-foreground"
        )}
      >
        {value}
      </p>
    </Link>
  );
}

type OverviewStatCardsProps = {
  stats: OverviewStats;
};

export function OverviewStatCards({ stats }: OverviewStatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Active projects"
        value={stats.activeProjects}
        href="/projects"
      />
      <StatCard
        label="Due today or overdue"
        value={stats.tasksDueTodayOrOverdue}
        href="/tasks"
        alert={stats.tasksDueTodayOrOverdue > 0}
      />
      <StatCard
        label="Goals in progress"
        value={stats.activeGoals}
        href="/goals"
      />
      <StatCard
        label="Ideas in bank"
        value={stats.ideasCount}
        href="/ideas"
      />
    </div>
  );
}
