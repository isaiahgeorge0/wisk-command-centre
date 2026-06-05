"use client";

import { ContentCalendarPill } from "@/components/content/content-calendar-pill";
import type { ContentCalendarEntry } from "@/lib/content/types";
import type { CalendarDay } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

type ContentCalendarDayCellProps = {
  day: CalendarDay;
  entries: ContentCalendarEntry[];
  selected: boolean;
  onSelect: (dateISO: string) => void;
};

const MAX_VISIBLE = 4;

export function ContentCalendarDayCell({
  day,
  entries,
  selected,
  onSelect,
}: ContentCalendarDayCellProps) {
  const visible = entries.slice(0, MAX_VISIBLE);
  const overflow = entries.length - visible.length;

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
        {visible.map((entry) => (
          <ContentCalendarPill
            key={`${entry.post.id}-${entry.kind}`}
            post={entry.post}
            label={entry.post.title}
          />
        ))}
        {overflow > 0 ? (
          <span className="px-1 text-[10px] font-medium text-muted-foreground">
            +{overflow} more
          </span>
        ) : null}
      </div>
    </button>
  );
}
