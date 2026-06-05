"use client";

import { X } from "lucide-react";

import { ContentPlatformBadges } from "@/components/content/content-platform-badges";
import { ContentStatusBadge } from "@/components/content/content-status-badge";
import { ContentTypeBadge } from "@/components/content/content-type-badge";
import { Button } from "@/components/ui/button";
import { formatContentDate } from "@/lib/content/format";
import { formatSelectedDay } from "@/lib/calendar/grid";
import type { ContentCalendarEntry } from "@/lib/content/types";

type ContentDayDetailPanelProps = {
  selectedDate: string | null;
  entries: ContentCalendarEntry[];
  onClose: () => void;
};

export function ContentDayDetailPanel({
  selectedDate,
  entries,
  onClose,
}: ContentDayDetailPanelProps) {
  if (!selectedDate) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/20 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Select a day to see scheduled and published content.
        </p>
      </div>
    );
  }

  return (
    <aside className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {formatSelectedDay(selectedDate)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {entries.length} item{entries.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close day details"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="max-h-[28rem] overflow-y-auto px-4 py-3">
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No content for this day.
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={`${entry.post.id}-${entry.kind}`}
                className="rounded-lg border border-border/50 bg-card/60 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ContentPlatformBadges post={entry.post} />
                  <ContentTypeBadge contentType={entry.post.content_type} />
                  <ContentStatusBadge status={entry.post.status} />
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {entry.post.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.kind === "published" ? "Published" : "Scheduled"}
                  {entry.kind === "published" && entry.post.published_date
                    ? ` · ${formatContentDate(entry.post.published_date)}`
                    : entry.post.scheduled_date
                      ? ` · ${formatContentDate(entry.post.scheduled_date)}`
                      : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
