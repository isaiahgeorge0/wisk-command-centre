"use client";

import { useState } from "react";

import { CalendarEventPill } from "@/components/calendar/calendar-event-pill";
import { CALENDAR_MILESTONE_MARKER_CLASS, WEEKDAY_LABELS } from "@/lib/calendar/constants";
import { getWeekDays } from "@/lib/calendar/grid";
import { eventsByDate } from "@/lib/calendar/selectors";
import type { CalendarEvent } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_EVENTS = 4;

type CalendarWeekGridProps = {
  selectedDate: Date;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
};

function WeekDayColumn({
  dayNumber,
  weekdayLabel,
  isToday,
  events,
  onEventSelect,
}: {
  dayNumber: number;
  weekdayLabel: string;
  isToday: boolean;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pillEvents = events.filter((event) => event.type !== "milestone");
  const milestoneEvents = events.filter((event) => event.type === "milestone");
  const combined = [
    ...milestoneEvents.map((event) => ({ kind: "milestone" as const, event })),
    ...pillEvents.map((event) => ({ kind: "pill" as const, event })),
  ];
  const visibleItems = expanded
    ? combined
    : combined.slice(0, MAX_VISIBLE_EVENTS);
  const overflowCount = combined.length - MAX_VISIBLE_EVENTS;

  return (
    <div className="flex min-w-[120px] flex-1 flex-col border-r border-border/50 last:border-r-0">
      <div
        className={cn(
          "border-b border-border/50 px-2 py-2 text-center",
          isToday && "bg-wisk-section-calendar/15"
        )}
      >
        <p
          className={cn(
            "text-[11px] font-medium tracking-wide uppercase",
            isToday ? "text-wisk-section-calendar" : "text-muted-foreground"
          )}
        >
          {weekdayLabel} {dayNumber}
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-1.5">
        {visibleItems.map(({ kind, event }) =>
          kind === "milestone" ? (
            <button
              key={`${event.type}-${event.id}`}
              type="button"
              onClick={() => onEventSelect(event)}
              className={cn(
                "w-full truncate text-left text-[10px] font-medium",
                CALENDAR_MILESTONE_MARKER_CLASS
              )}
              title={event.title}
            >
              ◆ {event.title}
            </button>
          ) : (
            <CalendarEventPill
              key={`${event.type}-${event.id}`}
              type={event.type}
              label={event.title}
              onClick={() => onEventSelect(event)}
            />
          )
        )}
        {!expanded && overflowCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-left text-[10px] font-medium text-muted-foreground hover:text-foreground"
          >
            +{overflowCount} more
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function CalendarWeekGrid({
  selectedDate,
  events,
  onEventSelect,
}: CalendarWeekGridProps) {
  const weekDays = getWeekDays(selectedDate);
  const eventsMap = eventsByDate(events);

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex min-w-[840px]">
        {weekDays.map((day, index) => (
          <WeekDayColumn
            key={day.dateISO}
            dayNumber={day.dayNumber}
            weekdayLabel={WEEKDAY_LABELS[index]!}
            isToday={day.isToday}
            events={eventsMap.get(day.dateISO) ?? []}
            onEventSelect={onEventSelect}
          />
        ))}
      </div>
    </div>
  );
}
