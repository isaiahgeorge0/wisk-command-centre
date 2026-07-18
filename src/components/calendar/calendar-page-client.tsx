"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CalendarDayDetailPanel } from "@/components/calendar/calendar-day-detail-panel";
import { CalendarDayView } from "@/components/calendar/calendar-day-view";
import { CalendarEventDetailPanel } from "@/components/calendar/calendar-event-detail-panel";
import { CalendarEventFormDialog } from "@/components/calendar/calendar-event-form-dialog";
import { CalendarFilterBar } from "@/components/calendar/calendar-filter-bar";
import { CalendarMonthGrid } from "@/components/calendar/calendar-month-grid";
import { CalendarUpcomingPanel } from "@/components/calendar/calendar-upcoming-panel";
import { CalendarViewSwitcher } from "@/components/calendar/calendar-view-switcher";
import { CalendarViewToolbar } from "@/components/calendar/calendar-view-toolbar";
import { CalendarWeekGrid } from "@/components/calendar/calendar-week-grid";
import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { DEFAULT_CALENDAR_FILTERS } from "@/lib/calendar/constants";
import {
  dateFromISO,
  formatWeekRange,
  getCalendarContentWindow,
  getMonthGridDateRange,
  getWeekDateRange,
  normaliseCalendarDate,
  shiftDay,
  shiftMonth,
  shiftWeek,
} from "@/lib/calendar/grid";
import { compareDateISO, addDaysToISO, toDateISO } from "@/lib/overview/date";
import {
  buildCalendarEvents,
  eventsInDateRange,
  filterCalendarEvents,
  getEventsForDate,
  getTodayISO,
} from "@/lib/calendar/selectors";
import type { CalendarView } from "@/lib/calendar/views";
import type {
  CalendarEvent,
  CalendarEventType,
  CalendarFilterState,
  StandaloneCalendarEvent,
} from "@/lib/calendar/types";
import type { ContentPost } from "@/lib/content/types";
import type { Goal } from "@/lib/goals/types";
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

function createTodayDate(): Date {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}

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
  const todayDate = useMemo(() => createTodayDate(), []);

  const [view, setView] = useState<CalendarView>("month");
  const [selectedDate, setSelectedDate] = useState<Date>(todayDate);
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [monthSidePanelDate, setMonthSidePanelDate] = useState<string | null>(
    null
  );
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

  useEffect(() => {
    if (window.innerWidth < 768) {
      setView("day");
    }
  }, []);

  useEffect(() => {
    setViewYear(selectedDate.getFullYear());
    setViewMonth(selectedDate.getMonth());
  }, [selectedDate]);

  const selectedDateISO = toDateISO(selectedDate);

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

  const contentWindow = useMemo(() => {
    if (view === "month") {
      return getCalendarContentWindow(viewYear, viewMonth, todayISO);
    }

    if (view === "week") {
      const weekRange = getWeekDateRange(selectedDate);
      const upcomingEnd = addDaysToISO(todayISO, 90);
      return {
        start: weekRange.start,
        end:
          compareDateISO(weekRange.end, upcomingEnd) > 0
            ? weekRange.end
            : upcomingEnd,
      };
    }

    return getCalendarContentWindow(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      todayISO
    );
  }, [view, viewYear, viewMonth, selectedDate, todayISO]);

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

  const weekRange = useMemo(
    () => getWeekDateRange(selectedDate),
    [selectedDate]
  );

  const weekEvents = useMemo(
    () =>
      eventsInDateRange(filteredEvents, weekRange.start, weekRange.end),
    [filteredEvents, weekRange]
  );

  const monthSidePanelEvents = useMemo(
    () =>
      monthSidePanelDate
        ? getEventsForDate(filteredEvents, monthSidePanelDate)
        : [],
    [filteredEvents, monthSidePanelDate]
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
    setSelectedDate(normaliseCalendarDate(dateFromISO(dateISO)));
    setMonthSidePanelDate(dateISO);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setMonthSidePanelDate(null);
    setSelectedEvent(event);
  };

  const handleViewChange = (nextView: CalendarView) => {
    setView(nextView);
    if (nextView !== "month") {
      setMonthSidePanelDate(null);
    }
  };

  const handlePreviousMonth = () => {
    const next = shiftMonth(viewYear, viewMonth, -1);
    setSelectedDate(
      normaliseCalendarDate(new Date(next.year, next.month, 1, 12))
    );
  };

  const handleNextMonth = () => {
    const next = shiftMonth(viewYear, viewMonth, 1);
    setSelectedDate(
      normaliseCalendarDate(new Date(next.year, next.month, 1, 12))
    );
  };

  const handlePreviousWeek = () => {
    setSelectedDate(normaliseCalendarDate(shiftWeek(selectedDate, -1)));
  };

  const handleNextWeek = () => {
    setSelectedDate(normaliseCalendarDate(shiftWeek(selectedDate, 1)));
  };

  const handlePreviousDay = () => {
    setSelectedDate(normaliseCalendarDate(shiftDay(selectedDate, -1)));
  };

  const handleNextDay = () => {
    setSelectedDate(normaliseCalendarDate(shiftDay(selectedDate, 1)));
  };

  const handleToday = () => {
    setSelectedDate(todayDate);
  };

  const openStandaloneAdd = (
    dateISO: string,
    eventType: "lifestyle" | "other"
  ) => {
    setStandaloneDialog({ open: true, date: dateISO, eventType });
  };

  const viewSwitcher = (
    <CalendarViewSwitcher view={view} onChange={handleViewChange} />
  );

  return (
    <PageTransition>
      <PageHeader
        title="Calendar"
        subtitle="Deadlines, due dates, and milestones across your business."
        icon={<CalendarDays className="size-6 text-wisk-section-calendar" />}
        accent="calendar"
      />

      <div className="mb-4">
        <CalendarFilterBar filters={filters} onToggle={handleToggleFilter} />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {view === "month" ? (
            <>
              <CalendarMonthGrid
                year={viewYear}
                month={viewMonth}
                events={filteredEvents}
                selectedDate={selectedDateISO}
                onSelectDate={handleSelectDate}
                onEventSelect={handleSelectEvent}
                onPreviousMonth={handlePreviousMonth}
                onNextMonth={handleNextMonth}
                onAddTask={(dateISO) => openTaskAdd(dateISO)}
                onAddContent={(dateISO) => openContentAdd(dateISO)}
                onAddLifestyle={(dateISO) =>
                  openStandaloneAdd(dateISO, "lifestyle")
                }
                onAddOther={(dateISO) => openStandaloneAdd(dateISO, "other")}
                headerTrailing={viewSwitcher}
              />
              {!hasEventsThisMonth ? (
                <div className="flex flex-col items-center px-4 py-8 text-center">
                  <CalendarDays
                    className="mb-2 size-8 text-muted-foreground"
                    aria-hidden
                  />
                  <p className="max-w-md text-sm text-muted-foreground">
                    Nothing scheduled this month. Use the + on any day to add a
                    task, content post, or personal event.
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
              <div className="border-b border-border/60 px-4 py-3">
                {view === "week" ? (
                  <CalendarViewToolbar
                    title={formatWeekRange(selectedDate)}
                    view={view}
                    onViewChange={handleViewChange}
                    onPrevious={handlePreviousWeek}
                    onNext={handleNextWeek}
                    previousLabel="Previous week"
                    nextLabel="Next week"
                  />
                ) : (
                  <CalendarViewToolbar
                    title=""
                    view={view}
                    onViewChange={handleViewChange}
                    onPrevious={handlePreviousDay}
                    onNext={handleNextDay}
                    previousLabel="Previous day"
                    nextLabel="Next day"
                    showToday
                    onToday={handleToday}
                  />
                )}
              </div>
              <div className="p-4">
                {view === "week" ? (
                  <CalendarWeekGrid
                    selectedDate={selectedDate}
                    events={weekEvents}
                    onEventSelect={handleSelectEvent}
                  />
                ) : (
                  <CalendarDayView
                    selectedDate={selectedDate}
                    events={filteredEvents}
                    onEventSelect={handleSelectEvent}
                    onAddTask={(dateISO) => openTaskAdd(dateISO)}
                    onAddContent={(dateISO) => openContentAdd(dateISO)}
                    onAddLifestyle={(dateISO) =>
                      openStandaloneAdd(dateISO, "lifestyle")
                    }
                    onAddOther={(dateISO) =>
                      openStandaloneAdd(dateISO, "other")
                    }
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {view === "month" ? (
          selectedEvent ? (
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
              selectedDate={monthSidePanelDate}
              events={monthSidePanelEvents}
              onClose={() => setMonthSidePanelDate(null)}
            />
          )
        ) : selectedEvent ? (
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
        ) : null}
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
