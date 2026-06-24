import type { Property } from "@/lib/properties/types";

export function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function parseOptionalNumber(
  value: string | number | undefined
): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatPropertyCurrency(
  value: number | null | undefined
): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPropertyAddress(property: Pick<
  Property,
  "address_line1" | "address_line2" | "city" | "postcode"
>): string {
  const parts = [
    property.address_line1,
    property.address_line2,
    property.city,
    property.postcode,
  ].filter(Boolean);
  return parts.join(", ");
}

export function calculateAnnualYield(
  monthlyRent: number | null,
  purchasePrice: number | null
): number | null {
  if (
    monthlyRent == null ||
    purchasePrice == null ||
    purchasePrice <= 0
  ) {
    return null;
  }
  return ((monthlyRent * 12) / purchasePrice) * 100;
}

export function formatYieldPercent(yieldPercent: number | null): string {
  if (yieldPercent == null) return "—";
  return `${yieldPercent.toFixed(1)}%`;
}

export function formatPropertyDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatMessageTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncateMessagePreview(text: string, max = 80): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function formatRentFrequency(
  amount: number,
  frequency: "weekly" | "monthly"
): string {
  const formatted = formatPropertyCurrency(amount);
  return frequency === "weekly" ? `${formatted}/wk` : `${formatted}/mo`;
}

export function daysUntilDate(date: string | null): number | null {
  if (!date) return null;
  const target = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysUntilExpiryClass(days: number | null): string {
  if (days == null) return "text-muted-foreground";
  if (days < 0 || days <= 30) return "text-rose-600 dark:text-rose-400";
  if (days <= 90) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

