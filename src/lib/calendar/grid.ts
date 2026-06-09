import type { CalendarDay } from "@/lib/calendar/types";
import { addDaysToISO, compareDateISO, toDateISO } from "@/lib/overview/date";

export type DateRange = {
  start: string;
  end: string;
};

function toCalendarDay(
  date: Date,
  month: number,
  todayISO: string
): CalendarDay {
  return {
    dateISO: toDateISO(date),
    dayNumber: date.getDate(),
    isCurrentMonth: date.getMonth() === month,
    isToday: toDateISO(date) === todayISO,
  };
}

/** Monday-first month matrix (up to 6 weeks). */
export function getMonthMatrix(
  year: number,
  month: number,
  now: Date = new Date()
): CalendarDay[][] {
  const todayISO = toDateISO(now);
  const firstOfMonth = new Date(year, month, 1, 12);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset, 12);

  const weeks: CalendarDay[][] = [];
  const cursor = new Date(gridStart);

  for (let week = 0; week < 6; week++) {
    const days: CalendarDay[] = [];
    for (let day = 0; day < 7; day++) {
      days.push(toCalendarDay(cursor, month, todayISO));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);

    if (week >= 4 && days.every((d) => !d.isCurrentMonth)) {
      break;
    }
  }

  return weeks;
}

export function formatMonthYear(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1, 12));
}

export function formatSelectedDay(dateISO: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${dateISO}T12:00:00`));
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const date = new Date(year, month + delta, 1, 12);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Inclusive ISO date range covering every cell in the month grid. */
export function getMonthGridDateRange(
  year: number,
  month: number,
  now: Date = new Date()
): DateRange {
  const weeks = getMonthMatrix(year, month, now);
  const dates = weeks.flat().map((day) => day.dateISO);
  const sorted = [...dates].sort();
  return { start: sorted[0]!, end: sorted[sorted.length - 1]! };
}

/**
 * Union of the visible month grid and the upcoming-events horizon so recurring
 * content appears in the month view and in the 30/60/90-day upcoming panel.
 */
export function getCalendarContentWindow(
  year: number,
  month: number,
  todayISO: string,
  upcomingHorizonDays = 90
): DateRange {
  const grid = getMonthGridDateRange(year, month);
  const upcomingEnd = addDaysToISO(todayISO, upcomingHorizonDays);

  return {
    start: grid.start,
    end:
      compareDateISO(grid.end, upcomingEnd) > 0 ? grid.end : upcomingEnd,
  };
}
