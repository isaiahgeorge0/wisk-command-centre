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
