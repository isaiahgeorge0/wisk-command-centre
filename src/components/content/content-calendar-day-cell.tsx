"use client";

import { Plus } from "lucide-react";

import { ContentCalendarPill } from "@/components/content/content-calendar-pill";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ContentCalendarEntry } from "@/lib/content/types";
import type { CalendarDay } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

type ContentCalendarDayCellProps = {
  day: CalendarDay;
  entries: ContentCalendarEntry[];
  selected: boolean;
  onSelect: (dateISO: string) => void;
  onEntrySelect?: (entry: ContentCalendarEntry) => void;
  onAddContent?: (dateISO: string) => void;
};

const MAX_VISIBLE = 4;

export function ContentCalendarDayCell({
  day,
  entries,
  selected,
  onSelect,
  onEntrySelect,
  onAddContent,
}: ContentCalendarDayCellProps) {
  const visible = entries.slice(0, MAX_VISIBLE);
  const overflow = entries.length - visible.length;

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
          "bg-wisk-section-content/10 ring-1 ring-inset ring-wisk-section-content/30",
        selected && "bg-muted/60 ring-1 ring-inset ring-wisk-section-content/40"
      )}
    >
      <div className="flex items-start justify-between gap-0.5">
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
            day.isToday && "bg-wisk-section-content text-wisk-dark",
            !day.isToday && day.isCurrentMonth && "text-foreground",
            !day.isCurrentMonth && "text-muted-foreground/60"
          )}
        >
          {day.dayNumber}
        </span>

        {onAddContent ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              aria-label={`Add content for ${day.dateISO}`}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                "flex size-[18px] shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-wisk-section-content/10 hover:text-wisk-section-content focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wisk-section-content/40",
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
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onAddContent(day.dateISO);
                }}
              >
                Add content
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
        {visible.map((entry) => (
          <ContentCalendarPill
            key={`${entry.post.id}-${entry.kind}`}
            post={entry.post}
            label={entry.post.title}
            onClick={() => onEntrySelect?.(entry)}
          />
        ))}
        {overflow > 0 ? (
          <span className="px-1 text-[10px] font-medium text-muted-foreground">
            +{overflow} more
          </span>
        ) : null}
      </div>
    </div>
  );
}
