"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { CalendarViewSwitcher } from "@/components/calendar/calendar-view-switcher";
import { Button } from "@/components/ui/button";
import type { CalendarView } from "@/lib/calendar/views";

type CalendarViewToolbarProps = {
  title: string;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrevious: () => void;
  onNext: () => void;
  previousLabel: string;
  nextLabel: string;
  showToday?: boolean;
  onToday?: () => void;
};

export function CalendarViewToolbar({
  title,
  view,
  onViewChange,
  onPrevious,
  onNext,
  previousLabel,
  nextLabel,
  showToday = false,
  onToday,
}: CalendarViewToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {title ? (
        <h2 className="text-base font-semibold text-foreground md:text-lg">
          {title}
        </h2>
      ) : (
        <div className="hidden sm:block sm:flex-1" />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {showToday && onToday ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToday}
            className="h-8"
          >
            Today
          </Button>
        ) : null}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={previousLabel}
            onClick={onPrevious}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={nextLabel}
            onClick={onNext}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <CalendarViewSwitcher view={view} onChange={onViewChange} />
      </div>
    </div>
  );
}
