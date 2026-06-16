import type { LeadSource } from "@/lib/leads/types";
import { toDateISO } from "@/lib/overview/date";

export function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function parseLeadValue(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatLeadValue(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
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
): { label: string; isOverdue: boolean } | null {
  if (!date) return null;
  const todayISO = toDateISO(now);
  const isOverdue = date < todayISO;
  const label = new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  return { label, isOverdue };
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
