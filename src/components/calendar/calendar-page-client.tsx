"use client";

import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

import { CalendarDayDetailPanel } from "@/components/calendar/calendar-day-detail-panel";
import { CalendarEventDetailPanel } from "@/components/calendar/calendar-event-detail-panel";
import { CalendarEventFormDialog } from "@/components/calendar/calendar-event-form-dialog";
import { CalendarFilterBar } from "@/components/calendar/calendar-filter-bar";
import { CalendarMonthGrid } from "@/components/calendar/calendar-month-grid";
import { CalendarUpcomingPanel } from "@/components/calendar/calendar-upcoming-panel";
import { PageTransition } from "@/components/layout/page-transition";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { DEFAULT_CALENDAR_FILTERS } from "@/lib/calendar/constants";
import { getCalendarContentWindow, getMonthGridDateRange, shiftMonth } from "@/lib/calendar/grid";
import { compareDateISO } from "@/lib/overview/date";
import {
  buildCalendarEvents,
  filterCalendarEvents,
  getEventsForDate,
  getTodayISO,
} from "@/lib/calendar/selectors";
import type {
  CalendarEvent,
  CalendarEventType,
  CalendarFilterState,
  StandaloneCalendarEvent,
} from "@/lib/calendar/types";
import type { ContentPost } from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";
import { getRecentProjectTypes } from "@/lib/projects/recent-project-types";
import type { ProjectMilestone } from "@/lib/projects/milestones/types";
import type { Project } from "@/lib/projects/types";
import type { TaskWithProject } from "@/lib/tasks/types";

type CalendarPageClientProps = {
  projects: Project[];
  tasks: TaskWithProject[];
  goals: Goal[];
  milestones: ProjectMilestone[];
  contentPosts: ContentPost[];
  standaloneEvents: StandaloneCalendarEvent[];
  contentGoals: Pick<Goal, "id" | "title">[];
};

export function CalendarPageClient({
  projects,
  tasks,
  goals,
  milestones,
  contentPosts,
  standaloneEvents,
  contentGoals,
}: CalendarPageClientProps) {
  const todayISO = getTodayISO();
  const today = new Date();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [filters, setFilters] = useState<CalendarFilterState>(
    DEFAULT_CALENDAR_FILTERS
  );
  const [standaloneDialog, setStandaloneDialog] = useState<{
    open: boolean;
    date: string | null;
    eventType: "lifestyle" | "other" | null;
  }>({ open: false, date: null, eventType: null });

  const { openTaskAdd, openContentAdd } = useQuickAdd();

  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        id: project.id,
        project_name: project.project_name,
      })),
    [projects]
  );

  const recentProjectTypes = useMemo(
    () => getRecentProjectTypes(projects),
    [projects]
  );

  const contentWindow = useMemo(
    () => getCalendarContentWindow(viewYear, viewMonth, todayISO),
    [viewYear, viewMonth, todayISO]
  );

  const allEvents = useMemo(
    () =>
      buildCalendarEvents(
        projects,
        tasks,
        goals,
        milestones,
        contentPosts,
        { contentWindow, standaloneEvents }
      ),
    [
      projects,
      tasks,
      goals,
      milestones,
      contentPosts,
      contentWindow,
      standaloneEvents,
    ]
  );

  const filteredEvents = useMemo(
    () => filterCalendarEvents(allEvents, filters),
    [allEvents, filters]
  );

  const selectedDayEvents = useMemo(
    () =>
      selectedDate
        ? getEventsForDate(filteredEvents, selectedDate)
        : [],
    [filteredEvents, selectedDate]
  );

  const monthRange = useMemo(
    () => getMonthGridDateRange(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const hasEventsThisMonth = useMemo(
    () =>
      filteredEvents.some(
        (event) =>
          compareDateISO(event.date, monthRange.start) >= 0 &&
          compareDateISO(event.date, monthRange.end) <= 0
      ),
    [filteredEvents, monthRange]
  );

  const handleToggleFilter = (type: CalendarEventType) => {
    setFilters((current) => ({
      ...current,
      [type]: !current[type],
    }));
  };

  const handleSelectDate = (dateISO: string) => {
    setSelectedEvent(null);
    setSelectedDate(dateISO);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedDate(null);
    setSelectedEvent(event);
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

  const openStandaloneAdd = (
    dateISO: string,
    eventType: "lifestyle" | "other"
  ) => {
    setStandaloneDialog({ open: true, date: dateISO, eventType });
  };

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className={PAGE_TITLE_CLASS}>Calendar</h1>
        <p className={PAGE_SUBTITLE_CLASS}>
          Deadlines, due dates, and milestones across projects, tasks, and
          goals.
        </p>
      </div>

      <div className="mb-4">
        <CalendarFilterBar filters={filters} onToggle={handleToggleFilter} />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <CalendarMonthGrid
            year={viewYear}
            month={viewMonth}
            events={filteredEvents}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onEventSelect={handleSelectEvent}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onAddTask={(dateISO) => openTaskAdd(dateISO)}
            onAddContent={(dateISO) => openContentAdd(dateISO)}
            onAddLifestyle={(dateISO) => openStandaloneAdd(dateISO, "lifestyle")}
            onAddOther={(dateISO) => openStandaloneAdd(dateISO, "other")}
          />
          {!hasEventsThisMonth ? (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <CalendarDays
                className="mb-2 size-8 text-muted-foreground"
                aria-hidden
              />
              <p className="max-w-md text-sm text-muted-foreground">
                Nothing scheduled this month. Use the + on any day to add a task,
                content post, or personal event.
              </p>
            </div>
          ) : null}
        </div>

        {selectedEvent ? (
          <CalendarEventDetailPanel
            selectedEvent={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            projects={projects}
            tasks={tasks}
            goals={goals}
            milestones={milestones}
            contentPosts={contentPosts}
            standaloneEvents={standaloneEvents}
            projectOptions={projectOptions}
            contentGoals={contentGoals}
            recentProjectTypes={recentProjectTypes}
          />
        ) : (
          <CalendarDayDetailPanel
            selectedDate={selectedDate}
            events={selectedDayEvents}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </div>

      <div className="mt-8">
        <CalendarUpcomingPanel events={filteredEvents} todayISO={todayISO} />
      </div>

      <CalendarEventFormDialog
        open={standaloneDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setStandaloneDialog({ open: false, date: null, eventType: null });
          }
        }}
        prefillDate={standaloneDialog.date}
        prefillEventType={standaloneDialog.eventType}
      />
    </PageTransition>
  );
}
