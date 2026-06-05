"use client";

import { Flame } from "lucide-react";
import Link from "next/link";

import { AnimatedNumber } from "@/components/motion/animated-number";
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
        "rounded-xl border bg-card/80 p-3 sm:p-4 transition-colors hover:bg-card",
        alert
          ? "border-red-500/40 bg-red-500/5 hover:border-red-500/50"
          : "border-border/60 hover:border-border"
      )}
    >
      <p className="text-[11px] font-medium leading-snug tracking-wide text-muted-foreground uppercase sm:text-xs">
        {label}
      </p>
      <AnimatedNumber
        value={value}
        className={cn(
          "mt-2 block text-2xl font-semibold tabular-nums sm:text-3xl",
          alert ? "text-red-400" : "text-foreground"
        )}
      />
    </Link>
  );
}

type ContentStatCardProps = {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
  suffix?: string;
};

function ContentStatCard({
  label,
  value,
  href,
  highlight,
  suffix = "",
}: ContentStatCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-xl border p-3 sm:p-4 transition-colors hover:bg-card",
        highlight
          ? "border-orange-500/30 bg-orange-500/[0.06] hover:border-orange-500/40"
          : "border-border/60 bg-card/80 hover:border-border"
      )}
    >
      <p className="text-[11px] font-medium leading-snug tracking-wide text-muted-foreground uppercase sm:text-xs">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        {highlight ? (
          <Flame className="size-5 shrink-0 text-orange-400" aria-hidden />
        ) : null}
        <AnimatedNumber
          value={value}
          className={cn(
            "text-2xl font-semibold tabular-nums sm:text-3xl",
            highlight ? "text-orange-300" : "text-foreground"
          )}
        />
        {suffix ? (
          <span
            className={cn(
              "text-sm font-medium",
              highlight ? "text-orange-300/80" : "text-muted-foreground"
            )}
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

type OverviewStatCardsProps = {
  stats: OverviewStats;
};

export function OverviewStatCards({ stats }: OverviewStatCardsProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <ContentStatCard
          label="Published this month"
          value={stats.contentPublishedThisMonth}
          href="/content"
        />
        <ContentStatCard
          label="Scheduled upcoming"
          value={stats.contentScheduled}
          href="/content"
        />
        <ContentStatCard
          label="In progress"
          value={stats.contentInProgress}
          href="/content"
        />
        <ContentStatCard
          label="Content streak"
          value={stats.contentStreak}
          href="/content"
          highlight
          suffix={stats.contentStreak === 1 ? "day" : "days"}
        />
      </div>
    </div>
  );
}
