import type { RecurrenceRule } from "@/lib/content/types";
import { compareDateISO, toDateISO } from "@/lib/overview/date";

const MAX_OCCURRENCES = 400;

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatLocalDate(date: Date): string {
  return toDateISO(date);
}

function addRecurrenceInterval(
  date: Date,
  rule: RecurrenceRule,
  anchorDay: number
): Date {
  const next = new Date(date);

  if (rule === "daily") {
    next.setDate(next.getDate() + 1);
    return next;
  }

  if (rule === "weekly") {
    next.setDate(next.getDate() + 7);
    return next;
  }

  // Monthly: preserve anchor day-of-month (clamp to last day, e.g. Jan 31 → Feb 28)
  next.setMonth(next.getMonth() + 1, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(anchorDay, lastDay));
  return next;
}

function isValidRecurrenceRule(rule: string | null | undefined): rule is RecurrenceRule {
  return rule === "daily" || rule === "weekly" || rule === "monthly";
}

/**
 * Display-only expansion of a recurring content post into occurrence dates
 * within [windowStart, windowEnd], respecting recurrence_end_date when set.
 */
export function expandRecurringOccurrences(
  anchorDate: string,
  rule: string | null | undefined,
  recurrenceEndDate: string | null,
  windowStart: string,
  windowEnd: string
): string[] {
  if (!isValidRecurrenceRule(rule)) return [];
  if (compareDateISO(anchorDate, windowEnd) > 0) return [];

  const effectiveEnd =
    recurrenceEndDate && compareDateISO(recurrenceEndDate, windowEnd) < 0
      ? recurrenceEndDate
      : windowEnd;

  if (compareDateISO(anchorDate, effectiveEnd) > 0) return [];

  const anchorDay = parseLocalDate(anchorDate).getDate();
  let current = parseLocalDate(anchorDate);
  const dates: string[] = [];
  let iterations = 0;

  while (
    compareDateISO(formatLocalDate(current), effectiveEnd) <= 0 &&
    iterations < MAX_OCCURRENCES
  ) {
    const iso = formatLocalDate(current);

    if (
      compareDateISO(iso, windowStart) >= 0 &&
      compareDateISO(iso, effectiveEnd) <= 0
    ) {
      dates.push(iso);
    }

    if (compareDateISO(iso, effectiveEnd) >= 0) break;

    current = addRecurrenceInterval(current, rule, anchorDay);
    iterations += 1;
  }

  return dates;
}
