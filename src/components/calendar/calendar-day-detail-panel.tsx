"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  CheckSquare,
  Circle,
  Diamond,
  FolderKanban,
  Heart,
  Target,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getOccurrencesForPost } from "@/app/(dashboard)/content/actions";
import { ContentOccurrencePanel } from "@/components/content/content-occurrence-panel";
import { useIsMobilePanel } from "@/components/calendar/use-is-mobile-panel";
import { Button } from "@/components/ui/button";
import {
  CALENDAR_TYPE_DOT_CLASS,
  CALENDAR_TYPE_LABELS,
  CALENDAR_TYPE_ORDER,
} from "@/lib/calendar/constants";
import { formatSelectedDay } from "@/lib/calendar/grid";
import { groupEventsByType } from "@/lib/calendar/selectors";
import type { CalendarEvent, CalendarEventType } from "@/lib/calendar/types";
import type { ContentPost, ContentPostOccurrence } from "@/lib/content/types";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
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

type CalendarDayDetailPanelProps = {
  selectedDate: string | null;
  events: CalendarEvent[];
  onClose: () => void;
};

function DayDetailContent({
  selectedDate,
  events,
  onClose,
  showCloseButton = true,
  onOccurrenceClick,
}: CalendarDayDetailPanelProps & {
  showCloseButton?: boolean;
  onOccurrenceClick?: (post: ContentPost, occurrenceDate: string) => void;
}) {
  const router = useRouter();
  const grouped = groupEventsByType(events);
  const hasEvents = events.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {formatSelectedDay(selectedDate!)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {events.length} item{events.length === 1 ? "" : "s"}
          </p>
        </div>
        {showCloseButton ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close day details"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {!hasEvents ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing scheduled for this day.
          </p>
        ) : (
          <div className="space-y-5">
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
                    {typeEvents.map((event) => (
                      <li key={`${event.type}-${event.id}`}>
                        <button
                          type="button"
                          onClick={() => {
                            const metaObj =
                              typeof event.meta === "object" ? event.meta : null;
                            if (
                              event.type === "content" &&
                              metaObj?.isRecurring &&
                              metaObj?.post
                            ) {
                              onOccurrenceClick?.(
                                metaObj.post as ContentPost,
                                (metaObj.occurrenceDate as string | undefined) ?? event.date
                              );
                              return;
                            }
                            onClose();
                            router.push(event.href);
                          }}
                          className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
                        >
                          <span
                            className={cn(
                              "mt-1.5 size-2 shrink-0 rounded-full",
                              CALENDAR_TYPE_DOT_CLASS[event.type]
                            )}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-foreground">
                              {event.title}
                            </span>
                            {event.meta ? (
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {typeof event.meta === "string"
                                  ? event.meta
                                  : (event.meta.platforms as string | undefined) ?? ""}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function CalendarDayDetailPanel({
  selectedDate,
  events,
  onClose,
}: CalendarDayDetailPanelProps) {
  const { reduced, transition } = useMotionSafe();
  const isMobile = useIsMobilePanel();
  const open = Boolean(selectedDate);

  const [occurrenceTarget, setOccurrenceTarget] = useState<{
    post: ContentPost;
    occurrenceDate: string;
  } | null>(null);
  const [occurrenceNotes, setOccurrenceNotes] = useState<string | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);

  const handleOccurrenceClick = async (post: ContentPost, occurrenceDate: string) => {
    setOccurrenceTarget({ post, occurrenceDate });
    setNotesLoading(true);
    const occurrences: ContentPostOccurrence[] = await getOccurrencesForPost(post.id);
    const match = occurrences.find((o) => o.occurrence_date === occurrenceDate);
    setOccurrenceNotes(match?.notes ?? null);
    setNotesLoading(false);
  };

  useEffect(() => {
    if (!open || !isMobile) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isMobile]);

  if (isMobile) {
    if (!open || !selectedDate) return null;

    return (
      <>
        <button
          type="button"
          aria-label="Close day details"
          className="fixed inset-0 z-40 bg-black/10 supports-backdrop-filter:backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
        <div className="fixed inset-x-0 bottom-0 z-50 flex min-h-[60vh] max-h-[85dvh] flex-col overflow-y-auto rounded-t-2xl border-t border-border/60 bg-popover pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg md:hidden">
          <DayDetailContent
            selectedDate={selectedDate}
            events={events}
            onClose={onClose}
            onOccurrenceClick={handleOccurrenceClick}
          />
        </div>
      </>
    );
  }

  return (
    <div className="relative hidden h-full min-h-[24rem] md:block md:min-w-[20rem] md:max-w-[20rem] md:flex-1">
      <AnimatePresence mode="wait">
        {open && selectedDate ? (
          <motion.aside
            key={selectedDate}
            initial={reduced ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: 24 }}
            transition={
              reduced
                ? { duration: 0 }
                : {
                    duration: MOTION_DURATION.normal,
                    ease: MOTION_EASE.smooth,
                  }
            }
            className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40"
          >
            <DayDetailContent
              selectedDate={selectedDate}
              events={events}
              onClose={onClose}
              onOccurrenceClick={handleOccurrenceClick}
            />
          </motion.aside>
        ) : (
          <motion.div
            key="placeholder"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            className="flex h-full min-h-[24rem] items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/20 px-6 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Select a day to see what&apos;s due.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <ContentOccurrencePanel
        post={occurrenceTarget?.post ?? null}
        occurrenceDate={occurrenceTarget?.occurrenceDate ?? ""}
        existingNotes={occurrenceNotes}
        open={occurrenceTarget !== null}
        disabled={notesLoading}
        onOpenChange={(open) => {
          if (!open) {
            setOccurrenceTarget(null);
            setOccurrenceNotes(null);
          }
        }}
      />
    </div>
  );
}
