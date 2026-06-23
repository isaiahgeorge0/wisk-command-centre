"use client";

import {
  Building2,
  ChevronRight,
  LayoutDashboard,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { PropertyFormDialog } from "@/components/properties/property-form-dialog";
import { PropertyStatusBadge } from "@/components/properties/property-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { PROPERTIES_ACCENT } from "@/lib/properties/constants";
import {
  formatPropertyAddress,
  formatPropertyCurrency,
} from "@/lib/properties/format";
import {
  buildPortfolioStats,
  sortPropertiesByStatus,
} from "@/lib/properties/selectors";
import type {
  PropertyInsight,
  PropertyInsightContent,
  PropertyWithStats,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type PropertiesDashboardClientProps = {
  properties: PropertyWithStats[];
  latestInsight: PropertyInsight | null;
};

export function PropertiesDashboardClient({
  properties,
  latestInsight,
}: PropertiesDashboardClientProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [insightDismissed, setInsightDismissed] = useState(false);
  const stats = buildPortfolioStats(properties);
  const sortedProperties = sortPropertiesByStatus(properties);

  const showInsightCard = useMemo(() => {
    if (insightDismissed || !latestInsight) return false;
    const ageMs =
      Date.now() - new Date(latestInsight.generated_at).getTime();
    return ageMs < 7 * 24 * 60 * 60 * 1000;
  }, [insightDismissed, latestInsight]);

  const insightContent = latestInsight?.content as
    | PropertyInsightContent
    | undefined;

  const handleAdd = useCallback(() => {
    setFormOpen(true);
  }, []);

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          className="mb-0"
          title="Dashboard"
          subtitle="Portfolio overview and key metrics at a glance."
          icon={
            <LayoutDashboard
              className="size-6"
              style={{ color: PROPERTIES_ACCENT }}
            />
          }
        />
        <Button
          onClick={handleAdd}
          className="min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90"
        >
          <Plus className="size-4" />
          Add property
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-16 text-center">
          <Building2 className="mb-4 size-10 text-amber-500" />
          <h2 className="text-lg font-medium text-foreground">No properties yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Add your first property to get started.
          </p>
          <Button
            className="mt-6 min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90"
            onClick={handleAdd}
          >
            <Plus className="size-4" />
            Add property
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Total properties"
              value={String(stats.totalProperties)}
            />
            <StatTile
              label="Occupied / Vacant"
              value={`${stats.occupiedCount} / ${stats.vacantCount}`}
            />
            <StatTile
              label="Monthly rent income"
              value={formatPropertyCurrency(stats.totalMonthlyRent)}
            />
            <StatTile
              label="Open maintenance"
              value={String(stats.openMaintenanceCount)}
            />
          </div>

          {showInsightCard && insightContent ? (
            <div className="mb-8 rounded-xl border border-border/60 border-l-4 border-l-amber-500 bg-card/80 p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Winston&apos;s take
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setInsightDismissed(true)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  aria-label="Dismiss"
                >
                  <X className="size-4" />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {insightContent.portfolio_health}
              </p>
              {insightContent.attention.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {insightContent.attention.slice(0, 3).map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
              <Link
                href="/properties/winston"
                className="mt-4 inline-flex text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
              >
                View full insights →
              </Link>
            </div>
          ) : null}

          <section aria-label="Portfolio overview">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Portfolio overview
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                All properties sorted by status.
              </p>
            </div>

            <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card/40">
              {sortedProperties.map((property) => (
                <div
                  key={property.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium text-foreground">
                      {property.name}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {formatPropertyAddress(property)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <PropertyStatusBadge status={property.status} />
                      <span className="text-sm text-muted-foreground">
                        {formatPropertyCurrency(property.monthly_rent)}/mo
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/properties/${property.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "min-h-11 shrink-0 gap-1.5"
                    )}
                  >
                    View
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <PropertyFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </PageTransition>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-500/15 bg-card/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
