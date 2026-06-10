"use client";

import { useMemo, useState } from "react";

import { CalendarEventDetailPanel } from "@/components/calendar/calendar-event-detail-panel";
import { ContentCalendarGrid } from "@/components/content/content-calendar-grid";
import { ContentDayDetailPanel } from "@/components/content/content-day-detail-panel";
import { ContentPlatformFilterBar } from "@/components/content/content-platform-filter-bar";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { getMonthGridDateRange, shiftMonth } from "@/lib/calendar/grid";
import type { CalendarEvent } from "@/lib/calendar/types";
import { postHasPlatform } from "@/lib/content/platforms";
import {
  buildContentCalendarEntries,
  contentEntriesByDate,
  contentEntryToCalendarEvent,
} from "@/lib/content/selectors";
import type { ContentCalendarEntry, ContentPlatform, ContentPost } from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";

type ContentCalendarTabProps = {
  posts: ContentPost[];
  contentGoals: Pick<Goal, "id" | "title">[];
};

export function ContentCalendarTab({
  posts,
  contentGoals,
}: ContentCalendarTabProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [activePlatforms, setActivePlatforms] = useState<
    Set<ContentPlatform>
  >(new Set());

  const { openContentAdd } = useQuickAdd();

  const filteredPosts = useMemo(() => {
    if (activePlatforms.size === 0) return posts;

    return posts.filter((post) =>
      Array.from(activePlatforms).some((platform) =>
        postHasPlatform(post, platform)
      )
    );
  }, [posts, activePlatforms]);

  const contentWindow = useMemo(
    () => getMonthGridDateRange(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const entries = useMemo(
    () => buildContentCalendarEntries(filteredPosts, contentWindow),
    [filteredPosts, contentWindow]
  );

  const entriesMap = useMemo(() => contentEntriesByDate(entries), [entries]);

  const selectedEntries = useMemo(
    () => (selectedDate ? (entriesMap.get(selectedDate) ?? []) : []),
    [entriesMap, selectedDate]
  );

  const handleTogglePlatform = (platform: ContentPlatform) => {
    setActivePlatforms((current) => {
      const next = new Set(current);
      if (next.has(platform)) {
        next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
  };

  const handleSelectDate = (dateISO: string) => {
    setSelectedEvent(null);
    setSelectedDate(dateISO);
  };

  const handleSelectEntry = (entry: ContentCalendarEntry) => {
    setSelectedDate(null);
    setSelectedEvent(contentEntryToCalendarEvent(entry));
  };

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
      <div className="space-y-3">
        <ContentPlatformFilterBar
          activePlatforms={activePlatforms}
          onToggle={handleTogglePlatform}
          onClear={() => setActivePlatforms(new Set())}
        />
        <ContentCalendarGrid
          year={viewYear}
          month={viewMonth}
          entries={entries}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          onEntrySelect={handleSelectEntry}
          onAddContent={(dateISO) => openContentAdd(dateISO)}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
        />
      </div>

      {selectedEvent ? (
        <CalendarEventDetailPanel
          selectedEvent={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          projects={[]}
          tasks={[]}
          goals={[]}
          milestones={[]}
          contentPosts={posts}
          standaloneEvents={[]}
          projectOptions={[]}
          contentGoals={contentGoals}
          recentProjectTypes={[]}
        />
      ) : (
        <ContentDayDetailPanel
          selectedDate={selectedDate}
          entries={selectedEntries}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
