import type { LeadSource, LeadValueType, PipelineValueSplit } from "@/lib/leads/types";
import { addDaysToISO, toDateISO } from "@/lib/overview/date";

export function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function parseLeadValue(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeLeadValueType(
  valueType: string | null | undefined
): LeadValueType {
  return valueType === "monthly" ? "monthly" : "one_time";
}

/** Format a single lead value with explicit unit (£2,000 vs £450/mo). */
export function formatLeadValue(
  value: number | null | undefined,
  valueType: LeadValueType | string | null | undefined = "one_time"
): string {
  if (value == null) return "—";
  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
  return normalizeLeadValueType(valueType) === "monthly"
    ? `${formatted}/mo`
    : formatted;
}

/** Two-figure total — never silently blend one-time and monthly. */
export function formatPipelineValueSplit(
  split: PipelineValueSplit | { oneTime: number; monthly: number }
): string {
  const parts: string[] = [];
  if (split.oneTime > 0) {
    parts.push(`Upfront: ${formatLeadValue(split.oneTime, "one_time")}`);
  }
  if (split.monthly > 0) {
    parts.push(`Recurring: ${formatLeadValue(split.monthly, "monthly")}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function annualizeLeadValue(
  value: number | null | undefined,
  valueType: LeadValueType | string | null | undefined = "one_time"
): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return normalizeLeadValueType(valueType) === "monthly" ? value * 12 : value;
}

export function sumLeadValuesByType(
  leads: Array<{
    value: number | null;
    value_type?: LeadValueType | string | null;
  }>
): PipelineValueSplit {
  return leads.reduce(
    (acc, lead) => {
      const amount = lead.value ?? 0;
      if (amount <= 0) return acc;
      if (normalizeLeadValueType(lead.value_type) === "monthly") {
        acc.monthly += amount;
      } else {
        acc.oneTime += amount;
      }
      return acc;
    },
    { oneTime: 0, monthly: 0 }
  );
}

export function formatLeadSource(source: string): string {
  return source;
}

export function daysSinceCreated(createdAt: string, now: Date = new Date()): string {
  const createdISO = toDateISO(new Date(createdAt));
  const todayISO = toDateISO(now);
  const created = new Date(`${createdISO}T12:00:00`);
  const today = new Date(`${todayISO}T12:00:00`);
  const days = Math.round(
    (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function relativeTime(dateStr: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function daysInStage(
  lead: { status: string; contacted_at: string | null; created_at: string },
  now: Date = new Date()
): number {
  const anchor = lead.contacted_at ?? lead.created_at;
  const anchorISO = toDateISO(new Date(anchor));
  const todayISO = toDateISO(now);
  const anchorDate = new Date(`${anchorISO}T12:00:00`);
  const today = new Date(`${todayISO}T12:00:00`);
  return Math.max(
    0,
    Math.round((today.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24))
  );
}

export function formatDaysInStage(
  lead: { status: string; contacted_at: string | null; created_at: string },
  now: Date = new Date()
): string {
  const days = daysInStage(lead, now);
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function formatFollowUpDate(
  date: string | null | undefined,
  now: Date = new Date()
): {
  label: string;
  isOverdue: boolean;
  urgency: "overdue" | "upcoming" | "future";
} | null {
  if (!date) return null;
  const todayISO = toDateISO(now);
  const isOverdue = date < todayISO;
  const threeDaysAhead = addDaysToISO(todayISO, 3);
  const urgency: "overdue" | "upcoming" | "future" = isOverdue
    ? "overdue"
    : date <= threeDaysAhead
      ? "upcoming"
      : "future";
  const label = new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  return { label, isOverdue, urgency };
}

export function followUpCellClass(
  urgency: "overdue" | "upcoming" | "future" | null
): string {
  switch (urgency) {
    case "overdue":
      return "text-wisk-coral font-medium";
    case "upcoming":
      return "text-amber-400 font-medium";
    case "future":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

export function lastActivityCellClass(
  lastActivityAt: string | null,
  now: Date = new Date()
): string {
  if (!lastActivityAt) return "text-muted-foreground italic";
  const days = daysSinceTimestamp(lastActivityAt, now);
  if (days < 3) return "text-wisk-teal";
  if (days < 7) return "text-foreground";
  return "text-wisk-coral";
}

export function daysInStageCellClass(
  lead: { status: string; contacted_at: string | null; created_at: string },
  now: Date = new Date()
): string {
  const days = daysInStage(lead, now);
  if (days < 7) return "text-muted-foreground";
  if (days < 14) return "text-amber-400";
  return "text-wisk-coral font-medium";
}

function daysSinceTimestamp(isoTimestamp: string, now: Date = new Date()): number {
  const dateISO = toDateISO(new Date(isoTimestamp));
  const todayISO = toDateISO(now);
  const then = new Date(`${dateISO}T12:00:00`);
  const today = new Date(`${todayISO}T12:00:00`);
  return Math.max(
    0,
    Math.round((today.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
  );
}

export function isLeadSource(value: string): value is LeadSource {
  return [
    "TikTok",
    "Instagram",
    "Referral",
    "Website",
    "LinkedIn",
    "Cold outreach",
    "Other",
  ].includes(value);
}
