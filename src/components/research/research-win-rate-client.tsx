"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Loader2,
  Minus,
} from "lucide-react";
import { useState, useTransition } from "react";

import { getResearchWinRateDashboard } from "@/app/(dashboard)/research/actions";
import { PageHeader } from "@/components/layout/page-header";
import {
  SectionIconChip,
  SectionSurface,
} from "@/components/overview/section-card";
import { useResearchAccent } from "@/components/research/use-research-accent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatLeadValue,
  formatPipelineValueSplit,
} from "@/lib/leads/format";
import {
  RESEARCH_WIN_RATE_PERIODS,
  type ResearchWinRateDashboard,
  type ResearchWinRatePeriod,
} from "@/lib/research/win-rate";
import { cn } from "@/lib/utils";

const PERIOD_LABELS: Record<ResearchWinRatePeriod, string> = {
  this_month: "This month",
  last_month: "Last month",
  last_30_days: "Last 30 days",
  this_quarter: "This quarter",
  all_time: "All time",
};

function formatPercent(value: number | null): string {
  if (value == null) return "-";
  return `${value}%`;
}

function formatCurrency(value: number | null): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function TrendBadge({ dashboard }: { dashboard: ResearchWinRateDashboard }) {
  const comparison = dashboard.comparison;
  if (!comparison) {
    return (
      <span className="text-xs text-muted-foreground">No prior period</span>
    );
  }

  if (comparison.direction === "na" || comparison.deltaPoints == null) {
    return (
      <span className="text-xs text-muted-foreground">
        vs {comparison.periodLabel}: insufficient closed deals
      </span>
    );
  }

  const Icon =
    comparison.direction === "up"
      ? ArrowUpRight
      : comparison.direction === "down"
        ? ArrowDownRight
        : comparison.direction === "flat"
          ? Minus
          : ArrowRight;

  const tone =
    comparison.direction === "up"
      ? "text-emerald-400"
      : comparison.direction === "down"
        ? "text-wisk-coral"
        : "text-muted-foreground";

  const signed =
    comparison.deltaPoints > 0
      ? `+${comparison.deltaPoints}`
      : `${comparison.deltaPoints}`;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", tone)}>
      <Icon className="size-3.5" aria-hidden />
      {signed} pts vs {comparison.periodLabel}
      {comparison.winRatePercent != null
        ? ` (${formatPercent(comparison.winRatePercent)})`
        : ""}
    </span>
  );
}

type ResearchWinRateClientProps = {
  initialDashboard: ResearchWinRateDashboard;
};

export function ResearchWinRateClient({
  initialDashboard,
}: ResearchWinRateClientProps) {
  const accent = useResearchAccent();
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePeriodChange(value: string | null) {
    if (!value) return;
    if (!(RESEARCH_WIN_RATE_PERIODS as readonly string[]).includes(value)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await getResearchWinRateDashboard(
        value as ResearchWinRatePeriod
      );
      if (!result.success || !result.data) {
        setError(
          result.success ? "Could not load win-rate analytics." : result.error
        );
        return;
      }
      setDashboard(result.data);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Win-rate"
        subtitle="Computed from your closed Leads (Won / Lost). Figures are data-driven, not AI estimates."
        accent="research"
        icon={
          <BarChart3 className="size-5 text-wisk-section-research" aria-hidden />
        }
      />

      <SectionSurface accent={accent} cardId="research-win-rate">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <SectionIconChip accent={accent}>
              <BarChart3 size={16} style={{ color: accent }} aria-hidden />
            </SectionIconChip>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Dashboard
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Period: {dashboard.periodLabel}
                  {dashboard.dateFrom && dashboard.dateTo
                    ? ` (${dashboard.dateFrom} → ${dashboard.dateTo})`
                    : ""}
                </span>
                {isPending ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" />
                    Updating…
                  </span>
                ) : (
                  <TrendBadge dashboard={dashboard} />
                )}
              </div>
            </div>
          </div>
          <Select value={dashboard.period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="min-h-11 w-full sm:w-[180px]">
              <SelectValue>{PERIOD_LABELS[dashboard.period]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {RESEARCH_WIN_RATE_PERIODS.map((period) => (
                <SelectItem key={period} value={period}>
                  {PERIOD_LABELS[period]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/40 bg-background/40 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Win rate
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground md:text-3xl">
              {formatPercent(dashboard.winRatePercent)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dashboard.wonCount} won · {dashboard.lostCount} lost
              {dashboard.closedCount === 0 ? " · no closed deals" : ""}
            </p>
          </div>

          <div className="rounded-xl border border-border/40 bg-background/40 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Total value won
            </p>
            <p className="mt-1 text-lg font-bold leading-7 text-foreground md:text-xl">
              {formatPipelineValueSplit(dashboard.totalValueWon)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upfront and recurring kept separate
            </p>
          </div>

          <div className="rounded-xl border border-border/40 bg-background/40 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Avg deal size
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground md:text-3xl">
              {formatCurrency(dashboard.averageDealSizeAnnualized)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Annualised
              {dashboard.valuedWinCount > 0
                ? ` · ${dashboard.valuedWinCount} valued win${dashboard.valuedWinCount === 1 ? "" : "s"}`
                : " · no valued wins"}
            </p>
          </div>

          <div className="rounded-xl border border-border/40 bg-background/40 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Closed deals
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground md:text-3xl">
              {dashboard.closedCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Attributed by lead updated date
            </p>
          </div>
        </div>

        {dashboard.totalValueWon.monthly > 0 ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Recurring wins contribute{" "}
            {formatLeadValue(dashboard.totalValueWon.monthly, "monthly")} to
            total value won; avg deal size annualises monthly values (×12) so
            they can be compared with one-time deals.
          </p>
        ) : null}

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </SectionSurface>
    </div>
  );
}
