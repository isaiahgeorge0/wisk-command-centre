"use client";

import { useState, useTransition } from "react";

import { refreshSubscriptionRevenueBreakdown } from "@/app/(dashboard)/admin/actions";
import type {
  SubscriptionRevenueBreakdown,
  SubscriptionRevenueRow,
} from "@/lib/admin/types";
import { getPackageDisplayName } from "@/lib/billing/emails";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SubscriptionRevenueSectionProps = {
  initialData: SubscriptionRevenueBreakdown;
};

function formatGBP(value: number | null) {
  if (value == null) return "Not configured";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(value);
}

function RevenueRow({ row }: { row: SubscriptionRevenueRow }) {
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-4 py-3 font-medium">{getPackageDisplayName(row.package)}</td>
      <td className="px-4 py-3 text-muted-foreground">{row.activeSubscribers}</td>
      <td className="px-4 py-3 text-muted-foreground">{formatGBP(row.priceGBP)}</td>
      <td className="px-4 py-3 font-medium">
        {row.mrrContributionGBP == null
          ? "Needs Stripe price"
          : formatGBP(row.mrrContributionGBP)}
      </td>
    </tr>
  );
}

export function SubscriptionRevenueSection({
  initialData,
}: SubscriptionRevenueSectionProps) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{data.totalActiveSubscribers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatGBP(data.totalMRRKnownGBP)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This month
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.trend ? (
              <>
                <p className="font-medium">{data.trend.monthLabel}</p>
                <p className="text-sm text-muted-foreground">
                  New: {data.trend.newThisMonth}
                </p>
                <p className="text-sm text-muted-foreground">
                  Cancelled: {data.trend.churnedThisMonth}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not enough subscription history yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Revenue by package</CardTitle>
            <CardDescription>
              Current-state subscription counts and monthly recurring revenue by
              package.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await refreshSubscriptionRevenueBreakdown();
                if (!result.success) {
                  setError(result.error);
                  return;
                }
                if (!result.data) {
                  setError("No subscription revenue data returned.");
                  return;
                }
                setData(result.data);
              });
            }}
          >
            {isPending ? "Refreshing…" : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.unknownPricePackages.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Packages with active subscribers but no Stripe price configured:
              </span>
              {data.unknownPricePackages.map((pkg) => (
                <Badge key={pkg} variant="outline">
                  {getPackageDisplayName(pkg)}
                </Badge>
              ))}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Package</th>
                  <th className="px-4 py-3 font-medium">Active subscribers</th>
                  <th className="px-4 py-3 font-medium">Monthly price</th>
                  <th className="px-4 py-3 font-medium">MRR contribution</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <RevenueRow key={row.package} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
