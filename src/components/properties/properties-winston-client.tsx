"use client";

import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  Building2,
  Calendar,
  CheckCircle2,
  Lightbulb,
  Loader2,
  PoundSterling,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { triggerPropertyInsightsGeneration } from "@/app/(dashboard)/properties/actions";
import { PropertyValuationSection } from "@/components/properties/property-valuation-section";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import type {
  PropertyComparable,
  PropertyInsight,
  PropertyInsightContent,
  PropertyInsightSourceFigures,
  PropertyValuation,
  PropertyWithStats,
} from "@/lib/properties/types";
import {
  formatPropertyCurrency,
  formatYieldPercent,
} from "@/lib/properties/format";
import { cn } from "@/lib/utils";

type PropertiesWinstonClientProps = {
  insight: PropertyInsight | null;
  propertyCount: number;
  isAdmin: boolean;
  hasProPlan: boolean;
  properties: PropertyWithStats[];
  valuationsByProperty: Record<string, PropertyValuation | null>;
  comparablesByProperty: Record<string, PropertyComparable[]>;
  eligibilityByProperty: Record<
    string,
    { canGenerate: boolean; nextAvailableAt: string | null }
  >;
};

function formatGeneratedDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function InsightCard({
  icon,
  iconClass,
  title,
  children,
  className,
  badge,
}: {
  icon: React.ReactNode;
  iconClass?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/80 p-5 shadow-sm",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className={cn("shrink-0", iconClass)}>{icon}</span>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

function SourceFiguresLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-medium tabular-nums text-foreground/80">
      {children}
    </p>
  );
}

function formatRentThisMonth(figures: PropertyInsightSourceFigures): string {
  return `Paid ${formatPropertyCurrency(figures.rentPaidThisMonth)} · Outstanding ${formatPropertyCurrency(figures.rentOutstandingThisMonth)} · Due ${formatPropertyCurrency(figures.rentTotalDueThisMonth)}`;
}

function formatPortfolioFinancials(
  figures: PropertyInsightSourceFigures
): string | null {
  const parts: string[] = [];
  if (
    figures.portfolioGrossYield != null ||
    figures.portfolioNetYield != null
  ) {
    parts.push(
      `${formatYieldPercent(figures.portfolioGrossYield ?? null)} gross · ${formatYieldPercent(figures.portfolioNetYield ?? null)} net`
    );
  }
  if (figures.totalNetIncomeAnnual != null) {
    parts.push(
      `Net income ${formatPropertyCurrency(figures.totalNetIncomeAnnual)}/yr`
    );
  }
  if (figures.totalMortgageCostAnnual != null) {
    parts.push(
      `Mortgage ${formatPropertyCurrency(figures.totalMortgageCostAnnual)}/yr`
    );
  }
  if (figures.totalInsuranceCostAnnual != null) {
    parts.push(
      `Insurance ${formatPropertyCurrency(figures.totalInsuranceCostAnnual)}/yr`
    );
  }
  if (figures.totalMaintenanceCostAnnual != null) {
    parts.push(
      `Maintenance ${formatPropertyCurrency(figures.totalMaintenanceCostAnnual)}/yr`
    );
  }
  if (figures.totalVacancyLoss != null && figures.totalVacancyLoss > 0) {
    parts.push(
      `Vacancy ${formatPropertyCurrency(figures.totalVacancyLoss)}/yr`
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function ProBadge() {
  return (
    <span className="rounded-full border border-wisk-ferrari/20 bg-wisk-ferrari/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-wisk-ferrari">
      Pro
    </span>
  );
}

function BulletList({
  items,
  dotClass,
}: {
  items: string[];
  dotClass: string;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span
            className={cn("mt-1.5 size-2 shrink-0 rounded-full", dotClass)}
            aria-hidden
          />
          <span className="text-sm text-foreground">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PropertiesWinstonClient({
  insight,
  propertyCount,
  isAdmin,
  hasProPlan,
  properties,
  valuationsByProperty,
  comparablesByProperty,
  eligibilityByProperty,
}: PropertiesWinstonClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const content = insight?.content as PropertyInsightContent | undefined;
  const hasProContent =
    hasProPlan &&
    !!(
      content?.yield_analysis ||
      content?.tenant_risk_summary ||
      content?.financial_health
    );
  const portfolioFinancials = content?.sourceFigures
    ? formatPortfolioFinancials(content.sourceFigures)
    : null;

  const isOnCooldown = useMemo(() => {
    if (!insight?.generated_at) return false;
    const generatedAt = new Date(insight.generated_at);
    const sevenDaysLater = new Date(generatedAt);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    return new Date() < sevenDaysLater;
  }, [insight?.generated_at]);

  const cooldownLabel = useMemo(() => {
    if (!insight?.generated_at) return null;
    const generatedAt = new Date(insight.generated_at);
    const sevenDaysLater = new Date(generatedAt);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const daysRemaining = Math.ceil(
      (sevenDaysLater.getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return daysRemaining > 0 ? `Next in ${daysRemaining}d` : null;
  }, [insight?.generated_at]);

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const result = await triggerPropertyInsightsGeneration();
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-6 text-wisk-ferrari" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Winston
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            AI insights for your property portfolio.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={
            isPending ||
            propertyCount === 0 ||
            (isOnCooldown && !isAdmin)
          }
          className={cn(
            "min-h-11 gap-2 bg-wisk-ferrari text-white hover:bg-wisk-ferrari/90",
            isOnCooldown && !isAdmin && "opacity-70"
          )}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isOnCooldown && !isAdmin ? (
            <Calendar className="size-4" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {isOnCooldown && !isAdmin && cooldownLabel
            ? cooldownLabel
            : "Generate now"}
        </Button>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!insight || !content ? (
        <div className="flex flex-col items-center px-4 py-16 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-wisk-ferrari/10">
            <Sparkles className="size-7 text-wisk-ferrari" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Your first digest is on its way
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Winston will generate your first property digest on Monday. Once
            generated, insights refresh weekly.
            {isAdmin ? " You can also trigger one manually above." : null}
          </p>
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-muted-foreground">
            Generated {formatGeneratedDate(insight.generated_at)}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            <InsightCard
              icon={<BarChart2 className="size-4" />}
              iconClass="text-muted-foreground"
              title="Portfolio health"
              className="sm:col-span-2 xl:col-span-2"
            >
              <p className="text-sm leading-relaxed text-foreground">
                {content.portfolio_health}
              </p>
            </InsightCard>

            <InsightCard
              icon={<CheckCircle2 className="size-4" />}
              iconClass="text-wisk-ferrari"
              title="Wins"
            >
              <ul className="space-y-2">
                {content.wins.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-wisk-ferrari"
                      aria-hidden
                    />
                    <span className="text-sm text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </InsightCard>

            <InsightCard
              icon={<AlertCircle className="size-4" />}
              iconClass="text-red-400"
              title="Needs attention"
            >
              <BulletList items={content.attention} dotClass="bg-red-400" />
            </InsightCard>

            {hasProContent ? (
              <>
                <InsightCard
                  icon={<Wrench className="size-4" />}
                  iconClass="text-muted-foreground"
                  title="Maintenance summary"
                >
                  <p className="text-sm leading-relaxed text-foreground">
                    {content.maintenance_summary}
                  </p>
                </InsightCard>

                <InsightCard
                  icon={<TrendingUp className="size-4" />}
                  iconClass="text-wisk-ferrari"
                  title="Financial health"
                  className="sm:col-span-2 xl:col-span-2"
                >
                  {content.sourceFigures ? (
                    <>
                      {portfolioFinancials ? (
                        <SourceFiguresLine>
                          {portfolioFinancials}
                        </SourceFiguresLine>
                      ) : null}
                      <SourceFiguresLine>
                        {formatRentThisMonth(content.sourceFigures)}
                      </SourceFiguresLine>
                    </>
                  ) : null}
                  <p className="text-sm leading-relaxed text-foreground">
                    {content.financial_health ?? content.financial_snapshot}
                  </p>
                </InsightCard>

                <InsightCard
                  icon={<Lightbulb className="size-4" />}
                  iconClass="text-wisk-ferrari"
                  title="Winston's insight"
                >
                  <div className="border-l-2 border-wisk-ferrari/60 pl-4">
                    <p className="text-sm leading-relaxed text-foreground">
                      {content.winstons_insight}
                    </p>
                  </div>
                </InsightCard>

                {content.yield_analysis ? (
                  <InsightCard
                    icon={<BarChart2 className="size-4" />}
                    iconClass="text-wisk-ferrari"
                    title="Yield analysis"
                    badge={<ProBadge />}
                  >
                    {content.sourceFigures &&
                    (content.sourceFigures.portfolioGrossYield != null ||
                      content.sourceFigures.portfolioNetYield != null) ? (
                      <SourceFiguresLine>
                        {`${formatYieldPercent(
                          content.sourceFigures.portfolioGrossYield ?? null
                        )} gross · ${formatYieldPercent(
                          content.sourceFigures.portfolioNetYield ?? null
                        )} net`}
                      </SourceFiguresLine>
                    ) : null}
                    <p className="text-sm leading-relaxed text-foreground">
                      {content.yield_analysis}
                    </p>
                  </InsightCard>
                ) : null}

                {content.tenant_risk_summary ? (
                  <InsightCard
                    icon={<ShieldCheck className="size-4" />}
                    iconClass="text-wisk-ferrari"
                    title="Tenant risk summary"
                    badge={<ProBadge />}
                  >
                    {content.sourceFigures?.atRiskTenants &&
                    content.sourceFigures.atRiskTenants.length > 0 ? (
                      <SourceFiguresLine>
                        {content.sourceFigures.atRiskTenants
                          .map(
                            (tenant) =>
                              `${tenant.name} at ${tenant.propertyName} (${tenant.grade})`
                          )
                          .join(" · ")}
                      </SourceFiguresLine>
                    ) : null}
                    <p className="text-sm leading-relaxed text-foreground">
                      {content.tenant_risk_summary}
                    </p>
                  </InsightCard>
                ) : null}

                {content.risk_alerts && content.risk_alerts.length > 0 ? (
                  <InsightCard
                    icon={<AlertTriangle className="size-4" />}
                    iconClass="text-rose-500"
                    title="Risk alerts"
                    badge={<ProBadge />}
                    className="sm:col-span-2 xl:col-span-3"
                  >
                    {content.sourceFigures?.upcomingMortgageRenewals &&
                    content.sourceFigures.upcomingMortgageRenewals.length >
                      0 ? (
                      <SourceFiguresLine>
                        {content.sourceFigures.upcomingMortgageRenewals
                          .map(
                            (renewal) =>
                              `${renewal.lender} at ${renewal.propertyName}: ${formatPropertyCurrency(renewal.monthlyPayment)}/mo`
                          )
                          .join(" · ")}
                      </SourceFiguresLine>
                    ) : null}
                    <BulletList
                      items={content.risk_alerts}
                      dotClass="bg-rose-400"
                    />
                  </InsightCard>
                ) : null}

                {content.property_deep_dives &&
                content.property_deep_dives.length > 0 ? (
                  <InsightCard
                    icon={<Building2 className="size-4" />}
                    iconClass="text-wisk-ferrari"
                    title="Property deep dives"
                    badge={<ProBadge />}
                    className="sm:col-span-2 xl:col-span-3"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      {content.property_deep_dives.map((item) => (
                        <div
                          key={item.propertyName}
                          className="rounded-lg border border-border/60 bg-card/60 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">
                              {item.propertyName}
                            </h3>
                            {item.netYield != null ||
                            item.netIncome != null ? (
                              <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
                                {item.netYield != null
                                  ? `${formatYieldPercent(item.netYield)} net`
                                  : null}
                                {item.netYield != null &&
                                item.netIncome != null
                                  ? " · "
                                  : null}
                                {item.netIncome != null
                                  ? `${formatPropertyCurrency(item.netIncome)}/yr`
                                  : null}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {item.insight}
                          </p>
                        </div>
                      ))}
                    </div>
                  </InsightCard>
                ) : null}

                {content.pro_recommendations &&
                content.pro_recommendations.length > 0 ? (
                  <div className="sm:col-span-2 xl:col-span-3 rounded-xl border border-wisk-ferrari/30 bg-wisk-ferrari/5 p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <Zap className="size-4 text-wisk-ferrari" aria-hidden />
                        <h2 className="text-sm font-semibold text-foreground">
                          Pro recommendations
                        </h2>
                      </div>
                      <ProBadge />
                    </div>
                    <ol className="space-y-3">
                      {content.pro_recommendations.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-wisk-ferrari/10 text-xs font-semibold text-wisk-ferrari">
                            {i + 1}
                          </span>
                          <span className="text-sm leading-relaxed text-foreground">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <InsightCard
                  icon={<PoundSterling className="size-4" />}
                  iconClass="text-wisk-ferrari"
                  title="Financial snapshot"
                >
                  {content.sourceFigures ? (
                    <SourceFiguresLine>
                      {formatRentThisMonth(content.sourceFigures)}
                    </SourceFiguresLine>
                  ) : null}
                  <p className="text-sm leading-relaxed text-foreground">
                    {content.financial_snapshot}
                  </p>
                </InsightCard>

                <InsightCard
                  icon={<Lightbulb className="size-4" />}
                  iconClass="text-wisk-ferrari"
                  title="Winston's insight"
                >
                  <div className="border-l-2 border-wisk-ferrari/60 pl-4">
                    <p className="text-sm leading-relaxed text-foreground">
                      {content.winstons_insight}
                    </p>
                  </div>
                </InsightCard>

                <InsightCard
                  icon={<Wrench className="size-4" />}
                  iconClass="text-muted-foreground"
                  title="Maintenance summary"
                  className="sm:col-span-2 xl:col-span-1"
                >
                  <p className="text-sm leading-relaxed text-foreground">
                    {content.maintenance_summary}
                  </p>
                </InsightCard>
              </>
            )}
          </div>
        </>
      )}

      <PropertyValuationSection
        properties={properties}
        valuationsByProperty={valuationsByProperty}
        comparablesByProperty={comparablesByProperty}
        eligibilityByProperty={eligibilityByProperty}
      />
    </PageTransition>
  );
}
