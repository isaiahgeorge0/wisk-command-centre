"use client";

import { ContentCalendarDayCell } from "@/components/content/content-calendar-day-cell";
import { CalendarMonthHeader } from "@/components/calendar/calendar-month-header";
import { WEEKDAY_LABELS } from "@/lib/calendar/constants";
import { getMonthMatrix } from "@/lib/calendar/grid";
import { contentEntriesByDate } from "@/lib/content/selectors";
import type { ContentCalendarEntry } from "@/lib/content/types";

type ContentCalendarGridProps = {
  year: number;
  month: number;
  entries: ContentCalendarEntry[];
  selectedDate: string | null;
  onSelectDate: (dateISO: string) => void;
  onEntrySelect?: (entry: ContentCalendarEntry) => void;
  onAddContent?: (dateISO: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

export function ContentCalendarGrid({
  year,
  month,
  entries,
  selectedDate,
  onSelectDate,
  onEntrySelect,
  onAddContent,
  onPreviousMonth,
  onNextMonth,
}: ContentCalendarGridProps) {
  const weeks = getMonthMatrix(year, month);
  const entriesMap = contentEntriesByDate(entries);

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <div className="border-b border-border/60 px-4 py-3">
        <CalendarMonthHeader
          year={year}
          month={month}
          onPrevious={onPreviousMonth}
          onNext={onNextMonth}
        />
      </div>

      <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-r border-border/50 px-2 py-2 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      <div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((day) => (
              <ContentCalendarDayCell
                key={day.dateISO}
                day={day}
                entries={entriesMap.get(day.dateISO) ?? []}
                selected={selectedDate === day.dateISO}
                onSelect={onSelectDate}
                onEntrySelect={onEntrySelect}
                onAddContent={onAddContent}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
