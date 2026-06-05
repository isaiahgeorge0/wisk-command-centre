import { toDateISO } from "@/lib/overview/date";
import type { OverviewSnapshot } from "@/lib/overview/selectors";

export type OverviewWeekDay = {
  dateISO: string;
  weekdayLabel: string;
  dayNumber: number;
  isToday: boolean;
  hasEvents: boolean;
};

export function getCurrentWeekDays(todayISO: string): string[] {
  const today = new Date(`${todayISO}T12:00:00`);
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return toDateISO(date);
  });
}

export function collectOverviewEventDates(
  snapshot: OverviewSnapshot
): Set<string> {
  const dates = new Set<string>();

  for (const group of snapshot.tasksDueThisWeekGrouped) {
    dates.add(group.date);
  }

  for (const task of snapshot.overdueTasks) {
    if (task.due_date) dates.add(task.due_date);
  }

  for (const project of snapshot.projectDeadlinesThisWeek) {
    if (project.deadline) dates.add(project.deadline);
  }

  for (const group of snapshot.contentDueThisWeekGrouped) {
    dates.add(group.date);
  }

  for (const goal of snapshot.goalsAtZeroWithDeadline) {
    if (goal.deadline) dates.add(goal.deadline);
  }

  return dates;
}

export function buildOverviewWeekDays(
  snapshot: OverviewSnapshot
): OverviewWeekDay[] {
  const { todayISO } = snapshot.dateContext;
  const eventDates = collectOverviewEventDates(snapshot);

  return getCurrentWeekDays(todayISO).map((dateISO) => {
    const date = new Date(`${dateISO}T12:00:00`);
    return {
      dateISO,
      weekdayLabel: new Intl.DateTimeFormat("en-GB", {
        weekday: "narrow",
      }).format(date),
      dayNumber: date.getDate(),
      isToday: dateISO === todayISO,
      hasEvents: eventDates.has(dateISO),
    };
  });
}
