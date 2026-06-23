import type { EmailWindow } from "@/lib/email/types";

const UK_OFFSET_MS = 60 * 60 * 1000;

export function getUkNow(): Date {
  return new Date(Date.now() + UK_OFFSET_MS);
}

export function getUkDateString(): string {
  return getUkNow().toISOString().slice(0, 10);
}

export function getUkHour(): number {
  return getUkNow().getUTCHours();
}

export function getCurrentEmailWindow(): EmailWindow | null {
  const hour = getUkHour();

  if (hour >= 7 && hour <= 13) {
    return "morning";
  }

  if (hour >= 14 && hour <= 20) {
    return "afternoon";
  }

  return null;
}

export function emailWindowLabel(window: EmailWindow): string {
  return window === "morning" ? "Morning picks" : "Afternoon picks";
}
