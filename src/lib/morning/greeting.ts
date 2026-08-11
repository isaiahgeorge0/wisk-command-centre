export type UserGender = "male" | "female" | "unspecified";

export const USER_GENDERS = [
  "male",
  "female",
  "unspecified",
] as const satisfies readonly UserGender[];

export function normalizeGender(value: unknown): UserGender {
  if (value === "male" || value === "female" || value === "unspecified") {
    return value;
  }
  return "unspecified";
}

/**
 * Resolve the greeting term used in Winston copy.
 * greeting_term override wins; otherwise gender maps to champ / queen / there.
 */
export function resolveGreetingTerm(
  gender: UserGender | null | undefined,
  greetingTerm?: string | null
): string {
  const override = greetingTerm?.trim();
  if (override) return override;

  switch (normalizeGender(gender)) {
    case "male":
      return "champ";
    case "female":
      return "queen";
    default:
      return "there";
  }
}

export function getTimeOfDayGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function buildGreetingLine(
  hour: number,
  term: string
): string {
  return `${getTimeOfDayGreeting(hour)}, ${term}`;
}

/**
 * Deterministic card teaser from real deadline counts — no invented urgency.
 */
export function buildDeadlineTeaser(
  greetingLine: string,
  approachingCount: number,
  pastDeadlineCount: number
): string {
  const invitation =
    "I've put together an overview of what matters most today — want to see it?";

  if (pastDeadlineCount > 0 && approachingCount > 0) {
    const pastLabel =
      pastDeadlineCount === 1
        ? "1 project is past its deadline"
        : `${pastDeadlineCount} projects are past their deadlines`;
    const approachingLabel =
      approachingCount === 1
        ? "1 more is approaching"
        : `${approachingCount} more are approaching`;
    return `${greetingLine}. ${pastLabel}, and ${approachingLabel}. ${invitation}`;
  }

  if (pastDeadlineCount > 0) {
    const pastLabel =
      pastDeadlineCount === 1
        ? "1 project is past its deadline"
        : `${pastDeadlineCount} projects are past their deadlines`;
    return `${greetingLine}. ${pastLabel}. ${invitation}`;
  }

  if (approachingCount > 0) {
    const approachingLabel =
      approachingCount === 1
        ? "1 project is approaching its deadline"
        : `${approachingCount} projects are approaching their deadlines`;
    return `${greetingLine}. ${approachingLabel}. ${invitation}`;
  }

  return `${greetingLine}. Here's a clear look at what matters most today — want to see it?`;
}
