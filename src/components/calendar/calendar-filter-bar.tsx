"use client";

import {
  CALENDAR_FILTER_ACTIVE_CLASS,
  CALENDAR_FILTER_INACTIVE_CLASS,
  CALENDAR_TYPE_LABELS,
} from "@/lib/calendar/constants";
import { CALENDAR_EVENT_TYPES } from "@/lib/calendar/types";
import type { CalendarFilterState } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

type CalendarFilterBarProps = {
  filters: CalendarFilterState;
  onToggle: (type: (typeof CALENDAR_EVENT_TYPES)[number]) => void;
};

export function CalendarFilterBar({ filters, onToggle }: CalendarFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CALENDAR_EVENT_TYPES.map((type) => {
        const active = filters[type];

        return (
          <button
            key={type}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(type)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? CALENDAR_FILTER_ACTIVE_CLASS[type]
                : CALENDAR_FILTER_INACTIVE_CLASS[type]
            )}
          >
            {CALENDAR_TYPE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
