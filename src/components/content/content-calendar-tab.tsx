"use client";

import { useMemo, useState } from "react";

import { ContentCalendarGrid } from "@/components/content/content-calendar-grid";
import { ContentDayDetailPanel } from "@/components/content/content-day-detail-panel";
import { shiftMonth } from "@/lib/calendar/grid";
import {
  buildContentCalendarEntries,
  contentEntriesByDate,
} from "@/lib/content/selectors";
import type { ContentPost } from "@/lib/content/types";

type ContentCalendarTabProps = {
  posts: ContentPost[];
};

export function ContentCalendarTab({ posts }: ContentCalendarTabProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const entries = useMemo(
    () => buildContentCalendarEntries(posts),
    [posts]
  );

  const entriesMap = useMemo(() => contentEntriesByDate(entries), [entries]);

  const selectedEntries = useMemo(
    () => (selectedDate ? (entriesMap.get(selectedDate) ?? []) : []),
    [entriesMap, selectedDate]
  );

  const handlePreviousMonth = () => {
    const next = shiftMonth(viewYear, viewMonth, -1);
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  const handleNextMonth = () => {
    const next = shiftMonth(viewYear, viewMonth, 1);
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <ContentCalendarGrid
        year={viewYear}
        month={viewMonth}
        entries={entries}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
      />
      <ContentDayDetailPanel
        selectedDate={selectedDate}
        entries={selectedEntries}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  );
}
