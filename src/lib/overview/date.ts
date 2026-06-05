export function toDateISO(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToISO(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateISO(date);
}

export function compareDateISO(a: string, b: string): number {
  return a.localeCompare(b);
}

export function isBeforeToday(dateISO: string, todayISO: string): boolean {
  return compareDateISO(dateISO, todayISO) < 0;
}

export function isToday(dateISO: string, todayISO: string): boolean {
  return dateISO === todayISO;
}

export function isOnOrBeforeToday(dateISO: string, todayISO: string): boolean {
  return compareDateISO(dateISO, todayISO) <= 0;
}

export function isWithinNext7Days(
  dateISO: string,
  todayISO: string,
  weekEndISO: string
): boolean {
  return (
    compareDateISO(dateISO, todayISO) >= 0 &&
    compareDateISO(dateISO, weekEndISO) <= 0
  );
}

export function formatOverviewDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShortDueDate(dateISO: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateISO}T12:00:00`));
}

export function getTimeGreeting(hour: number): string {
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

export type OverviewDateContext = {
  todayISO: string;
  weekEndISO: string;
  dayOfWeek: number;
  hour: number;
};

export function getOverviewDateContext(now: Date = new Date()): OverviewDateContext {
  const todayISO = toDateISO(now);
  return {
    todayISO,
    weekEndISO: addDaysToISO(todayISO, 6),
    dayOfWeek: now.getDay(),
    hour: now.getHours(),
  };
}

export type OverviewHeaderContent = {
  title: string;
  subtitle: string;
};

export function getOverviewHeader(
  now: Date = new Date(),
  displayName?: string | null
): OverviewHeaderContent {
  const { dayOfWeek, hour } = getOverviewDateContext(now);

  if (dayOfWeek === 1) {
    return {
      title: "Plan your week",
      subtitle:
        "Set your priorities, clear the noise, and decide what wins this week.",
    };
  }

  if (dayOfWeek === 0) {
    return {
      title: "Weekly reflection",
      subtitle:
        "Look back at what moved, what stalled, and what deserves focus next.",
    };
  }

  const greeting = getTimeGreeting(hour);
  const trimmedName = displayName?.trim();
  const title = trimmedName ? `${greeting}, ${trimmedName}` : greeting;

  return {
    title,
    subtitle: formatOverviewDate(now),
  };
}
