export const CALENDAR_EVENT_TYPES = [
  "project",
  "task",
  "goal",
  "content",
  "milestone",
] as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export type CalendarEvent = {
  id: string;
  type: CalendarEventType;
  date: string;
  title: string;
  href: string;
  meta?: string | Record<string, unknown>;
};

export type CalendarDay = {
  dateISO: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export type CalendarUrgency = "overdue" | "today" | "upcoming";

export type UpcomingWindow = 30 | 60 | 90;

export type CalendarFilterState = Record<CalendarEventType, boolean>;
