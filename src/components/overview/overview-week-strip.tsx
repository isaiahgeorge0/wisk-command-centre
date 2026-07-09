"use client";

import Link from "next/link";

import { buildOverviewWeekDays } from "@/components/overview/overview-week-strip-utils";
import type { OverviewSnapshot } from "@/lib/overview/selectors";
import { cn } from "@/lib/utils";

type OverviewWeekStripProps = {
  snapshot: OverviewSnapshot;
};

export function OverviewWeekStrip({ snapshot }: OverviewWeekStripProps) {
  const days = buildOverviewWeekDays(snapshot);

  return (
    <section className="mt-10 pb-2 md:hidden" aria-label="This week">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        This week
      </h2>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <Link
            key={day.dateISO}
            href="/calendar"
            className={cn(
              "flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl border px-1 py-2.5 transition-colors",
              day.isToday
                ? "border-wisk-section-winston/50 bg-wisk-section-winston/10"
                : "border-border/60 bg-card/40 text-muted-foreground hover:bg-card/70 hover:text-foreground"
            )}
            aria-label={`${day.weekdayLabel} ${day.dayNumber}${
              day.hasEvents ? ", has events" : ""
            }`}
          >
            <span
              className={cn(
                "text-[11px] font-medium",
                day.isToday ? "text-wisk-section-winston" : "text-muted-foreground"
              )}
            >
              {day.weekdayLabel}
            </span>
            <span
              className={cn(
                "mt-1 flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                day.isToday
                  ? "bg-wisk-section-winston text-wisk-dark"
                  : "text-foreground"
              )}
            >
              {day.dayNumber}
            </span>
            <span
              className={cn(
                "mt-1.5 size-1.5 rounded-full",
                day.hasEvents
                  ? day.isToday
                    ? "bg-wisk-section-winston"
                    : "bg-foreground/70"
                  : "bg-transparent"
              )}
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
