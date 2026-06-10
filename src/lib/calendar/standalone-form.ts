import type { StandaloneCalendarEventFormInput } from "@/lib/calendar/types";

export const EMPTY_STANDALONE_CALENDAR_EVENT_FORM: StandaloneCalendarEventFormInput =
  {
    title: "",
    date: "",
    end_date: "",
    event_type: "lifestyle",
    notes: "",
  };

export function standaloneEventToFormInput(
  event: {
    title: string;
    date: string;
    end_date?: string | null;
    event_type: "lifestyle" | "other";
    notes?: string | null;
  }
): StandaloneCalendarEventFormInput {
  return {
    title: event.title,
    date: event.date,
    end_date: event.end_date ?? "",
    event_type: event.event_type,
    notes: event.notes ?? "",
  };
}
