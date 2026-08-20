import {
  annualizeLeadValue,
  sumLeadValuesByType,
} from "@/lib/leads/format";
import type { Lead, PipelineValueSplit } from "@/lib/leads/types";

export const RESEARCH_WIN_RATE_PERIODS = [
  "this_month",
  "last_month",
  "last_30_days",
  "this_quarter",
  "all_time",
] as const;

export type ResearchWinRatePeriod = (typeof RESEARCH_WIN_RATE_PERIODS)[number];

export type ResearchWinRateTrendDirection = "up" | "down" | "flat" | "na";

export type ResearchWinRatePeriodMetrics = {
  periodLabel: string;
  dateFrom: string | null;
  dateTo: string | null;
  wonCount: number;
  lostCount: number;
  closedCount: number;
  /** Null when there are no closed (won/lost) leads in the period. */
  winRatePercent: number | null;
  totalValueWon: PipelineValueSplit;
  /**
   * Average annualised deal size among won leads that have a value.
   * Monthly values are ×12 so one-time and recurring can be compared as one figure.
   */
  averageDealSizeAnnualized: number | null;
  valuedWinCount: number;
};

export type ResearchWinRateDashboard = ResearchWinRatePeriodMetrics & {
  period: ResearchWinRatePeriod;
  comparison: {
    periodLabel: string;
    winRatePercent: number | null;
    /** Current win rate minus comparison win rate, in percentage points. */
    deltaPoints: number | null;
    direction: ResearchWinRateTrendDirection;
  } | null;
};

type DateRange = {
  from: Date | null;
  to: Date | null;
  label: string;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function quarterLabel(date: Date): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
}

function resolvePeriodRange(
  period: ResearchWinRatePeriod,
  now: Date
): DateRange {
  const today = startOfDay(now);

  switch (period) {
    case "this_month": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        from,
        to: endOfDay(today),
        label: monthLabel(today),
      };
    }
    case "last_month": {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = endOfDay(
        new Date(today.getFullYear(), today.getMonth(), 0)
      );
      return {
        from,
        to,
        label: monthLabel(from),
      };
    }
    case "last_30_days": {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return {
        from: startOfDay(from),
        to: endOfDay(today),
        label: "Last 30 days",
      };
    }
    case "this_quarter": {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      const from = new Date(today.getFullYear(), quarterStartMonth, 1);
      return {
        from,
        to: endOfDay(today),
        label: quarterLabel(today),
      };
    }
    case "all_time":
      return {
        from: null,
        to: null,
        label: "All time",
      };
  }
}

function resolveComparisonRange(
  period: ResearchWinRatePeriod,
  now: Date
): DateRange | null {
  const today = startOfDay(now);

  switch (period) {
    case "this_month": {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = endOfDay(
        new Date(today.getFullYear(), today.getMonth(), 0)
      );
      return { from, to, label: monthLabel(from) };
    }
    case "last_month": {
      const from = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const to = endOfDay(
        new Date(today.getFullYear(), today.getMonth() - 1, 0)
      );
      return { from, to, label: monthLabel(from) };
    }
    case "last_30_days": {
      const to = new Date(today);
      to.setDate(to.getDate() - 30);
      const from = new Date(to);
      from.setDate(from.getDate() - 29);
      return {
        from: startOfDay(from),
        to: endOfDay(to),
        label: "Previous 30 days",
      };
    }
    case "this_quarter": {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      const from = new Date(today.getFullYear(), quarterStartMonth - 3, 1);
      const to = endOfDay(
        new Date(today.getFullYear(), quarterStartMonth, 0)
      );
      return { from, to, label: quarterLabel(from) };
    }
    case "all_time":
      return null;
  }
}

/**
 * Closed outcomes are attributed by `updated_at` — the closest available
 * timestamp to when a lead moved into won/lost (no dedicated closed_at column).
 */
function isClosedInRange(lead: Lead, range: DateRange): boolean {
  if (lead.status !== "won" && lead.status !== "lost") return false;
  if (!range.from && !range.to) return true;

  const closedAt = new Date(lead.updated_at).getTime();
  if (range.from && closedAt < range.from.getTime()) return false;
  if (range.to && closedAt > range.to.getTime()) return false;
  return true;
}

function computePeriodMetrics(
  leads: Lead[],
  range: DateRange
): ResearchWinRatePeriodMetrics {
  const closed = leads.filter((lead) => isClosedInRange(lead, range));
  const won = closed.filter((lead) => lead.status === "won");
  const lost = closed.filter((lead) => lead.status === "lost");
  const closedCount = closed.length;
  const winRatePercent =
    closedCount > 0
      ? Math.round((won.length / closedCount) * 1000) / 10
      : null;

  const valuedWins = won.filter(
    (lead) => lead.value != null && Number.isFinite(lead.value) && lead.value > 0
  );
  const annualizedValues = valuedWins.map((lead) =>
    annualizeLeadValue(lead.value, lead.value_type)
  );
  const averageDealSizeAnnualized =
    annualizedValues.length > 0
      ? Math.round(
          (annualizedValues.reduce((sum, value) => sum + value, 0) /
            annualizedValues.length) *
            100
        ) / 100
      : null;

  return {
    periodLabel: range.label,
    dateFrom: range.from ? toISODate(range.from) : null,
    dateTo: range.to ? toISODate(range.to) : null,
    wonCount: won.length,
    lostCount: lost.length,
    closedCount,
    winRatePercent,
    totalValueWon: sumLeadValuesByType(won),
    averageDealSizeAnnualized,
    valuedWinCount: valuedWins.length,
  };
}

function trendDirection(
  current: number | null,
  previous: number | null
): ResearchWinRateTrendDirection {
  if (current == null || previous == null) return "na";
  const delta = current - previous;
  if (Math.abs(delta) < 0.1) return "flat";
  return delta > 0 ? "up" : "down";
}

export function buildResearchWinRateDashboard(
  leads: Lead[],
  period: ResearchWinRatePeriod = "this_month",
  now: Date = new Date()
): ResearchWinRateDashboard {
  const currentRange = resolvePeriodRange(period, now);
  const current = computePeriodMetrics(leads, currentRange);
  const comparisonRange = resolveComparisonRange(period, now);

  if (!comparisonRange) {
    return {
      period,
      ...current,
      comparison: null,
    };
  }

  const previous = computePeriodMetrics(leads, comparisonRange);
  const deltaPoints =
    current.winRatePercent != null && previous.winRatePercent != null
      ? Math.round((current.winRatePercent - previous.winRatePercent) * 10) / 10
      : null;

  return {
    period,
    ...current,
    comparison: {
      periodLabel: previous.periodLabel,
      winRatePercent: previous.winRatePercent,
      deltaPoints,
      direction: trendDirection(current.winRatePercent, previous.winRatePercent),
    },
  };
}

export function isResearchWinRatePeriod(
  value: string
): value is ResearchWinRatePeriod {
  return (RESEARCH_WIN_RATE_PERIODS as readonly string[]).includes(value);
}
