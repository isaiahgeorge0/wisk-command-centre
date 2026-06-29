"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { TenantReliabilityBadge } from "@/components/properties/tenant-reliability-badge";
import { PROPERTIES_ACCENT } from "@/lib/properties/constants";
import { formatPropertyDate } from "@/lib/properties/format";
import {
  calculatePortfolioReliability,
  calculateReliabilityScore,
  type ReliabilityGrade,
  type TenantReliabilityScore,
} from "@/lib/properties/reliability";
import { getTenantFullName } from "@/lib/properties/tenant-form";
import type {
  RentPaymentWithDetails,
  TenantWithProperty,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type ReliabilityPageClientProps = {
  tenants: TenantWithProperty[];
  payments: RentPaymentWithDetails[];
};

const GRADE_BAR_COLORS: Record<ReliabilityGrade, string> = {
  A: "bg-emerald-500",
  B: "bg-teal-500",
  C: "bg-amber-500",
  D: "bg-orange-500",
  F: "bg-rose-500",
};

const GRADE_LEGEND_COLORS: Record<ReliabilityGrade, string> = {
  A: "bg-emerald-500",
  B: "bg-teal-500",
  C: "bg-amber-500",
  D: "bg-orange-500",
  F: "bg-rose-500",
};

function scoreColorClass(score: number): string {
  if (score >= 85) return "text-emerald-500";
  if (score >= 70) return "text-teal-500";
  if (score >= 50) return "text-amber-500";
  if (score >= 30) return "text-orange-500";
  return "text-rose-500";
}

export function ReliabilityPageClient({
  tenants,
  payments,
}: ReliabilityPageClientProps) {
  const tenantScores = useMemo(() => {
    const scores = tenants.map((tenant) => {
      const score = calculateReliabilityScore(
        tenant.id,
        payments.filter((payment) => payment.tenant_id === tenant.id)
      );
      return { tenant, score };
    });
    return scores.sort((a, b) => a.score.score - b.score.score);
  }, [tenants, payments]);

  const portfolioStats = useMemo(
    () => calculatePortfolioReliability(tenantScores.map((item) => item.score)),
    [tenantScores]
  );

  const totalPortfolioPayments = useMemo(
    () =>
      tenantScores.reduce((sum, item) => sum + item.score.totalPayments, 0),
    [tenantScores]
  );

  const scoredTenantCount = useMemo(
    () => tenantScores.filter((item) => item.score.totalPayments > 0).length,
    [tenantScores]
  );

  const gradeSegments = useMemo(() => {
    const grades: ReliabilityGrade[] = ["A", "B", "C", "D", "F"];
    const total = grades.reduce(
      (sum, grade) => sum + portfolioStats.gradeDistribution[grade],
      0
    );
    if (total === 0) return [];

    return grades
      .map((grade) => ({
        grade,
        count: portfolioStats.gradeDistribution[grade],
        width: (portfolioStats.gradeDistribution[grade] / total) * 100,
      }))
      .filter((segment) => segment.count > 0);
  }, [portfolioStats.gradeDistribution]);

  if (tenants.length === 0) {
    return (
      <PageTransition>
        <PageHeader
          title="Tenant Reliability"
          subtitle="Payment history scores and risk assessment across your tenants."
          icon={
            <ShieldCheck className="size-6" style={{ color: PROPERTIES_ACCENT }} />
          }
          className="mb-8"
        />
        <div className="rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-16 text-center">
          <h2 className="text-lg font-medium text-foreground">No tenants yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add tenants to start tracking reliability scores.
          </p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Tenant Reliability"
        subtitle="Payment history scores and risk assessment across your tenants."
        icon={
          <ShieldCheck className="size-6" style={{ color: PROPERTIES_ACCENT }} />
        }
        className="mb-8"
      />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Average score"
          value={Math.round(portfolioStats.averageScore).toString()}
          valueClassName={scoreColorClass(portfolioStats.averageScore)}
        />
        <KpiTile
          label="Excellent tenants"
          value={portfolioStats.excellentCount.toString()}
          valueClassName="text-emerald-500"
        />
        <KpiTile
          label="At risk"
          value={portfolioStats.atRiskCount.toString()}
          valueClassName="text-rose-500"
        />
        <KpiTile
          label="Tenants scored"
          value={scoredTenantCount.toString()}
        />
      </div>

      {totalPortfolioPayments > 0 ? (
        <section className="mb-8 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Grade distribution
          </h2>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/30">
            {gradeSegments.map((segment) => (
              <div
                key={segment.grade}
                className={cn(GRADE_BAR_COLORS[segment.grade], "h-full")}
                style={{ width: `${segment.width}%` }}
                title={`${segment.grade}: ${segment.count}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {gradeSegments.map((segment) => (
              <div
                key={segment.grade}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    GRADE_LEGEND_COLORS[segment.grade]
                  )}
                  aria-hidden
                />
                <span className="font-medium text-foreground">
                  {segment.grade}
                </span>
                <span>{segment.count}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-3">
        {tenantScores.map(({ tenant, score }) => (
          <TenantScoreCard key={tenant.id} tenant={tenant} score={score} />
        ))}
      </div>
    </PageTransition>
  );
}

function KpiTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums text-foreground",
          valueClassName
        )}
      >
        {value}
      </p>
    </div>
  );
}

function TenantScoreCard({
  tenant,
  score,
}: {
  tenant: TenantWithProperty;
  score: TenantReliabilityScore;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/40 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-foreground">
          {getTenantFullName(tenant)}
        </p>
        <p className="text-xs text-muted-foreground">{tenant.property_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatPropertyDate(tenant.tenancy_start)}
          {tenant.tenancy_end
            ? ` → ${formatPropertyDate(tenant.tenancy_end)}`
            : " → ongoing"}
        </p>
      </div>

      <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-4 md:flex">
        <MiniStat label="On time" value={score.onTimeCount} />
        <MiniStat label="Late" value={score.lateCount} />
        <MiniStat label="Partial" value={score.partialCount} />
        <MiniStat label="Missed" value={score.missedCount} />
        {score.avgDaysLate > 0 ? (
          <p className="text-xs text-muted-foreground">
            {Math.round(score.avgDaysLate)} days late avg
          </p>
        ) : null}
        {score.currentStreak > 0 ? (
          <p className="text-xs text-emerald-500">
            {score.currentStreak} month streak
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <TenantReliabilityBadge score={score} size="md" />
        <Link
          href={`/properties/${tenant.property_id}?tab=tenants`}
          className="text-xs text-amber-500 hover:text-amber-400"
        >
          View property
        </Link>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
