"use client";

import { PoundSterling, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { PropertiesProTeaser } from "@/components/properties/properties-pro-teaser";
import { RentPaymentStatusBadge } from "@/components/properties/rent-payment-status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROPERTIES_ACCENT,
  RENT_PAYMENT_STATUSES,
} from "@/lib/properties/constants";
import {
  getInsuranceTypeDisplayName,
  getRentPaymentStatusDisplayName,
} from "@/lib/properties/display-names";
import {
  daysUntilDate,
  formatPropertyCurrency,
  formatPropertyDate,
  formatYieldPercent,
} from "@/lib/properties/format";
import {
  buildPortfolioFinanceStats,
  filterPaymentsByMonth,
  filterPaymentsByStatus,
  groupPaymentsByProperty,
} from "@/lib/properties/selectors";
import type {
  PortfolioFinancialOverview,
  PropertyInsurance,
  PropertyMortgage,
  PropertyWithStats,
  RentPaymentStatus,
  RentPaymentWithDetails,
  Tenant,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type FinancesPageClientProps = {
  properties: PropertyWithStats[];
  payments: RentPaymentWithDetails[];
  tenants: Tenant[];
  mortgages: PropertyMortgage[];
  insurance: PropertyInsurance[];
  portfolioOverview: PortfolioFinancialOverview;
  hasProPlan: boolean;
};

type UpcomingRenewal = {
  id: string;
  propertyId: string;
  propertyName: string;
  label: string;
  date: string;
  daysUntil: number;
  kind: "mortgage" | "insurance";
};

export function FinancesPageClient({
  properties,
  payments,
  tenants,
  mortgages,
  insurance,
  portfolioOverview,
  hasProPlan,
}: FinancesPageClientProps) {
  const [statusFilter, setStatusFilter] = useState<RentPaymentStatus | "all">(
    "all"
  );
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const propertyNameById = useMemo(
    () => new Map(properties.map((p) => [p.id, p.name])),
    [properties]
  );

  const monthOptions = useMemo(() => {
    const keys = new Set(
      payments.map((payment) => payment.due_date.slice(0, 7))
    );
    return Array.from(keys).sort().reverse();
  }, [payments]);

  const filtered = useMemo(() => {
    let result = filterPaymentsByStatus(payments, statusFilter);
    result = filterPaymentsByMonth(result, monthFilter);
    return result;
  }, [payments, statusFilter, monthFilter]);

  const grouped = useMemo(
    () => groupPaymentsByProperty(filtered),
    [filtered]
  );

  const stats = useMemo(
    () => buildPortfolioFinanceStats(properties, payments, tenants),
    [properties, payments, tenants]
  );

  const totalMonthlyMortgage = useMemo(
    () => mortgages.reduce((sum, m) => sum + m.monthly_payment, 0),
    [mortgages]
  );

  const totalAnnualInsurance = useMemo(
    () =>
      insurance.reduce((sum, record) => sum + (record.annual_premium ?? 0), 0),
    [insurance]
  );

  const upcomingRenewals = useMemo(() => {
    const items: UpcomingRenewal[] = [];

    for (const mortgage of mortgages) {
      if (!mortgage.fixed_rate_end_date) continue;
      const days = daysUntilDate(mortgage.fixed_rate_end_date);
      if (days == null || days < 0 || days > 90) continue;
      items.push({
        id: mortgage.id,
        propertyId: mortgage.property_id,
        propertyName: propertyNameById.get(mortgage.property_id) ?? "Property",
        label: `${mortgage.lender} fixed rate ends`,
        date: mortgage.fixed_rate_end_date,
        daysUntil: days,
        kind: "mortgage",
      });
    }

    for (const record of insurance) {
      if (!record.renewal_date) continue;
      const days = daysUntilDate(record.renewal_date);
      if (days == null || days < 0 || days > 90) continue;
      items.push({
        id: record.id,
        propertyId: record.property_id,
        propertyName: propertyNameById.get(record.property_id) ?? "Property",
        label: `${getInsuranceTypeDisplayName(record.insurance_type)} insurance renews`,
        date: record.renewal_date,
        daysUntil: days,
        kind: "insurance",
      });
    }

    return items.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [insurance, mortgages, propertyNameById]);

  return (
    <PageTransition>
      <PageHeader
        title="Finances"
        subtitle="Rent payments, mortgages, insurance, and financial tracking."
        icon={
          <PoundSterling className="size-6" style={{ color: PROPERTIES_ACCENT }} />
        }
        className="mb-8"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Monthly expected"
          value={formatPropertyCurrency(stats.totalMonthlyExpected)}
        />
        <StatTile
          label="Received this month"
          value={formatPropertyCurrency(stats.totalReceivedThisMonth)}
        />
        <StatTile
          label="Outstanding"
          value={formatPropertyCurrency(stats.totalOutstanding)}
        />
        <StatTile
          label="Occupancy rate"
          value={`${stats.occupancyRate}%`}
        />
      </div>

      {hasProPlan ? (
        <section className="mb-8 space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Financial overview
            </h2>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
              Pro
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiTile
              label="Total net income (monthly)"
              value={formatPropertyCurrency(portfolioOverview.totalNetIncomeMonthly)}
              valueClassName={netIncomeColorClass(
                portfolioOverview.totalNetIncomeMonthly
              )}
            />
            <KpiTile
              label="Total net income (annual)"
              value={formatPropertyCurrency(portfolioOverview.totalNetIncomeAnnual)}
              valueClassName={netIncomeColorClass(
                portfolioOverview.totalNetIncomeAnnual
              )}
            />
            <KpiTile
              label="Total monthly mortgage"
              value={formatPropertyCurrency(totalMonthlyMortgage)}
            />
            <KpiTile
              label="Total annual insurance"
              value={formatPropertyCurrency(totalAnnualInsurance)}
            />
          </div>

          {portfolioOverview.bestPerforming ? (
            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">
                Best performing
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">
                {portfolioOverview.bestPerforming.propertyName}
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-amber-500">
                {formatYieldPercent(portfolioOverview.bestPerforming.netYield)}
              </p>
              <p className="text-xs text-muted-foreground">net yield</p>
              <Link
                href="/properties/yield-analytics"
                className="mt-3 inline-block text-sm text-amber-500 hover:text-amber-400"
              >
                View full yield analytics →
              </Link>
            </div>
          ) : null}

          {portfolioOverview.negativeNetIncomeProperties.length > 0 ? (
            <div className="flex gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
              <TrendingDown
                className="mt-0.5 size-5 shrink-0 text-orange-600 dark:text-orange-300"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                  Properties with negative net income
                </p>
                <ul className="mt-2 space-y-1">
                  {portfolioOverview.negativeNetIncomeProperties.map((item) => (
                    <li key={item.propertyId} className="text-sm">
                      <Link
                        href={`/properties/${item.propertyId}?tab=finances`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {item.propertyName}
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatPropertyCurrency(item.netIncome)} / year
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          <div>
            <h3 className="text-sm font-medium text-foreground">
              Upcoming renewals
            </h3>
            {upcomingRenewals.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No fixed rate ends or insurance renewals due soon.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {upcomingRenewals.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <Link
                      href={`/properties/${item.propertyId}?tab=finances`}
                      className="relative flex overflow-hidden rounded-xl border border-border/60 bg-card/60 transition-colors hover:bg-muted/30"
                    >
                      <span
                        className={cn(
                          "w-1 shrink-0",
                          item.kind === "mortgage" ? "bg-amber-500" : "bg-blue-500"
                        )}
                        aria-hidden
                      />
                      <div className="flex flex-1 flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {item.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.propertyName} · {formatPropertyDate(item.date)}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            item.kind === "mortgage"
                              ? "text-amber-500"
                              : "text-blue-500"
                          )}
                        >
                          {item.daysUntil} days
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            href="/properties/yield-analytics"
            className="inline-block text-sm text-amber-500 hover:text-amber-400"
          >
            View full yield analytics →
          </Link>
        </section>
      ) : (
        <div className="mb-8">
          <PropertiesProTeaser
            title="Portfolio financial overview"
            description="See your complete financial picture — net income, mortgage costs, insurance, yield performance, and upcoming renewals across your entire portfolio."
            features={[
              "Net income tracking (monthly and annual)",
              "Mortgage and insurance cost summaries",
              "Best performing property by yield",
              "Upcoming renewal alerts",
              "Full yield analytics dashboard",
            ]}
          />
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            v && setStatusFilter(v as RentPaymentStatus | "all")
          }
        >
          <SelectTrigger className="min-h-11 w-full sm:w-[180px]">
            <SelectValue>
              {statusFilter === "all"
                ? "All statuses"
                : getRentPaymentStatusDisplayName(statusFilter)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {RENT_PAYMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {getRentPaymentStatusDisplayName(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={(v) => v && setMonthFilter(v)}>
          <SelectTrigger className="min-h-11 w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {monthOptions.map((month) => (
              <SelectItem key={month} value={month}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-16 text-center">
          <h2 className="text-lg font-medium text-foreground">
            No rent payments recorded
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Payments will appear here once added from property detail pages.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([propertyId, group]) => (
            <section key={propertyId}>
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                {group.propertyName}
              </h2>
              <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-card/40">
                {group.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          {payment.tenant_name}
                        </p>
                        <RentPaymentStatusBadge status={payment.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Due {formatPropertyDate(payment.due_date)} ·{" "}
                        {formatPropertyCurrency(payment.amount)}
                        {payment.paid_date
                          ? ` · Paid ${formatPropertyDate(payment.paid_date)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageTransition>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-500/15 bg-card/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
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

function netIncomeColorClass(amount: number): string {
  if (amount > 0) return "text-emerald-500";
  if (amount < 0) return "text-orange-500";
  return "text-foreground";
}
