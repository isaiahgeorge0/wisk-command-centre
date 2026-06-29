"use client";

import { CheckCircle2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { PROPERTIES_ACCENT } from "@/lib/properties/constants";
import {
  formatPropertyCurrency,
  formatYieldPercent,
} from "@/lib/properties/format";
import type {
  FinancialSummary,
  PortfolioFinancialOverview,
  Property,
  PropertyWithStats,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type YieldAnalyticsClientProps = {
  properties: PropertyWithStats[];
  summaries: Array<{
    property: Property;
    annual: FinancialSummary;
  }>;
  portfolioOverview: PortfolioFinancialOverview;
};

export function YieldAnalyticsClient({
  summaries,
  portfolioOverview,
}: YieldAnalyticsClientProps) {
  const valuedSummaries = useMemo(
    () =>
      summaries.filter(
        (item) =>
          item.property.current_value != null && item.property.current_value > 0
      ),
    [summaries]
  );

  const portfolioGrossYield = useMemo(() => {
    const yields = valuedSummaries
      .map((item) => item.annual.gross_yield)
      .filter((value): value is number => value != null);
    if (yields.length === 0) return null;
    return yields.reduce((sum, value) => sum + value, 0) / yields.length;
  }, [valuedSummaries]);

  const portfolioNetYield = useMemo(() => {
    const yields = valuedSummaries
      .map((item) => item.annual.net_yield)
      .filter((value): value is number => value != null);
    if (yields.length === 0) return null;
    return yields.reduce((sum, value) => sum + value, 0) / yields.length;
  }, [valuedSummaries]);

  const yieldChartData = useMemo(
    () =>
      summaries
        .filter(
          (item) =>
            item.annual.gross_yield != null || item.annual.net_yield != null
        )
        .map((item) => ({
          name:
            item.property.name.length > 20
              ? `${item.property.name.slice(0, 20)}…`
              : item.property.name,
          gross: item.annual.gross_yield ?? 0,
          net: item.annual.net_yield ?? 0,
        })),
    [summaries]
  );

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { income: number; costs: number }>();

    for (const { annual } of summaries) {
      for (const item of annual.monthly_breakdown) {
        const current = map.get(item.month) ?? { income: 0, costs: 0 };
        map.set(item.month, {
          income: current.income + item.income,
          costs: current.costs + item.costs,
        });
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({ month, ...values }));
  }, [summaries]);

  const vacancyProperties = useMemo(
    () => summaries.filter((item) => item.annual.vacancy_loss > 0),
    [summaries]
  );

  return (
    <PageTransition>
      <PageHeader
        title="Yield Analytics"
        subtitle="Portfolio yield performance and return on investment."
        icon={
          <TrendingUp className="size-6" style={{ color: PROPERTIES_ACCENT }} />
        }
        className="mb-8"
      />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Portfolio gross yield"
          value={portfolioGrossYield}
          suffix="average"
        />
        <KpiTile
          label="Portfolio net yield"
          value={portfolioNetYield}
          suffix="average"
        />
        <KpiTile
          label="Best net yield"
          value={portfolioOverview.bestPerforming?.netYield ?? null}
          suffix={portfolioOverview.bestPerforming?.propertyName}
        />
        <div className="rounded-2xl border border-border/60 bg-card/60 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Total annual net income
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {formatPropertyCurrency(portfolioOverview.totalNetIncomeAnnual)}
          </p>
        </div>
      </div>

      <section className="mb-8 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Property breakdown
        </h2>

        <div className="hidden overflow-hidden rounded-xl border border-border/60 md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-card/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Monthly rent</th>
                <th className="px-4 py-3 font-medium">Purchase price</th>
                <th className="px-4 py-3 font-medium">Current value</th>
                <th className="px-4 py-3 font-medium">Gross yield</th>
                <th className="px-4 py-3 font-medium">Net yield</th>
                <th className="px-4 py-3 font-medium">ROI</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map(({ property, annual }) => (
                <tr
                  key={property.id}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/properties/${property.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {property.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {property.monthly_rent != null
                      ? formatPropertyCurrency(property.monthly_rent)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {property.purchase_price != null
                      ? formatPropertyCurrency(property.purchase_price)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {property.current_value != null
                      ? formatPropertyCurrency(property.current_value)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <YieldValue value={annual.gross_yield} />
                  </td>
                  <td className="px-4 py-3">
                    <YieldValue value={annual.net_yield} />
                  </td>
                  <td className="px-4 py-3">
                    <YieldValue value={annual.roi} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {summaries.map(({ property, annual }) => (
            <div
              key={property.id}
              className="rounded-xl border border-border/60 bg-card/60 p-4"
            >
              <Link
                href={`/properties/${property.id}`}
                className="font-semibold text-foreground hover:underline"
              >
                {property.name}
              </Link>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Monthly rent</dt>
                  <dd className="tabular-nums">
                    {property.monthly_rent != null
                      ? formatPropertyCurrency(property.monthly_rent)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Gross yield</dt>
                  <dd>
                    <YieldValue value={annual.gross_yield} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Net yield</dt>
                  <dd>
                    <YieldValue value={annual.net_yield} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">ROI</dt>
                  <dd>
                    <YieldValue value={annual.roi} />
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Yield comparison
        </h2>
        {yieldChartData.length >= 2 ? (
          <div className="h-[320px] w-full rounded-xl border border-border/60 bg-card/40 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={yieldChartData}
                margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value ?? 0).toFixed(1)}%`,
                    name === "gross" ? "Gross yield" : "Net yield",
                  ]}
                />
                <Legend />
                <Bar dataKey="gross" name="Gross yield" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                <Bar dataKey="net" name="Net yield" fill="#14b8a6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add purchase price and current value to your properties to see yield
            comparisons.
          </p>
        )}
      </section>

      <section className="mb-8 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          12-month income vs costs
        </h2>
        {monthlyTrend.length > 0 ? (
          <div className="h-[320px] w-full rounded-xl border border-border/60 bg-card/40 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) =>
                    formatPropertyCurrency(Number(value)).replace(/\.00$/, "")
                  }
                />
                <Tooltip
                  formatter={(value) =>
                    formatPropertyCurrency(Number(value ?? 0))
                  }
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="costs"
                  name="Costs"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Income and cost trends will appear once you have financial records.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Vacancy loss</h2>
        {vacancyProperties.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
            Full occupancy across your portfolio.
          </div>
        ) : (
          <div className="space-y-3">
            {vacancyProperties.map(({ property, annual }) => (
              <div
                key={property.id}
                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{property.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Expected {formatPropertyCurrency(annual.expected_income)} ·
                    Actual {formatPropertyCurrency(annual.rental_income)}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-orange-500">
                  −{formatPropertyCurrency(annual.vacancy_loss)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageTransition>
  );
}

function KpiTile({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {value != null ? (
        <p
          className={cn(
            "mt-1 text-2xl font-bold tabular-nums",
            getYieldColorClass(value)
          )}
        >
          {formatYieldPercent(value)}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Add property value</p>
      )}
      {suffix ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">{suffix}</p>
      ) : null}
    </div>
  );
}

function YieldValue({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <div>
        <span className="text-muted-foreground">—</span>
        <p className="text-[11px] text-muted-foreground">Add value to calculate</p>
      </div>
    );
  }

  return (
    <span className={cn("font-medium tabular-nums", getYieldColorClass(value))}>
      {formatYieldPercent(value)}
    </span>
  );
}

function getYieldColorClass(yieldPercent: number): string {
  if (yieldPercent >= 7) return "text-emerald-500";
  if (yieldPercent >= 4) return "text-amber-500";
  return "text-orange-500";
}
