"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatPropertyCurrency, formatYieldPercent } from "@/lib/properties/format";
import type { FinancialSummary } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

const CHART_COLORS = {
  income: "#10b981",
  mortgage: "#f59e0b",
  insurance: "#3b82f6",
  maintenance: "#f97316",
  net: "#016c81",
  costs: "#f59e0b",
};

type PropertyFinancialSummaryProps = {
  monthlySummary: FinancialSummary;
  annualSummary: FinancialSummary;
};

type ChartTab = "breakdown" | "trends" | "summary";

export function PropertyFinancialSummary({
  monthlySummary,
  annualSummary,
}: PropertyFinancialSummaryProps) {
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [chartTab, setChartTab] = useState<ChartTab>("breakdown");

  const summary = period === "monthly" ? monthlySummary : annualSummary;

  const hasChartData =
    summary.rental_income > 0 ||
    summary.mortgage_cost > 0 ||
    summary.insurance_cost > 0 ||
    summary.maintenance_cost > 0;

  const breakdownData = useMemo(
    () =>
      [
        { name: "Rental income", value: summary.rental_income, color: CHART_COLORS.income },
        { name: "Mortgage", value: summary.mortgage_cost, color: CHART_COLORS.mortgage },
        { name: "Insurance", value: summary.insurance_cost, color: CHART_COLORS.insurance },
        {
          name: "Maintenance",
          value: summary.maintenance_cost,
          color: CHART_COLORS.maintenance,
        },
        {
          name: "Net income",
          value: Math.max(summary.net_income, 0),
          color: CHART_COLORS.net,
        },
      ].filter((item) => item.value > 0),
    [summary]
  );

  const trendData = useMemo(
    () =>
      summary.monthly_breakdown.map((item) => ({
        month: item.month,
        income: item.income,
        costs: item.costs,
        net: item.net,
      })),
    [summary.monthly_breakdown]
  );

  const hasTrendData = trendData.some(
    (item) => item.income > 0 || item.costs > 0
  );

  return (
    <section className="space-y-4 rounded-xl border border-wisk-ferrari/15 bg-card/60 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Financial summary
          </h2>
          <p className="text-sm text-muted-foreground">
            Income, costs, and yield for this property.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border/60 p-1">
          {(["monthly", "annual"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={cn(
                "min-h-10 rounded-md px-4 text-sm font-medium capitalize transition-colors",
                period === value
                  ? "bg-wisk-ferrari text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={`Net income (${period})`}
          value={formatPropertyCurrency(summary.net_income)}
        />
        <StatCard
          label="Gross yield"
          value={
            summary.gross_yield != null
              ? formatYieldPercent(summary.gross_yield)
              : "—"
          }
        />
        <StatCard
          label="Net yield"
          value={
            summary.net_yield != null
              ? formatYieldPercent(summary.net_yield)
              : "—"
          }
        />
        <StatCard
          label="ROI"
          value={
            summary.roi != null ? formatYieldPercent(summary.roi) : "—"
          }
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-2">
        {(
          [
            ["breakdown", "Breakdown"],
            ["trends", "Trends"],
            ["summary", "Summary"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setChartTab(id)}
            className={cn(
              "min-h-10 rounded-md px-3 text-sm font-medium transition-colors",
              chartTab === id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {chartTab === "breakdown" ? (
        hasChartData ? (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdownData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                >
                  {breakdownData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    formatPropertyCurrency(Number(value ?? 0))
                  }
                />
                <Legend />
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground text-sm font-semibold"
                >
                  {formatPropertyCurrency(summary.net_income)}
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="Add rent, mortgage, insurance, or maintenance records to see a breakdown." />
        )
      ) : null}

      {chartTab === "trends" ? (
        hasTrendData ? (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) =>
                    formatPropertyCurrency(Number(value ?? 0))
                  }
                />
                <Legend />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill={CHART_COLORS.income}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="costs"
                  name="Total costs"
                  fill={CHART_COLORS.costs}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Net income"
                  stroke={CHART_COLORS.net}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="Trend data will appear once you have income or cost records." />
        )
      ) : null}

      {chartTab === "summary" ? (
        <div className="space-y-4">
          <SummaryGroup title="Income">
            <SummaryRow label="Rent received" value={summary.rental_income} />
            <SummaryRow label="Expected rent" value={summary.expected_income} />
            <SummaryRow label="Vacancy loss" value={summary.vacancy_loss} />
          </SummaryGroup>
          <SummaryGroup title="Costs">
            <SummaryRow label="Mortgage" value={summary.mortgage_cost} />
            <SummaryRow label="Insurance" value={summary.insurance_cost} />
            <SummaryRow label="Maintenance" value={summary.maintenance_cost} />
          </SummaryGroup>
          <SummaryGroup title="Totals">
            <SummaryRow label="Gross income" value={summary.rental_income} />
            <SummaryRow label="Total costs" value={summary.total_costs} />
            <SummaryRow label="Net income" value={summary.net_income} strong />
          </SummaryGroup>
          {!hasChartData ? (
            <p className="text-sm text-muted-foreground">
              Add mortgage, insurance, or maintenance records to see a complete
              breakdown.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-wisk-ferrari/15 bg-card/80 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function SummaryGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40">
      <div className="border-b border-border/60 px-4 py-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="divide-y divide-border/50">{children}</div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          strong ? "font-semibold text-foreground" : "text-foreground"
        )}
      >
        {formatPropertyCurrency(value)}
      </span>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-wisk-ferrari/20 bg-card/30 px-6 text-center">
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
