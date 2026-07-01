"use client";

import {
  AlertTriangle,
  Calculator,
  Download,
  Info,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { PROPERTIES_ACCENT } from "@/lib/properties/constants";
import { formatPropertyCurrency } from "@/lib/properties/format";
import {
  buildSA105Summary,
  generateSA105Insights,
  isDomesticItemReplacementTicket,
  isResolvedTicketInPeriod,
  type SA105Insight,
} from "@/lib/properties/sa105-builder";
import {
  formatTaxYearLabel,
  getCurrentTaxYear,
  getLastTaxYear,
  parseLocalDate,
  toDateInputValue,
} from "@/lib/properties/tax-year";
import type {
  MaintenanceTicket,
  Property,
  PropertyInsurance,
  PropertyMortgage,
  RentPayment,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

const CTA_GRADIENT =
  "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #f97316 100%)";

type SA105PageClientProps = {
  properties: Property[];
  allPayments: Record<string, RentPayment[]>;
  allMortgages: Record<string, PropertyMortgage[]>;
  allInsurance: Record<string, PropertyInsurance[]>;
  allTickets: Record<string, MaintenanceTicket[]>;
};

type DateRangeMode = "current" | "last" | "custom";

function getDisclaimerText(taxYearLabel: string): string {
  return `WISK calculates this summary from the data in your account using the official HMRC SA105 box structure for the ${taxYearLabel} tax year. This is not tax advice and may not capture every allowable expense or reflect your specific circumstances (joint ownership, multiple income sources, capital allowances, or non-resident landlord status). Always verify these figures against your own records before filing, and consult a qualified accountant if your situation is anything other than a simple single property business.`;
}

function DisclaimerBox({ taxYearLabel }: { taxYearLabel: string }) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 print:border print:border-[#e5e7eb] print:bg-white">
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-amber-500 print:text-black"
          aria-hidden
        />
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 print:text-black">
            Tax disclaimer — please read
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-700/80 dark:text-amber-400/80 print:text-black">
            {getDisclaimerText(taxYearLabel)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScopeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2 text-sm font-medium transition-colors min-h-10",
        active
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function InsightCard({ insight }: { insight: SA105Insight }) {
  const styles = {
    tip: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/5",
      icon: Lightbulb,
      iconClass: "text-emerald-500",
    },
    warning: {
      border: "border-amber-500/30",
      bg: "bg-amber-500/5",
      icon: AlertTriangle,
      iconClass: "text-amber-500",
    },
    info: {
      border: "border-sky-500/30",
      bg: "bg-sky-500/5",
      icon: Info,
      iconClass: "text-sky-500",
    },
  }[insight.type];

  const Icon = styles.icon;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 print:border print:border-[#e5e7eb]",
        styles.border,
        styles.bg
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 size-5 shrink-0", styles.iconClass)} aria-hidden />
        <div>
          <p className="text-sm font-semibold text-foreground">{insight.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{insight.body}</p>
        </div>
      </div>
    </div>
  );
}

export function SA105PageClient({
  properties,
  allPayments,
  allMortgages,
  allInsurance,
  allTickets,
}: SA105PageClientProps) {
  const currentTaxYear = getCurrentTaxYear();

  const [dateRangeMode, setDateRangeMode] = useState<DateRangeMode>("current");
  const [customStart, setCustomStart] = useState(
    toDateInputValue(currentTaxYear.start)
  );
  const [customEnd, setCustomEnd] = useState(
    toDateInputValue(currentTaxYear.end)
  );

  const period = useMemo(() => {
    if (dateRangeMode === "current") {
      const taxYear = getCurrentTaxYear();
      return {
        start: taxYear.start,
        end: taxYear.end,
        label: taxYear.label,
      };
    }
    if (dateRangeMode === "last") {
      const taxYear = getLastTaxYear();
      return {
        start: taxYear.start,
        end: taxYear.end,
        label: taxYear.label,
      };
    }

    const start = parseLocalDate(customStart);
    start.setHours(0, 0, 0, 0);
    const end = parseLocalDate(customEnd);
    end.setHours(23, 59, 59, 999);

    return {
      start,
      end,
      label: formatTaxYearLabel(start, end),
    };
  }, [customEnd, customStart, dateRangeMode]);

  const flatPayments = useMemo(
    () => Object.values(allPayments).flat(),
    [allPayments]
  );
  const flatMortgages = useMemo(
    () => Object.values(allMortgages).flat(),
    [allMortgages]
  );
  const flatInsurance = useMemo(
    () => Object.values(allInsurance).flat(),
    [allInsurance]
  );
  const flatTickets = useMemo(
    () => Object.values(allTickets).flat(),
    [allTickets]
  );

  const baseSummary = useMemo(
    () =>
      buildSA105Summary(
        properties,
        flatPayments,
        flatMortgages,
        flatInsurance,
        flatTickets,
        period.start,
        period.end,
        period.label
      ),
    [
      flatInsurance,
      flatMortgages,
      flatPayments,
      flatTickets,
      period.end,
      period.label,
      period.start,
      properties,
    ]
  );

  const { domesticItemTicketCount, largeCostTicketCount } = useMemo(() => {
    const resolvedInPeriod = flatTickets.filter((ticket) =>
      isResolvedTicketInPeriod(ticket, period.start, period.end)
    );
    return {
      domesticItemTicketCount: resolvedInPeriod.filter(
        isDomesticItemReplacementTicket
      ).length,
      largeCostTicketCount: resolvedInPeriod.filter(
        (ticket) => (ticket.actual_cost ?? 0) > 1500
      ).length,
    };
  }, [flatTickets, period.end, period.start]);

  const summary = useMemo(
    () => ({
      ...baseSummary,
      insights: generateSA105Insights(
        baseSummary,
        domesticItemTicketCount,
        largeCostTicketCount
      ),
    }),
    [baseSummary, domesticItemTicketCount, largeCostTicketCount]
  );

  const mainBoxes = summary.boxes.filter((box) => box.boxNumber !== "44");
  const box44 = summary.boxes.find((box) => box.boxNumber === "44");

  const isTaxYearMode =
    dateRangeMode === "current" || dateRangeMode === "last";
  const periodHeading = isTaxYearMode
    ? `Tax Year ${period.label} · ${formatTaxYearLabel(period.start, period.end)}`
    : period.label;

  return (
    <PageTransition>
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
        }
      `}</style>

      <div className="print:hidden">
        <PageHeader
          title="SA105 Tax Summary"
          subtitle="UK property income summary for your Self Assessment tax return."
          icon={
            <Calculator
              className="size-6"
              style={{ color: PROPERTIES_ACCENT }}
            />
          }
          className="mb-6"
        />

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <ScopeButton
            active={dateRangeMode === "current"}
            onClick={() => setDateRangeMode("current")}
          >
            This tax year
          </ScopeButton>
          <ScopeButton
            active={dateRangeMode === "last"}
            onClick={() => setDateRangeMode("last")}
          >
            Last tax year
          </ScopeButton>
          <ScopeButton
            active={dateRangeMode === "custom"}
            onClick={() => setDateRangeMode("custom")}
          >
            Custom
          </ScopeButton>
          {dateRangeMode === "custom" ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                From
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="min-h-10 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                To
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="min-h-10 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground"
                />
              </label>
            </div>
          ) : null}
          {summary.hasData ? (
            <button
              type="button"
              onClick={() => window.print()}
              className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: CTA_GRADIENT }}
            >
              <Download className="size-4" aria-hidden />
              Save as PDF
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-6 print:bg-white print:text-[11pt]">
        <DisclaimerBox taxYearLabel={period.label} />

        <p className="text-sm text-muted-foreground print:text-black">
          {periodHeading}
        </p>

        {!summary.hasData ? (
          <div className="flex flex-col items-center rounded-xl border border-border/60 bg-card/60 px-6 py-16 text-center">
            <Calculator
              className="size-12 text-muted-foreground/40"
              aria-hidden
            />
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              No rental income recorded for this period
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Add rent payments to your properties to see your SA105 summary
              here.
            </p>
            <Link
              href="/properties/finances"
              className="mt-6 text-sm font-medium text-amber-600 underline underline-offset-2 hover:text-amber-500 dark:text-amber-400 print:hidden"
            >
              Go to Finances
            </Link>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "rounded-xl border p-6",
                summary.isLoss
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-emerald-500/30 bg-emerald-500/5"
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Box {summary.profitOrLossBoxNumber}
              </p>
              <p
                className={cn(
                  "mt-2 text-3xl font-bold tabular-nums",
                  summary.isLoss
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-emerald-700 dark:text-emerald-400"
                )}
              >
                {summary.isLoss ? "Adjusted loss" : "Adjusted profit"}:{" "}
                {formatPropertyCurrency(summary.profitOrLossAmount)}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden print:border print:border-[#e5e7eb]">
              <div className="border-b border-border/60 px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Box-by-box breakdown
                </h2>
              </div>
              <div className="divide-y divide-border/60">
                {mainBoxes.map((box) => (
                  <div
                    key={box.boxNumber}
                    className="grid gap-1 px-4 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-start sm:gap-4"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Box {box.boxNumber}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {box.label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {box.description}
                      </p>
                    </div>
                    <p className="text-lg font-semibold tabular-nums text-foreground sm:text-right">
                      {formatPropertyCurrency(box.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {box44 ? (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 print:border print:border-[#e5e7eb]">
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                  Box 44 — Not deducted from profit
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {box44.label}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                  {formatPropertyCurrency(box44.amount)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Generates a 20% tax credit instead — see insight below.
                </p>
              </div>
            ) : null}

            {summary.insights.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">
                  Things to check
                </h2>
                <div className="space-y-3">
                  {summary.insights.map((insight) => (
                    <InsightCard key={insight.title} insight={insight} />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: CTA_GRADIENT }}
              >
                <Download className="size-4" aria-hidden />
                Save as PDF
              </button>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground print:text-black">
          Box numbers reference the official SA105 form for the 2025/26 tax year.
          Get the form at{" "}
          <a
            href="https://www.gov.uk/government/publications/self-assessment-uk-property-sa105"
            className="underline underline-offset-2 hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            gov.uk/government/publications/self-assessment-uk-property-sa105
          </a>
        </p>
      </div>
    </PageTransition>
  );
}
