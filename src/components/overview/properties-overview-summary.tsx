import { Building2, PoundSterling, Users, Wrench } from "lucide-react";

import type { PortfolioStats } from "@/lib/properties/types";
import { formatPropertyCurrency } from "@/lib/properties/format";

type PropertiesOverviewSummaryProps = {
  stats: PortfolioStats;
};

export function PropertiesOverviewSummary({
  stats,
}: PropertiesOverviewSummaryProps) {
  const items = [
    {
      label: "Total properties",
      value: String(stats.totalProperties),
      icon: Building2,
    },
    {
      label: "Occupied vs vacant",
      value: `${stats.occupiedCount} / ${stats.vacantCount}`,
      icon: Users,
    },
    {
      label: "Rent due this month",
      value: formatPropertyCurrency(stats.totalMonthlyRent),
      icon: PoundSterling,
    },
    {
      label: "Open maintenance",
      value: String(stats.openMaintenanceCount),
      icon: Wrench,
    },
  ];

  return (
    <section className="mb-8" aria-label="Properties portfolio summary">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Portfolio summary</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A lightweight snapshot of your property portfolio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-amber-500/15 bg-card/60 p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Icon className="size-4 text-amber-500" aria-hidden />
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </p>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
