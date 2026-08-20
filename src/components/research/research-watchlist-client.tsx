"use client";

import { Loader2, Lock, Radar, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  addResearchCompetitor,
  removeResearchCompetitor,
  searchResearchCompetitorPlaces,
} from "@/app/(dashboard)/research/actions";
import { PageHeader } from "@/components/layout/page-header";
import {
  SectionIconChip,
  SectionSurface,
} from "@/components/overview/section-card";
import { useResearchAccent } from "@/components/research/use-research-accent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  ResearchCompetitorListItem,
  ResearchPlaceMatch,
} from "@/lib/research/types";
import { cn } from "@/lib/utils";

type ResearchWatchlistClientProps = {
  competitors: ResearchCompetitorListItem[];
  competitorCap: number;
  canAccessResearchPro: boolean;
};

export function ResearchWatchlistClient({
  competitors: initialCompetitors,
  competitorCap,
  canAccessResearchPro,
}: ResearchWatchlistClientProps) {
  const accent = useResearchAccent();
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [placeResults, setPlaceResults] = useState<ResearchPlaceMatch[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<ResearchPlaceMatch | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [isRemoving, startRemove] = useTransition();

  const slotsRemaining = useMemo(
    () => competitorCap - competitors.length,
    [competitors.length, competitorCap]
  );

  const fillPercent = useMemo(() => {
    if (competitorCap <= 0) return 0;
    return Math.min(
      100,
      Math.round((competitors.length / competitorCap) * 100)
    );
  }, [competitors.length, competitorCap]);

  function handleSearchPlaces() {
    setError(null);
    startSearch(async () => {
      const result = await searchResearchCompetitorPlaces(name.trim());
      if (!result.success) {
        setError(result.error);
        return;
      }

      setPlaceResults(result.data ?? []);
      setSelectedPlace((result.data ?? [])[0] ?? null);
    });
  }

  function handleAddCompetitor() {
    setError(null);
    startSave(async () => {
      const result = await addResearchCompetitor({
        name,
        url,
        googlePlaceId: selectedPlace?.placeId,
        googlePlaceLabel: selectedPlace
          ? `${selectedPlace.displayName} - ${selectedPlace.formattedAddress}`
          : undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      window.location.reload();
    });
  }

  function handleRemoveCompetitor(competitorId: string) {
    setError(null);
    startRemove(async () => {
      const result = await removeResearchCompetitor(competitorId);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setCompetitors((current) =>
        current.filter((item) => item.competitor.id !== competitorId)
      );
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Competitor Watchlist"
        subtitle="Track competitors. Daily Tavily and Google Places checks flag what matters."
        accent="research"
        icon={
          <Radar className="size-5 text-wisk-section-research" aria-hidden />
        }
      />

      <SectionSurface accent={accent} cardId="research-watchlist">
        <div className="flex items-start gap-3">
          <SectionIconChip accent={accent}>
            <Radar size={16} style={{ color: accent }} aria-hidden />
          </SectionIconChip>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Tracked competitors
              </h2>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {canAccessResearchPro ? "Research Pro cap" : "Research cap"}
              </span>
            </div>
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {competitors.length}/{competitorCap} tracked
                </span>
                <span>
                  {slotsRemaining} slot{slotsRemaining === 1 ? "" : "s"} left
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${fillPercent}%`, background: accent }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Competitor name
              </label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Acme Lettings"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Website
              </label>
              <Input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSearchPlaces}
              disabled={isSearching || !name.trim()}
            >
              {isSearching ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Search className="mr-2 size-4" />
              )}
              Find Google Place
            </Button>
            <Button
              onClick={handleAddCompetitor}
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Add competitor
            </Button>
          </div>

          {placeResults.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-border/50 bg-background/40 p-3">
              <p className="text-sm font-medium text-foreground">
                Link a Google Place
              </p>
              <div className="space-y-2">
                {placeResults.map((place) => {
                  const isSelected = selectedPlace?.placeId === place.placeId;
                  return (
                    <button
                      key={place.placeId}
                      type="button"
                      onClick={() => setSelectedPlace(place)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                        isSelected
                          ? "border-wisk-section-research bg-wisk-section-research/5"
                          : "border-border/60 hover:bg-accent"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {place.displayName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {place.formattedAddress}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {place.rating != null
                            ? `${place.rating.toFixed(1)} stars`
                            : "No rating"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {competitors.length > 0 ? (
            <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/50">
              {competitors.map((item) => (
                <li
                  key={item.competitor.id}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.competitor.name}
                    </p>
                    {item.competitor.url ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.competitor.url}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCompetitor(item.competitor.id)}
                    disabled={isRemoving}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No competitors tracked yet. Add one above to start checks.
            </p>
          )}

          {!canAccessResearchPro ? (
            <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-background/40 p-3 text-xs text-muted-foreground">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-wisk-section-research" />
              <p>
                Research Pro raises the watchlist cap to 15.{" "}
                <Link
                  href="/upgrade/research-pro"
                  className="font-medium text-wisk-section-research hover:underline"
                >
                  Upgrade
                </Link>
              </p>
            </div>
          ) : null}
        </div>
      </SectionSurface>
    </div>
  );
}
