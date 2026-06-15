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

export function dateFromISO(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

export function getMondayOfWeek(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);
  const offset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offset);
  return monday;
}

/** Monday-first week containing the given date. */
export function getWeekDays(
  date: Date,
  now: Date = new Date()
): CalendarDay[] {
  const todayISO = toDateISO(now);
  const monday = getMondayOfWeek(date);
  const days: CalendarDay[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push({
      dateISO: toDateISO(day),
      dayNumber: day.getDate(),
      isCurrentMonth: day.getMonth() === date.getMonth(),
      isToday: toDateISO(day) === todayISO,
    });
  }

  return days;
}

export function getWeekDateRange(date: Date): DateRange {
  const days = getWeekDays(date);
  return { start: days[0]!.dateISO, end: days[6]!.dateISO };
}

export function formatWeekRange(date: Date): string {
  const { start, end } = getWeekDateRange(date);
  const startDate = dateFromISO(start);
  const endDate = dateFromISO(end);

  if (
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear()
  ) {
    const monthYear = new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
    }).format(endDate);
    return `${startDate.getDate()}–${endDate.getDate()} ${monthYear}`;
  }

  const startLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(startDate);
  const endLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(endDate);
  return `${startLabel} – ${endLabel}`;
}

export function formatFullDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function shiftDay(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

export function shiftWeek(date: Date, delta: number): Date {
  return shiftDay(date, delta * 7);
}

export function normaliseCalendarDate(date: Date): Date {
  const normalised = new Date(date);
  normalised.setHours(12, 0, 0, 0);
  return normalised;
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
