"use client";

import {
  CalendarDays,
  CheckSquare,
  Circle,
  Diamond,
  FolderKanban,
  Heart,
  Plus,
  Target,
} from "lucide-react";

import { CalendarEventPill } from "@/components/calendar/calendar-event-pill";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  CALENDAR_TYPE_DOT_CLASS,
  CALENDAR_TYPE_LABELS,
} from "@/lib/calendar/constants";
import { formatFullDay } from "@/lib/calendar/grid";
import { getEventsForDate, groupEventsByType } from "@/lib/calendar/selectors";
import type { CalendarEvent, CalendarEventType } from "@/lib/calendar/types";
import { toDateISO } from "@/lib/overview/date";
import { cn } from "@/lib/utils";

const DAY_VIEW_TYPE_ORDER: CalendarEventType[] = [
  "task",
  "project",
  "goal",
  "content",
  "milestone",
  "lifestyle",
  "other",
];

const TYPE_ICONS: Record<CalendarEventType, typeof FolderKanban> = {
  project: FolderKanban,
  task: CheckSquare,
  goal: Target,
  content: CalendarDays,
  milestone: Diamond,
  lifestyle: Heart,
  other: Circle,
};

const TYPE_BORDER_CLASS: Record<CalendarEventType, string> = {
  project: "border-l-wisk-section-projects",
  task: "border-l-wisk-section-tasks",
  goal: "border-l-amber-400",
  content: "border-l-wisk-coral",
  milestone: "border-l-rose-400",
  lifestyle: "border-l-sky-500",
  other: "border-l-slate-500",
};

function formatEventMeta(event: CalendarEvent): string | null {
  if (!event.meta) return null;
  if (typeof event.meta === "string") return event.meta;
  if (typeof event.meta.platforms === "string" && event.meta.platforms) {
    return event.meta.platforms;
  }
  if (typeof event.meta.projectName === "string" && event.meta.projectName) {
    return event.meta.projectName;
  }
  return null;
}

type CalendarDayViewProps = {
  selectedDate: Date;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  onAddTask?: (dateISO: string) => void;
  onAddContent?: (dateISO: string) => void;
  onAddLifestyle?: (dateISO: string) => void;
  onAddOther?: (dateISO: string) => void;
};

export function CalendarDayView({
  selectedDate,
  events,
  onEventSelect,
  onAddTask,
  onAddContent,
  onAddLifestyle,
  onAddOther,
}: CalendarDayViewProps) {
  const dateISO = toDateISO(selectedDate);
  const dayEvents = getEventsForDate(events, dateISO);
  const grouped = groupEventsByType(dayEvents);
  const showQuickAdd =
    onAddTask || onAddContent || onAddLifestyle || onAddOther;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {formatFullDay(selectedDate)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {dayEvents.length} item{dayEvents.length === 1 ? "" : "s"} scheduled
          </p>
        </div>
        {showQuickAdd ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Add to this day"
                >
                  <Plus className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-44">
              {onAddTask ? (
                <DropdownMenuItem onClick={() => onAddTask(dateISO)}>
                  <CheckSquare className="size-4" />
                  Add task
                </DropdownMenuItem>
              ) : null}
              {onAddContent ? (
                <DropdownMenuItem onClick={() => onAddContent(dateISO)}>
                  <CalendarDays className="size-4" />
                  Add content
                </DropdownMenuItem>
              ) : null}
              {onAddLifestyle ? (
                <DropdownMenuItem onClick={() => onAddLifestyle(dateISO)}>
                  <Heart className="size-4" />
                  Add lifestyle event
                </DropdownMenuItem>
              ) : null}
              {onAddOther ? (
                <DropdownMenuItem onClick={() => onAddOther(dateISO)}>
                  <Circle className="size-4" />
                  Add other event
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {dayEvents.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-12 text-center">
          <CalendarDays
            className="mb-3 size-10 text-muted-foreground"
            aria-hidden
          />
          <p className="max-w-sm text-sm text-muted-foreground">
            Nothing scheduled for this day. Use the + to add something.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {DAY_VIEW_TYPE_ORDER.map((type) => {
            const typeEvents = grouped[type];
            if (typeEvents.length === 0) return null;

            const Icon = TYPE_ICONS[type];
            const metaLabel = CALENDAR_TYPE_LABELS[type];

            return (
              <section key={type}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="size-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {metaLabel}
                  </h3>
                </div>
                <ul className="space-y-2">
                  {typeEvents.map((event) => {
                    const meta = formatEventMeta(event);
                    return (
                      <li key={`${event.type}-${event.id}`}>
                        <button
                          type="button"
                          onClick={() => onEventSelect(event)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card/80 p-4 text-left shadow-sm transition-colors hover:bg-card",
                            "border-l-4",
                            TYPE_BORDER_CLASS[event.type]
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">
                              {event.title}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <CalendarEventPill
                                type={event.type}
                                label={metaLabel}
                                className="inline-block w-auto"
                              />
                              {meta ? (
                                <span className="text-xs text-muted-foreground">
                                  {meta}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "mt-1 size-2 shrink-0 rounded-full",
                              CALENDAR_TYPE_DOT_CLASS[event.type]
                            )}
                            aria-hidden
                          />
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
    </div>
  );
}
