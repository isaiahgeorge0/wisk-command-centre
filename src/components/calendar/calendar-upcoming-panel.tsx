"use client";

import {
  Calendar,
  CheckSquare,
  Circle,
  Diamond,
  FolderKanban,
  Heart,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CALENDAR_TYPE_DOT_CLASS,
  CALENDAR_TYPE_LABELS,
  CALENDAR_TYPE_ORDER,
} from "@/lib/calendar/constants";
import {
  countEventsInWindow,
  eventsInWindow,
  formatDaysRemaining,
  getUrgency,
  groupEventsByType,
} from "@/lib/calendar/selectors";
import type { CalendarEvent, CalendarEventType, UpcomingWindow } from "@/lib/calendar/types";
import { formatShortDueDate } from "@/lib/overview/date";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<CalendarEventType, typeof FolderKanban> = {
  project: FolderKanban,
  task: CheckSquare,
  goal: Target,
  content: Calendar,
  milestone: Diamond,
  lifestyle: Heart,
  other: Circle,
};

const UPCOMING_WINDOWS: UpcomingWindow[] = [30, 60, 90];

const URGENCY_TEXT_CLASS = {
  overdue: "text-red-400",
  today: "text-amber-400",
  upcoming: "text-muted-foreground",
} as const;

type CalendarUpcomingPanelProps = {
  events: CalendarEvent[];
  todayISO: string;
};

export function CalendarUpcomingPanel({
  events,
  todayISO,
}: CalendarUpcomingPanelProps) {
  const router = useRouter();
  const [activeWindow, setActiveWindow] = useState<UpcomingWindow>(30);

  const windowCounts = useMemo(
    () =>
      Object.fromEntries(
        UPCOMING_WINDOWS.map((window) => [
          window,
          countEventsInWindow(events, todayISO, window),
        ])
      ) as Record<UpcomingWindow, number>,
    [events, todayISO]
  );

  const windowEvents = useMemo(
    () => eventsInWindow(events, todayISO, activeWindow),
    [events, todayISO, activeWindow]
  );

  const grouped = groupEventsByType(windowEvents);

  return (
    <Card className="border-border/60 bg-card/40">
      <CardHeader className="border-b border-border/60">
        <CardTitle>Upcoming</CardTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          {UPCOMING_WINDOWS.map((window) => {
            const active = activeWindow === window;
            const count = windowCounts[window];

            return (
              <button
                key={window}
                type="button"
                onClick={() => setActiveWindow(window)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-wisk-section-calendar/40 bg-wisk-section-calendar/15 text-wisk-section-calendar"
                    : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {window} days ({count})
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="px-4 pt-4">
        {windowEvents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No upcoming items in the next {activeWindow} days.
          </p>
        ) : (
          <div className="space-y-6">
            {CALENDAR_TYPE_ORDER.map((type) => {
              const typeEvents = grouped[type];
              if (typeEvents.length === 0) return null;

              const Icon = TYPE_ICONS[type];

              return (
                <section key={type}>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="size-3.5 text-muted-foreground" />
                    <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {CALENDAR_TYPE_LABELS[type]}
                    </h3>
                  </div>
                  <ul className="space-y-1">
                    {typeEvents.map((event) => {
                      const urgency = getUrgency(event.date, todayISO);

                      return (
                        <li key={`${event.type}-${event.id}`}>
                          <button
                            type="button"
                            onClick={() => router.push(event.href)}
                            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
                          >
                            <span
                              className={cn(
                                "size-2 shrink-0 rounded-full",
                                CALENDAR_TYPE_DOT_CLASS[event.type]
                              )}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {event.title}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {CALENDAR_TYPE_LABELS[event.type]} ·{" "}
                                {formatShortDueDate(event.date)}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "shrink-0 text-xs font-medium",
                                URGENCY_TEXT_CLASS[urgency]
                              )}
                            >
                              {formatDaysRemaining(event.date, todayISO)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
