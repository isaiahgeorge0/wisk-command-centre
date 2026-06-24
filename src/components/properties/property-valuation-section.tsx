"use client";

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { deleteComparable, deleteValuationForProperty } from "@/app/(dashboard)/properties/actions";
import { PropertyComparableFormDialog } from "@/components/properties/property-comparable-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPropertyCurrency, formatPropertyDate } from "@/lib/properties/format";
import type {
  PropertyComparable,
  PropertyValuation,
  PropertyWithStats,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type PropertyValuationSectionProps = {
  properties: PropertyWithStats[];
  valuationsByProperty: Record<string, PropertyValuation | null>;
  comparablesByProperty: Record<string, PropertyComparable[]>;
  eligibilityByProperty: Record<
    string,
    { canGenerate: boolean; nextAvailableAt: string | null }
  >;
};

function confidenceBadgeClass(confidence: PropertyValuation["confidence"]): string {
  switch (confidence) {
    case "high":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "medium":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "low":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
}

function formatPriceRange(min: number | null, max: number | null, suffix = ""): string {
  if (min == null && max == null) return "Estimate unavailable";
  if (min != null && max != null) {
    return `${formatPropertyCurrency(min)} — ${formatPropertyCurrency(max)}${suffix}`;
  }
  return `${formatPropertyCurrency(min ?? max)}${suffix}`;
}

const isDev = process.env.NODE_ENV === "development";

export function PropertyValuationSection({
  properties,
  valuationsByProperty,
  comparablesByProperty,
  eligibilityByProperty,
}: PropertyValuationSectionProps) {
  const router = useRouter();
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    properties[0]?.id ?? ""
  );
  const [comparablesOpen, setComparablesOpen] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingComparable, setEditingComparable] =
    useState<PropertyComparable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerate] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [isResetting, startReset] = useTransition();

  const valuation = valuationsByProperty[selectedPropertyId] ?? null;
  const comparables = comparablesByProperty[selectedPropertyId] ?? [];
  const eligibility = eligibilityByProperty[selectedPropertyId] ?? {
    canGenerate: true,
    nextAvailableAt: null,
  };

  const comparableCount = useMemo(() => {
    const manual = valuation?.manual_comparables?.length ?? comparables.length;
    return manual;
  }, [valuation, comparables.length]);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId),
    [properties, selectedPropertyId]
  );

  const lowEvidence =
    valuation?.search_level === "town" ||
    valuation?.confidence === "low";

  const rentalUnavailable =
    valuation != null &&
    valuation.rental_min == null &&
    valuation.rental_max == null;

  const handleGenerate = () => {
    setError(null);
    startGenerate(async () => {
      const response = await fetch("/api/properties/generate-valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: selectedPropertyId }),
      });
      const data = (await response.json()) as {
        error?: string;
        nextAvailableAt?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Could not generate valuation");
        return;
      }

      router.refresh();
    });
  };

  const handleDeleteComparable = (id: string) => {
    startDelete(async () => {
      await deleteComparable(id);
      router.refresh();
    });
  };

  const handleDevReset = () => {
    startReset(async () => {
      await deleteValuationForProperty(selectedPropertyId);
      router.refresh();
    });
  };

  if (properties.length === 0) return null;

  return (
    <section className="mt-10 space-y-4 border-t border-border/60 pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Property valuations
          </h2>
          <p className="text-sm text-muted-foreground">
            Rental and sale price estimates powered by market search.
          </p>
        </div>
        {properties.length > 1 ? (
          <Select
            value={selectedPropertyId}
            onValueChange={(v) => v && setSelectedPropertyId(v)}
          >
            <SelectTrigger className="min-h-11 w-full sm:w-[240px]">
              <SelectValue placeholder="Select property">
                {selectedProperty?.name ?? "Select property"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="rounded-xl border border-border/60 bg-card/80 p-5 shadow-sm">
        {!valuation ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Rental & sale price estimate
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Winston will search current market data to recommend a rental
                and sale price for this property.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !eligibility.canGenerate}
              className="min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90"
            >
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Generate estimate
            </Button>
            <p className="text-xs text-muted-foreground">
              Estimates can be regenerated every 3 months.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Generated {formatPropertyDate(valuation.generated_at)}
              </span>
              <Badge variant="outline">
                {valuation.search_level === "postcode"
                  ? "Postcode data"
                  : "Town data — limited evidence"}
              </Badge>
              <Badge
                variant="outline"
                className={confidenceBadgeClass(valuation.confidence)}
              >
                {valuation.confidence.charAt(0).toUpperCase() +
                  valuation.confidence.slice(1)}{" "}
                confidence
              </Badge>
            </div>

            {lowEvidence ? (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Limited market data available for this postcode. This estimate
                  is based on broader area data and should be treated as a rough
                  guide.
                </p>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Rental estimate
                </p>
                <p
                  className={cn(
                    "mt-2 text-2xl font-semibold tabular-nums",
                    rentalUnavailable
                      ? "text-muted-foreground"
                      : "text-foreground"
                  )}
                >
                  {formatPriceRange(
                    valuation.rental_min,
                    valuation.rental_max,
                    rentalUnavailable ? "" : " /month"
                  )}
                </p>
                {rentalUnavailable ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {valuation.reasoning}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Based on {comparableCount} comparable propert
                    {comparableCount === 1 ? "y" : "ies"}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Sale estimate
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                  {valuation.sale_min != null || valuation.sale_max != null
                    ? formatPriceRange(valuation.sale_min, valuation.sale_max)
                    : "—"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Total property value
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setReasoningOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-lg border border-border/60 px-4 py-3 text-left text-sm font-medium text-foreground"
            >
              Winston&apos;s reasoning
              {reasoningOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
            {reasoningOpen ? (
              <p className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                {valuation.reasoning}
              </p>
            ) : null}

            {valuation.web_sources && valuation.web_sources.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Web sources</p>
                <ul className="space-y-2">
                  {valuation.web_sources.map((source, index) => (
                    <li key={index}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-amber-600 hover:underline dark:text-amber-400"
                      >
                        {source.title}
                        <ExternalLink className="size-3.5" />
                      </a>
                      {source.snippet ? (
                        <p className="text-xs text-muted-foreground">
                          {source.snippet}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!eligibility.canGenerate && eligibility.nextAvailableAt ? (
              <p className="text-sm text-muted-foreground">
                Next estimate available:{" "}
                {formatPropertyDate(eligibility.nextAvailableAt)}
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  variant="outline"
                  className="min-h-11 gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Regenerate estimate
                </Button>
                {isDev ? (
                  <Button
                    onClick={handleDevReset}
                    disabled={isResetting}
                    variant="ghost"
                    className="min-h-11 text-muted-foreground"
                  >
                    {isResetting ? "Resetting…" : "Reset (dev only)"}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        )}

        {error ? (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        ) : null}

        <div className="mt-6 border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={() => setComparablesOpen((open) => !open)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">
                Add comparables
              </p>
              <p className="text-xs text-muted-foreground">
                Adding comparable properties from Rightmove, Zoopla, or local
                agents helps Winston make a more accurate estimate.
              </p>
            </div>
            {comparablesOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>

          {comparablesOpen ? (
            <div className="mt-4 space-y-3">
              {comparables.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No comparables added yet.
                </p>
              ) : (
                comparables.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          {item.address}
                        </p>
                        <Badge variant="outline">
                          {item.comparable_type === "rental" ? "Rental" : "Sale"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatPropertyCurrency(item.price)}
                        {item.date ? ` · ${formatPropertyDate(item.date)}` : ""}
                        {item.source ? ` · ${item.source}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-10"
                        onClick={() => {
                          setEditingComparable(item);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-10 text-destructive"
                        onClick={() => handleDeleteComparable(item.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <Button
                variant="outline"
                className="min-h-11 gap-2"
                onClick={() => {
                  setEditingComparable(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" />
                Add comparable
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <PropertyComparableFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        propertyId={selectedPropertyId}
        comparable={editingComparable}
      />
    </section>
  );
}
