export const CALENDAR_EVENT_TYPES = [
  "project",
  "task",
  "goal",
  "content",
  "milestone",
  "lifestyle",
  "other",
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

/** Row from the calendar_events table (lifestyle / other). */
export type StandaloneCalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  date: string;
  end_date?: string | null;
  event_type: "lifestyle" | "other";
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type StandaloneCalendarEventFormInput = {
  title: string;
  date: string;
  end_date?: string;
  event_type: "lifestyle" | "other";
  notes?: string;
};

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type CalendarDay = {
  dateISO: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export type CalendarUrgency = "overdue" | "today" | "upcoming";

export type UpcomingWindow = 30 | 60 | 90;

export type CalendarFilterState = Record<CalendarEventType, boolean>;
