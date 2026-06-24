"use client";

import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Lightbulb,
  Loader2,
  PoundSterling,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { triggerPropertyInsightsGeneration } from "@/app/(dashboard)/properties/actions";
import { PropertyValuationSection } from "@/components/properties/property-valuation-section";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";
import type {
  PropertyComparable,
  PropertyInsight,
  PropertyInsightContent,
  PropertyValuation,
  PropertyWithStats,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type PropertiesWinstonClientProps = {
  insight: PropertyInsight | null;
  propertyCount: number;
  isAdmin: boolean;
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

function nextDigestDay(propertyCount: number): string {
  if (propertyCount >= 3) return "Sunday";
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function InsightCard({
  icon,
  iconClass,
  title,
  children,
  className,
}: {
  icon: React.ReactNode;
  iconClass?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/80 p-5 shadow-sm",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className={cn("shrink-0", iconClass)}>{icon}</span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
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
  properties,
  valuationsByProperty,
  comparablesByProperty,
  eligibilityByProperty,
}: PropertiesWinstonClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const content = insight?.content as PropertyInsightContent | undefined;

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
            <Sparkles className="size-6 text-amber-500" />
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
          disabled={isPending || propertyCount === 0}
          className="min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Generate now
        </Button>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!insight || !content ? (
        <div className="flex flex-col items-center px-4 py-16 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-amber-500/15">
            <Sparkles className="size-7 text-amber-500" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Your first digest is on its way
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Winston will generate your first property digest on{" "}
            {nextDigestDay(propertyCount)}.
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
              iconClass="text-amber-500"
              title="Wins"
            >
              <ul className="space-y-2">
                {content.wins.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-amber-500"
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

            <InsightCard
              icon={<PoundSterling className="size-4" />}
              iconClass="text-amber-500"
              title="Financial snapshot"
            >
              <p className="text-sm leading-relaxed text-foreground">
                {content.financial_snapshot}
              </p>
            </InsightCard>

            <InsightCard
              icon={<Lightbulb className="size-4" />}
              iconClass="text-amber-500"
              title="Winston's insight"
            >
              <div className="border-l-2 border-amber-500/60 pl-4">
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
