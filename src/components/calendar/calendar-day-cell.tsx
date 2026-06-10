"use client";

import { Calendar, CheckSquare, Circle, Heart, Plus } from "lucide-react";

import { CalendarEventPill } from "@/components/calendar/calendar-event-pill";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CALENDAR_MILESTONE_MARKER_CLASS } from "@/lib/calendar/constants";
import type { CalendarDay, CalendarEvent } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

type CalendarDayCellProps = {
  day: CalendarDay;
  events: CalendarEvent[];
  selected: boolean;
  onSelect: (dateISO: string) => void;
  onEventSelect?: (event: CalendarEvent) => void;
  onAddTask?: (dateISO: string) => void;
  onAddContent?: (dateISO: string) => void;
  onAddLifestyle?: (dateISO: string) => void;
  onAddOther?: (dateISO: string) => void;
};

const MAX_VISIBLE_ITEMS = 4;

export function CalendarDayCell({
  day,
  events,
  selected,
  onSelect,
  onEventSelect,
  onAddTask,
  onAddContent,
  onAddLifestyle,
  onAddOther,
}: CalendarDayCellProps) {
  const pillEvents = events.filter((event) => event.type !== "milestone");
  const milestoneEvents = events.filter((event) => event.type === "milestone");
  const combined = [
    ...milestoneEvents.map((event) => ({ kind: "milestone" as const, event })),
    ...pillEvents.map((event) => ({ kind: "pill" as const, event })),
  ];
  const visibleItems = combined.slice(0, MAX_VISIBLE_ITEMS);
  const overflowCount = combined.length - visibleItems.length;
  const showQuickAdd =
    onAddTask || onAddContent || onAddLifestyle || onAddOther;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(day.dateISO)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(day.dateISO);
        }
      }}
      className={cn(
        "group relative flex min-h-[5.5rem] cursor-pointer flex-col gap-1 border-b border-r border-border/50 p-1.5 text-left transition-colors hover:bg-muted/40 md:min-h-[6.5rem] md:p-2",
        !day.isCurrentMonth && "bg-muted/20 text-muted-foreground/70",
        day.isToday &&
          "bg-wisk-teal/10 ring-1 ring-inset ring-wisk-teal/30",
        selected && "bg-muted/60 ring-1 ring-inset ring-wisk-purple/40"
      )}
    >
      <div className="flex items-start justify-between gap-0.5">
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

        {showQuickAdd ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              aria-label={`Add to ${day.dateISO}`}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                "flex size-[18px] shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-wisk-teal/10 hover:text-wisk-teal focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wisk-teal/40",
                "opacity-100 md:opacity-0 md:group-hover:opacity-100",
                selected && "md:opacity-100"
              )}
            >
              <Plus className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              onClick={(e) => e.stopPropagation()}
            >
              {onAddTask ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddTask(day.dateISO);
                  }}
                >
                  <CheckSquare className="size-4" />
                  Add task
                </DropdownMenuItem>
              ) : null}
              {onAddContent ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddContent(day.dateISO);
                  }}
                >
                  <Calendar className="size-4" />
                  Add content
                </DropdownMenuItem>
              ) : null}
              {onAddLifestyle ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddLifestyle(day.dateISO);
                  }}
                >
                  <Heart className="size-4" />
                  Add lifestyle/personal
                </DropdownMenuItem>
              ) : null}
              {onAddOther ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddOther(day.dateISO);
                  }}
                >
                  <Circle className="size-4" />
                  Add other
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
        {visibleItems.map(({ kind, event }) =>
          kind === "milestone" ? (
            <button
              key={`${event.type}-${event.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEventSelect?.(event);
              }}
              className="flex min-w-0 items-center gap-1 px-0.5 text-left hover:opacity-80"
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
            </button>
          ) : (
            <CalendarEventPill
              key={`${event.type}-${event.id}`}
              type={event.type}
              label={event.title}
              onClick={() => onEventSelect?.(event)}
            />
          )
        )}
        {overflowCount > 0 ? (
          <span className="px-1 text-[10px] font-medium text-muted-foreground">
            +{overflowCount} more
          </span>
        ) : null}
      </div>
    </div>
  );
}
