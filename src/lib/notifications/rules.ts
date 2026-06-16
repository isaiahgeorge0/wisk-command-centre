import {
  addDaysToISO,
  compareDateISO,
  isBeforeToday,
  isWithinNext7Days,
  toDateISO,
} from "@/lib/overview/date";
import type { NotificationCandidate } from "@/lib/notifications/types";

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
};

type ProjectRow = {
  id: string;
  project_name: string;
  status: string | null;
  deadline: string | null;
  updated_at: string;
};

type GoalRow = {
  id: string;
  title: string;
  status: string | null;
  deadline: string | null;
  current: number;
};

type LeadRow = {
  id: string;
  name: string;
  status: string | null;
  follow_up_date: string | null;
};

const TERMINAL_PROJECT_STATUSES = new Set(["completed", "archived"]);
const TERMINAL_GOAL_STATUSES = new Set(["completed", "archived"]);

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T12:00:00`);
  const to = new Date(`${toISO}T12:00:00`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function isWithinNext30Days(
  dateISO: string,
  todayISO: string,
  horizonISO: string
): boolean {
  return (
    compareDateISO(dateISO, todayISO) >= 0 &&
    compareDateISO(dateISO, horizonISO) <= 0
  );
}

function isOlderThanDays(isoTimestamp: string, days: number, now = new Date()): boolean {
  const then = new Date(isoTimestamp).getTime();
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return then < cutoff;
}

export function buildNotificationCandidates(
  tasks: TaskRow[],
  projects: ProjectRow[],
  goals: GoalRow[],
  leads: LeadRow[] = [],
  now: Date = new Date()
): NotificationCandidate[] {
  const todayISO = toDateISO(now);
  const weekEndISO = addDaysToISO(todayISO, 6);
  const goalHorizonISO = addDaysToISO(todayISO, 30);
  const candidates: NotificationCandidate[] = [];

  for (const task of tasks) {
    if (task.completed || !task.due_date) continue;
    if (!isBeforeToday(task.due_date, todayISO)) continue;

    candidates.push({
      type: "overdue_task",
      reference_id: task.id,
      title: "Overdue task",
      message: `${task.title} was due ${task.due_date}`,
      link_to: "/tasks",
    });
  }

  for (const project of projects) {
    const status = project.status ?? "active";

    if (
      project.deadline &&
      !TERMINAL_PROJECT_STATUSES.has(status) &&
      isWithinNext7Days(project.deadline, todayISO, weekEndISO)
    ) {
      const days = daysBetween(todayISO, project.deadline);
      candidates.push({
        type: "deadline_approaching",
        reference_id: project.id,
        title: "Deadline approaching",
        message: `${project.project_name} — due in ${days} day${days === 1 ? "" : "s"}`,
        link_to: "/projects",
      });
    }

    if (status === "active" && isOlderThanDays(project.updated_at, 14, now)) {
      candidates.push({
        type: "stalled_project",
        reference_id: project.id,
        title: "Stalled project",
        message: `${project.project_name} — no updates in 14+ days`,
        link_to: "/projects",
      });
    }
  }

  for (const goal of goals) {
    const status = goal.status ?? "active";

    if (
      goal.deadline &&
      !TERMINAL_GOAL_STATUSES.has(status) &&
      isWithinNext7Days(goal.deadline, todayISO, weekEndISO)
    ) {
      const days = daysBetween(todayISO, goal.deadline);
      candidates.push({
        type: "deadline_approaching",
        reference_id: goal.id,
        title: "Deadline approaching",
        message: `${goal.title} — due in ${days} day${days === 1 ? "" : "s"}`,
        link_to: "/goals",
      });
    }

    if (
      status === "active" &&
      goal.current === 0 &&
      goal.deadline &&
      isWithinNext30Days(goal.deadline, todayISO, goalHorizonISO)
    ) {
      const days = daysBetween(todayISO, goal.deadline);
      candidates.push({
        type: "goal_no_progress",
        reference_id: goal.id,
        title: "Goal needs attention",
        message: `${goal.title} — still at 0% with deadline in ${days} day${days === 1 ? "" : "s"}`,
        link_to: "/goals",
      });
    }
  }

  const TERMINAL_LEAD_STATUSES = new Set(["won", "lost"]);
  for (const lead of leads) {
    if (!lead.follow_up_date) continue;
    if (TERMINAL_LEAD_STATUSES.has(lead.status ?? "")) continue;
    if (!isBeforeToday(lead.follow_up_date, todayISO)) continue;

    candidates.push({
      type: "follow_up_overdue",
      reference_id: lead.id,
      title: "Follow up overdue",
      message: `${lead.name} — follow up was due ${lead.follow_up_date}`,
      link_to: "/leads",
    });
  }

  return candidates;
}

export function candidateKey(candidate: NotificationCandidate): string {
  return `${candidate.type}:${candidate.reference_id}`;
}
