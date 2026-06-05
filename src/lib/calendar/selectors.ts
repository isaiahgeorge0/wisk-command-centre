import type {
  CalendarEvent,
  CalendarEventType,
  CalendarFilterState,
  CalendarUrgency,
  UpcomingWindow,
} from "@/lib/calendar/types";
import type { Goal } from "@/lib/goals/types";
import type { ContentPost } from "@/lib/content/types";
import type { ProjectMilestone } from "@/lib/projects/milestones/types";
import type { Project } from "@/lib/projects/types";
import type { TaskWithProject } from "@/lib/tasks/types";
import { buildContentCalendarEntries } from "@/lib/content/selectors";
import { getPostPlatforms } from "@/lib/content/platforms";
import {
  addDaysToISO,
  compareDateISO,
  isBeforeToday,
  isToday,
  toDateISO,
} from "@/lib/overview/date";

const TERMINAL_PROJECT_STATUSES = new Set(["completed", "archived"]);
const TERMINAL_GOAL_STATUSES = new Set(["completed", "archived"]);

export function buildCalendarEvents(
  projects: Project[],
  tasks: TaskWithProject[],
  goals: Goal[],
  milestones: ProjectMilestone[] = [],
  contentPosts: ContentPost[] = []
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const projectNames = new Map(
    projects.map((project) => [project.id, project.project_name])
  );

  for (const project of projects) {
    const status = project.status ?? "active";
    if (!project.deadline || TERMINAL_PROJECT_STATUSES.has(status)) continue;

    events.push({
      id: project.id,
      type: "project",
      date: project.deadline,
      title: project.project_name,
      href: "/projects",
      meta: "Project deadline",
    });
  }

  for (const task of tasks) {
    if (!task.due_date || task.completed) continue;

    events.push({
      id: task.id,
      type: "task",
      date: task.due_date,
      title: task.title,
      href: "/tasks",
      meta: task.project_name ?? undefined,
    });
  }

  for (const goal of goals) {
    const status = goal.status ?? "active";
    if (!goal.deadline || TERMINAL_GOAL_STATUSES.has(status)) continue;

    events.push({
      id: goal.id,
      type: "goal",
      date: goal.deadline,
      title: goal.title,
      href: "/goals",
      meta: goal.category ?? undefined,
    });
  }

  for (const milestone of milestones) {
    if (milestone.completed) continue;

    events.push({
      id: milestone.id,
      type: "milestone",
      date: milestone.date,
      title: milestone.title,
      href: "/projects",
      meta: projectNames.get(milestone.project_id) ?? "Project milestone",
    });
  }

  for (const entry of buildContentCalendarEntries(contentPosts)) {
    events.push({
      id: `${entry.post.id}-${entry.kind}`,
      type: "content",
      date: entry.date,
      title: entry.post.title,
      href: "/content",
      meta: getPostPlatforms(entry.post).join(", "),
    });
  }

  return events;
}

export function filterCalendarEvents(
  events: CalendarEvent[],
  filters: CalendarFilterState
): CalendarEvent[] {
  return events.filter((event) => filters[event.type]);
}

export function eventsByDate(
  events: CalendarEvent[]
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const existing = map.get(event.date) ?? [];
    existing.push(event);
    map.set(event.date, existing);
  }

  for (const [date, dayEvents] of map) {
    map.set(
      date,
      dayEvents.sort((a, b) => a.title.localeCompare(b.title))
    );
  }

  return map;
}

export function getEventsForDate(
  events: CalendarEvent[],
  dateISO: string
): CalendarEvent[] {
  return events.filter((event) => event.date === dateISO);
}

export function groupEventsByType(
  events: CalendarEvent[]
): Record<CalendarEventType, CalendarEvent[]> {
  return {
    project: events.filter((e) => e.type === "project"),
    task: events.filter((e) => e.type === "task"),
    goal: events.filter((e) => e.type === "goal"),
    content: events.filter((e) => e.type === "content"),
    milestone: events.filter((e) => e.type === "milestone"),
  };
}

export function eventsInWindow(
  events: CalendarEvent[],
  todayISO: string,
  windowDays: UpcomingWindow
): CalendarEvent[] {
  const endISO = addDaysToISO(todayISO, windowDays);

  return events
    .filter(
      (event) =>
        compareDateISO(event.date, todayISO) >= 0 &&
        compareDateISO(event.date, endISO) <= 0
    )
    .sort(
      (a, b) =>
        compareDateISO(a.date, b.date) || a.title.localeCompare(b.title)
    );
}

export function countEventsInWindow(
  events: CalendarEvent[],
  todayISO: string,
  windowDays: UpcomingWindow
): number {
  return eventsInWindow(events, todayISO, windowDays).length;
}

export function getUrgency(
  dateISO: string,
  todayISO: string
): CalendarUrgency {
  if (isBeforeToday(dateISO, todayISO)) return "overdue";
  if (isToday(dateISO, todayISO)) return "today";
  return "upcoming";
}

export function formatDaysRemaining(
  dateISO: string,
  todayISO: string
): string {
  if (isToday(dateISO, todayISO)) return "Today";

  if (isBeforeToday(dateISO, todayISO)) {
    const from = new Date(`${dateISO}T12:00:00`);
    const to = new Date(`${todayISO}T12:00:00`);
    const days = Math.round(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );
    return `${days} day${days === 1 ? "" : "s"} overdue`;
  }

  const from = new Date(`${todayISO}T12:00:00`);
  const to = new Date(`${dateISO}T12:00:00`);
  const days = Math.round(
    (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
  );
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function getTodayISO(now: Date = new Date()): string {
  return toDateISO(now);
}
