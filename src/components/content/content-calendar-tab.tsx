"use client";

import { useMemo, useState } from "react";

import { ContentCalendarGrid } from "@/components/content/content-calendar-grid";
import { ContentDayDetailPanel } from "@/components/content/content-day-detail-panel";
import { ContentPlatformFilterBar } from "@/components/content/content-platform-filter-bar";
import { shiftMonth } from "@/lib/calendar/grid";
import { postHasPlatform } from "@/lib/content/platforms";
import {
  buildContentCalendarEntries,
  contentEntriesByDate,
} from "@/lib/content/selectors";
import type { ContentPlatform, ContentPost } from "@/lib/content/types";

type ContentCalendarTabProps = {
  posts: ContentPost[];
};

export function ContentCalendarTab({ posts }: ContentCalendarTabProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activePlatforms, setActivePlatforms] = useState<
    Set<ContentPlatform>
  >(new Set());

  const filteredPosts = useMemo(() => {
    if (activePlatforms.size === 0) return posts;

    return posts.filter((post) =>
      Array.from(activePlatforms).some((platform) =>
        postHasPlatform(post, platform)
      )
    );
  }, [posts, activePlatforms]);

  const entries = useMemo(
    () => buildContentCalendarEntries(filteredPosts),
    [filteredPosts]
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
          onSelectDate={setSelectedDate}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
        />
      </div>
      <ContentDayDetailPanel
        selectedDate={selectedDate}
        entries={selectedEntries}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  );
}
