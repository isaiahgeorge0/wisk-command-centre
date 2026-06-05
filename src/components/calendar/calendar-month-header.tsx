"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMonthYear } from "@/lib/calendar/grid";

type CalendarMonthHeaderProps = {
  year: number;
  month: number;
  onPrevious: () => void;
  onNext: () => void;
};

export function CalendarMonthHeader({
  year,
  month,
  onPrevious,
  onNext,
}: CalendarMonthHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-foreground md:text-lg">
        {formatMonthYear(year, month)}
      </h2>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
          onClick={onPrevious}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
          onClick={onNext}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
