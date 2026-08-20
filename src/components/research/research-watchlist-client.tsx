"use client";

import { Cpu, Loader2, Lock, Radar, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  addResearchCompetitor,
  checkCompetitorTechStack,
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
  ResearchCompetitorTechStack,
  ResearchPlaceMatch,
} from "@/lib/research/types";
import { cn } from "@/lib/utils";

type ResearchWatchlistClientProps = {
  competitors: ResearchCompetitorListItem[];
  competitorCap: number;
  canAccessResearchPro: boolean;
};

function formatCheckedAgo(checkedAt: string | null | undefined): string | null {
  if (!checkedAt) return null;
  const then = new Date(checkedAt).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "checked today";
  if (days === 1) return "checked 1 day ago";
  return `checked ${days} days ago`;
}

function TechStackTags({
  techStack,
}: {
  techStack: ResearchCompetitorTechStack;
}) {
  if (techStack.tools.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">Nothing found</p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {techStack.tools.map((tool, index) => {
        const citation = techStack.citations[tool.citationIndex];
        const label = tool.text;
        if (!citation) {
          return (
            <span
              key={`${label}-${index}`}
              className="inline-flex max-w-full truncate rounded-md border border-wisk-section-research/25 bg-wisk-section-research/10 px-2 py-0.5 text-[11px] font-medium text-wisk-section-research"
            >
              {label}
            </span>
          );
        }

        return (
          <a
            key={`${label}-${index}`}
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${citation.title}${citation.snippet ? `. ${citation.snippet.slice(0, 120)}` : ""}`}
            className="inline-flex max-w-full items-center gap-1 truncate rounded-md border border-wisk-section-research/25 bg-wisk-section-research/10 px-2 py-0.5 text-[11px] font-medium text-wisk-section-research transition-colors hover:bg-wisk-section-research/15"
          >
            <span className="truncate">{label}</span>
            <span className="shrink-0 text-[10px] opacity-70">
              [{tool.citationIndex + 1}]
            </span>
          </a>
        );
      })}
    </div>
  );
}

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
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [isRemoving, startRemove] = useTransition();
  const [isChecking, startCheck] = useTransition();

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

  function handleCheckTechStack(competitorId: string) {
    setRowError((current) => {
      const next = { ...current };
      delete next[competitorId];
      return next;
    });
    setCheckingId(competitorId);
    startCheck(async () => {
      const result = await checkCompetitorTechStack(competitorId);
      setCheckingId(null);
      if (!result.success || !result.data) {
        setRowError((current) => ({
          ...current,
          [competitorId]: result.success
            ? "Could not check tech stack."
            : result.error,
        }));
        return;
      }

      const techStack = result.data;
      setCompetitors((current) =>
        current.map((item) =>
          item.competitor.id === competitorId
            ? {
                ...item,
                competitor: {
                  ...item.competitor,
                  tech_stack: techStack,
                  tech_stack_checked_at: techStack.checkedAt,
                },
              }
            : item
        )
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
              {competitors.map((item) => {
                const techStack = item.competitor.tech_stack ?? null;
                const checkedLabel = formatCheckedAgo(
                  item.competitor.tech_stack_checked_at ??
                    techStack?.checkedAt
                );
                const isThisChecking =
                  isChecking && checkingId === item.competitor.id;

                return (
                  <li key={item.competitor.id} className="space-y-2 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {item.competitor.name}
                        </p>
                        {item.competitor.url ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.competitor.url}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleCheckTechStack(item.competitor.id)
                          }
                          disabled={isThisChecking || isRemoving}
                        >
                          {isThisChecking ? (
                            <Loader2 className="mr-2 size-3.5 animate-spin" />
                          ) : (
                            <Cpu className="mr-2 size-3.5" />
                          )}
                          {techStack
                            ? "Re-check tech stack"
                            : "Check tech stack"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRemoveCompetitor(item.competitor.id)
                          }
                          disabled={isRemoving || isThisChecking}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Remove
                        </Button>
                      </div>
                    </div>

                    {checkedLabel ? (
                      <p className="text-[11px] text-muted-foreground">
                        Tech stack {checkedLabel}
                      </p>
                    ) : null}

                    {techStack ? <TechStackTags techStack={techStack} /> : null}

                    {rowError[item.competitor.id] ? (
                      <p className="text-xs text-destructive">
                        {rowError[item.competitor.id]}
                      </p>
                    ) : null}
                  </li>
                );
              })}
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
