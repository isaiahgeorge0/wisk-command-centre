import type { CalendarDay } from "@/lib/calendar/types";
import { toDateISO } from "@/lib/overview/date";

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
