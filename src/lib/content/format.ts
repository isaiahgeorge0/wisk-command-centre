import { toDateISO } from "@/lib/overview/date";

export function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function parseTagsInput(value: string | undefined): string[] | null {
  if (!value?.trim()) return null;
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : null;
}

export function formatContentDate(dateISO: string | null): string {
  if (!dateISO) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateISO}T12:00:00`));
}

export function todayDateISO(now: Date = new Date()): string {
  return toDateISO(now);
}

export function truncateHook(hook: string | null, max = 80): string | null {
  if (!hook?.trim()) return null;
  const trimmed = hook.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
