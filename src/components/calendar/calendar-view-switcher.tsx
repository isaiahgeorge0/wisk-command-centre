"use client";

import type { CalendarView } from "@/lib/calendar/views";
import { cn } from "@/lib/utils";

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
];

type CalendarViewSwitcherProps = {
  view: CalendarView;
  onChange: (view: CalendarView) => void;
};

export function CalendarViewSwitcher({
  view,
  onChange,
}: CalendarViewSwitcherProps) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-lg border border-border/60">
      {VIEWS.map((item, index) => {
        const isActive = view === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition-colors",
              index === 0 && "rounded-l-lg",
              index === VIEWS.length - 1 && "rounded-r-lg",
              isActive
                ? "bg-wisk-section-calendar text-white"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
