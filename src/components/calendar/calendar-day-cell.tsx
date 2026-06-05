"use client";

import { CalendarEventPill } from "@/components/calendar/calendar-event-pill";
import { CALENDAR_MILESTONE_MARKER_CLASS } from "@/lib/calendar/constants";
import type { CalendarDay, CalendarEvent } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

type CalendarDayCellProps = {
  day: CalendarDay;
  events: CalendarEvent[];
  selected: boolean;
  onSelect: (dateISO: string) => void;
};

const MAX_VISIBLE_ITEMS = 4;

export function CalendarDayCell({
  day,
  events,
  selected,
  onSelect,
}: CalendarDayCellProps) {
  const pillEvents = events.filter((event) => event.type !== "milestone");
  const milestoneEvents = events.filter((event) => event.type === "milestone");
  const combined = [
    ...milestoneEvents.map((event) => ({ kind: "milestone" as const, event })),
    ...pillEvents.map((event) => ({ kind: "pill" as const, event })),
  ];
  const visibleItems = combined.slice(0, MAX_VISIBLE_ITEMS);
  const overflowCount = combined.length - visibleItems.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(day.dateISO)}
      className={cn(
        "flex min-h-[5.5rem] flex-col gap-1 border-b border-r border-border/50 p-1.5 text-left transition-colors hover:bg-muted/40 md:min-h-[6.5rem] md:p-2",
        !day.isCurrentMonth && "bg-muted/20 text-muted-foreground/70",
        day.isToday &&
          "bg-wisk-teal/10 ring-1 ring-inset ring-wisk-teal/30",
        selected && "bg-muted/60 ring-1 ring-inset ring-wisk-purple/40"
      )}
    >
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
          day.isToday && "bg-wisk-teal text-white",
          !day.isToday && day.isCurrentMonth && "text-foreground",
          !day.isCurrentMonth && "text-muted-foreground/60"
        )}
      >
        {day.dayNumber}
      </span>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
        {visibleItems.map(({ kind, event }) =>
          kind === "milestone" ? (
            <span
              key={`${event.type}-${event.id}`}
              className="flex min-w-0 items-center gap-1 px-0.5"
              title={event.title}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rotate-45 rounded-[1px] bg-rose-400",
                  CALENDAR_MILESTONE_MARKER_CLASS
                )}
                aria-hidden
              />
              <span className="truncate text-[10px] font-medium text-rose-500 dark:text-rose-400">
                {event.title}
              </span>
            </span>
          ) : (
            <CalendarEventPill
              key={`${event.type}-${event.id}`}
              type={event.type}
              label={event.title}
            />
          )
        )}
        {overflowCount > 0 ? (
          <span className="px-1 text-[10px] font-medium text-muted-foreground">
            +{overflowCount} more
          </span>
        ) : null}
      </div>
    </button>
  );
}
