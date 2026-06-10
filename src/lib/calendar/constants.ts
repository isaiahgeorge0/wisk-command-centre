import type { CalendarEventType } from "@/lib/calendar/types";

export const CALENDAR_TYPE_LABELS: Record<CalendarEventType, string> = {
  project: "Projects",
  task: "Tasks",
  goal: "Goals",
  content: "Content",
  milestone: "Milestones",
  lifestyle: "Lifestyle/Personal",
  other: "Other",
};

export const CALENDAR_TYPE_PILL_CLASS: Record<CalendarEventType, string> = {
  project: "bg-wisk-purple/90 text-white",
  task: "bg-wisk-teal/90 text-white",
  goal: "bg-amber-400/90 text-amber-950",
  content: "bg-wisk-coral/90 text-white",
  milestone: "bg-rose-400/90 text-white",
  lifestyle: "bg-sky-500/90 text-white",
  other: "bg-slate-500/90 text-white",
};

export const CALENDAR_TYPE_DOT_CLASS: Record<CalendarEventType, string> = {
  project: "bg-wisk-purple",
  task: "bg-wisk-teal",
  goal: "bg-amber-400",
  content: "bg-wisk-coral",
  milestone: "bg-rose-400",
  lifestyle: "bg-sky-500",
  other: "bg-slate-500",
};

export const CALENDAR_FILTER_ACTIVE_CLASS: Record<CalendarEventType, string> = {
  project:
    "border-wisk-purple/40 bg-wisk-purple/15 text-wisk-purple hover:bg-wisk-purple/20",
  task: "border-wisk-teal/40 bg-wisk-teal/15 text-wisk-teal hover:bg-wisk-teal/20",
  goal: "border-amber-400/40 bg-amber-400/15 text-amber-600 hover:bg-amber-400/20 dark:text-amber-400",
  content:
    "border-wisk-coral/40 bg-wisk-coral/15 text-wisk-coral hover:bg-wisk-coral/20",
  milestone:
    "border-rose-400/40 bg-rose-400/15 text-rose-500 hover:bg-rose-400/20 dark:text-rose-400",
  lifestyle:
    "border-sky-500/40 bg-sky-500/15 text-sky-600 hover:bg-sky-500/20 dark:text-sky-400",
  other:
    "border-slate-500/40 bg-slate-500/15 text-slate-600 hover:bg-slate-500/20 dark:text-slate-400",
};

export const CALENDAR_FILTER_INACTIVE_CLASS: Record<CalendarEventType, string> =
  {
    project: "border-wisk-purple/25 text-wisk-purple/70 hover:bg-wisk-purple/5",
    task: "border-wisk-teal/25 text-wisk-teal/70 hover:bg-wisk-teal/5",
    goal: "border-amber-400/25 text-amber-600/70 hover:bg-amber-400/5 dark:text-amber-400/70",
    content:
      "border-wisk-coral/25 text-wisk-coral/70 hover:bg-wisk-coral/5",
    milestone:
      "border-rose-400/25 text-rose-500/70 hover:bg-rose-400/5 dark:text-rose-400/70",
    lifestyle:
      "border-sky-500/25 text-sky-600/70 hover:bg-sky-500/5 dark:text-sky-400/70",
    other:
      "border-slate-500/25 text-slate-600/70 hover:bg-slate-500/5 dark:text-slate-400/70",
  };

export const CALENDAR_TYPE_ORDER: CalendarEventType[] = [
  "project",
  "task",
  "goal",
  "milestone",
  "content",
  "lifestyle",
  "other",
];

export const DEFAULT_CALENDAR_FILTERS: Record<CalendarEventType, boolean> = {
  project: true,
  task: true,
  goal: true,
  content: true,
  milestone: true,
  lifestyle: true,
  other: true,
};

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const CALENDAR_MILESTONE_MARKER_CLASS = "text-rose-400";
