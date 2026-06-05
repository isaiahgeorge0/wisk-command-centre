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
    <section className="mt-8 md:hidden" aria-label="This week">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <Link
            key={day.dateISO}
            href="/calendar"
            className={cn(
              "flex min-h-14 flex-col items-center justify-center rounded-xl border px-1 py-2 transition-colors",
              day.isToday
                ? "border-wisk-teal/50 bg-wisk-teal/10 text-wisk-teal"
                : "border-border/60 bg-card/40 text-muted-foreground hover:bg-card/70 hover:text-foreground"
            )}
            aria-label={`${day.weekdayLabel} ${day.dayNumber}${
              day.hasEvents ? ", has events" : ""
            }`}
          >
            <span className="text-[10px] font-medium uppercase">
              {day.weekdayLabel}
            </span>
            <span
              className={cn(
                "mt-0.5 text-sm font-semibold tabular-nums",
                day.isToday ? "text-wisk-teal" : "text-foreground"
              )}
            >
              {day.dayNumber}
            </span>
            <span
              className={cn(
                "mt-1 size-1.5 rounded-full",
                day.hasEvents
                  ? day.isToday
                    ? "bg-wisk-teal"
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
