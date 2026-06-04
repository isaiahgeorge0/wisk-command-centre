export type ProgressTone = "low" | "mid" | "high" | "complete";

export function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function parseGoalNumber(value: string | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getProgressPercent(
  current: number,
  target: number | null
): number {
  if (!target || target <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((current / target) * 100));
}

export function getProgressTone(percent: number): ProgressTone {
  if (percent >= 100) {
    return "complete";
  }
  if (percent >= 67) {
    return "high";
  }
  if (percent >= 34) {
    return "mid";
  }
  return "low";
}

export function formatGoalDeadline(
  deadline: string | null | undefined
): string {
  if (!deadline) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${deadline}T00:00:00`));
}

const PREFIX_CURRENCY_UNITS = new Set(["£", "$", "€"]);

function isPrefixUnit(unit: string | null | undefined): boolean {
  const trimmed = unit?.trim();
  return trimmed ? PREFIX_CURRENCY_UNITS.has(trimmed) : false;
}

export function formatGoalValue(value: number, unit: string | null): string {
  const trimmedUnit = unit?.trim() ?? "";
  const formatted = formatNumber(value);

  if (!trimmedUnit) {
    return formatted;
  }

  if (isPrefixUnit(trimmedUnit)) {
    return `${trimmedUnit}${formatted}`;
  }

  return `${formatted} ${trimmedUnit}`;
}

export function formatGoalProgressLabel(
  current: number,
  target: number | null,
  unit: string | null
): string {
  const targetVal = target ?? 0;
  return `${formatGoalValue(current, unit)} / ${formatGoalValue(targetVal, unit)}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
}
