const DEFAULT_TIMEZONE = "Europe/London";

export function normaliseTimezone(timezone: string | null | undefined): string {
  if (!timezone) return DEFAULT_TIMEZONE;

  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function getDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: normaliseTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

export function getLocalDateKey(
  timezone: string,
  date = new Date()
): string {
  const parts = getDateParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getLocalTime(
  timezone: string,
  date = new Date()
): { hour: number; minute: number } {
  const { hour, minute } = getDateParts(date, timezone);
  return { hour, minute };
}

export function formatLocalDate(timezone: string, date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: normaliseTimezone(timezone),
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
