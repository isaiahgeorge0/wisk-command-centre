"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Loader2,
  Lock,
  MapPin,
  Minus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  addResearchCompetitor,
  getResearchWinRateDashboard,
  removeResearchCompetitor,
  searchResearchCompetitorPlaces,
} from "@/app/(dashboard)/research/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WinstonProposalReview } from "@/components/winston/winston-proposal-review";
import { WinstonProposalSuccessToast } from "@/components/winston/proposal-success-toast";
import { WinstonSectionEntry } from "@/components/winston/winston-entry-button";
import {
  formatLeadValue,
  formatPipelineValueSplit,
} from "@/lib/leads/format";
import type {
  ResearchPageData,
  ResearchPlaceMatch,
  ResearchSignal,
} from "@/lib/research/types";
import {
  RESEARCH_WIN_RATE_PERIODS,
  type ResearchWinRateDashboard,
  type ResearchWinRatePeriod,
} from "@/lib/research/win-rate";
import type {
  WinstonProposal,
  WinstonProposalCommitResult,
} from "@/lib/winston/proposal";
import { cn } from "@/lib/utils";

type ResearchPageClientProps = {
  initialData: ResearchPageData;
};

const PERIOD_LABELS: Record<ResearchWinRatePeriod, string> = {
  this_month: "This month",
  last_month: "Last month",
  last_30_days: "Last 30 days",
  this_quarter: "This quarter",
  all_time: "All time",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${value}%`;
}

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function TrendBadge({ dashboard }: { dashboard: ResearchWinRateDashboard }) {
  const comparison = dashboard.comparison;
  if (!comparison) {
    return (
      <span className="text-xs text-muted-foreground">No prior period</span>
    );
  }

  if (comparison.direction === "na" || comparison.deltaPoints == null) {
    return (
      <span className="text-xs text-muted-foreground">
        vs {comparison.periodLabel}: insufficient closed deals
      </span>
    );
  }

  const Icon =
    comparison.direction === "up"
      ? ArrowUpRight
      : comparison.direction === "down"
        ? ArrowDownRight
        : comparison.direction === "flat"
          ? Minus
          : ArrowRight;

  const tone =
    comparison.direction === "up"
      ? "text-emerald-400"
      : comparison.direction === "down"
        ? "text-wisk-coral"
        : "text-muted-foreground";

  const signed =
    comparison.deltaPoints > 0
      ? `+${comparison.deltaPoints}`
      : `${comparison.deltaPoints}`;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", tone)}>
      <Icon className="size-3.5" aria-hidden />
      {signed} pts vs {comparison.periodLabel}
      {comparison.winRatePercent != null
        ? ` (${formatPercent(comparison.winRatePercent)})`
        : ""}
    </span>
  );
}

function WinRateDashboardCard({
  initialDashboard,
}: {
  initialDashboard: ResearchWinRateDashboard;
}) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePeriodChange(value: string | null) {
    if (!value) return;
    if (!(RESEARCH_WIN_RATE_PERIODS as readonly string[]).includes(value)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await getResearchWinRateDashboard(
        value as ResearchWinRatePeriod
      );
      if (!result.success || !result.data) {
        setError(result.success ? "Could not load win-rate analytics." : result.error);
        return;
      }
      setDashboard(result.data);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Win-rate dashboard</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Computed from your closed Leads (Won / Lost). Figures are data-driven —
            not AI estimates.
          </p>
        </div>
        <Select value={dashboard.period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="min-h-11 w-full sm:w-[180px]">
            <SelectValue>
              {PERIOD_LABELS[dashboard.period]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {RESEARCH_WIN_RATE_PERIODS.map((period) => (
              <SelectItem key={period} value={period}>
                {PERIOD_LABELS[period]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>
            Period: {dashboard.periodLabel}
            {dashboard.dateFrom && dashboard.dateTo
              ? ` (${dashboard.dateFrom} → ${dashboard.dateTo})`
              : ""}
          </span>
          {isPending ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" />
              Updating…
            </span>
          ) : (
            <TrendBadge dashboard={dashboard} />
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-card/60 p-4">
            <p className="text-xs font-medium text-muted-foreground">Win rate</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {formatPercent(dashboard.winRatePercent)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dashboard.wonCount} won · {dashboard.lostCount} lost
              {dashboard.closedCount === 0 ? " · no closed deals" : ""}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/60 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Total value won
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
              {formatPipelineValueSplit(dashboard.totalValueWon)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upfront and recurring kept separate
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/60 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Avg deal size
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {formatCurrency(dashboard.averageDealSizeAnnualized)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Annualised
              {dashboard.valuedWinCount > 0
                ? ` · ${dashboard.valuedWinCount} valued win${dashboard.valuedWinCount === 1 ? "" : "s"}`
                : " · no valued wins"}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/60 p-4">
            <p className="text-xs font-medium text-muted-foreground">Closed deals</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {dashboard.closedCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Attributed by lead updated date
            </p>
          </div>
        </div>

        {dashboard.totalValueWon.monthly > 0 ? (
          <p className="text-xs text-muted-foreground">
            Recurring wins contribute{" "}
            {formatLeadValue(dashboard.totalValueWon.monthly, "monthly")} to
            total value won; avg deal size annualises monthly values (×12) so
            they can be compared with one-time deals.
          </p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

export function ResearchPageClient({ initialData }: ResearchPageClientProps) {
  const router = useRouter();
  const [competitors, setCompetitors] = useState(initialData.competitors);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [placeResults, setPlaceResults] = useState<ResearchPlaceMatch[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<ResearchPlaceMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [isRemoving, startRemove] = useTransition();
  const [proposingCheckId, setProposingCheckId] = useState<string | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSummary, setProposalSummary] = useState<string | null>(null);
  const [activeProposal, setActiveProposal] = useState<WinstonProposal | null>(
    null
  );
  const [proposalToast, setProposalToast] =
    useState<WinstonProposalCommitResult | null>(null);

  const slotsRemaining = useMemo(
    () => initialData.competitorCap - competitors.length,
    [competitors.length, initialData.competitorCap]
  );

  function resetForm() {
    setName("");
    setUrl("");
    setPlaceResults([]);
    setSelectedPlace(null);
  }

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
      resetForm();
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

  async function handleProposeContent(signal: ResearchSignal) {
    if (!initialData.canAccessResearchPro || proposingCheckId) return;
    setProposingCheckId(signal.checkId);
    setProposalError(null);
    try {
      const response = await fetch("/api/winston/research/propose-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkId: signal.checkId }),
      });
      const data = (await response.json()) as {
        found?: boolean;
        message?: string | null;
        proposal?: WinstonProposal;
        error?: string;
      };
      if (!response.ok) {
        setProposalError(data.error ?? "Could not build a content proposal");
        return;
      }
      if (!data.found || !data.proposal) {
        setProposalError(
          data.message ?? "No clear content angle from this signal yet."
        );
        return;
      }
      setActiveProposal(data.proposal);
      setProposalSummary(data.message ?? null);
    } catch {
      setProposalError("Could not reach Winston. Please try again.");
    } finally {
      setProposingCheckId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Ask Winston</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Open-ended market and competitor research with cited sources.
            </p>
          </div>
          {initialData.canAccessResearchPro ? (
            <WinstonSectionEntry section="research" label="Ask Winston" />
          ) : null}
        </CardHeader>
        <CardContent>
          {initialData.canAccessResearchPro ? (
            <p className="text-sm text-muted-foreground">
              Open the Winston panel to ask any research question. Answers pull
              from live search and only keep claims with valid citations.
            </p>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Lock className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Research Pro unlocks open research chat
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your Research plan includes the watchlist and win-rate
                    dashboard. Upgrade for cited answers to any market question.
                  </p>
                </div>
              </div>
              <Link
                href="/upgrade/research-pro"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Upgrade to Research Pro
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <WinRateDashboardCard initialDashboard={initialData.winRate} />

      <Card>
        <CardHeader>
          <CardTitle>Competitor Watchlist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <span className="text-sm text-muted-foreground">
              {competitors.length}/{initialData.competitorCap} tracked
            </span>
            <span className="text-sm text-muted-foreground">
              {slotsRemaining} slot{slotsRemaining === 1 ? "" : "s"} left
            </span>
            <span className="text-sm text-muted-foreground">
              {initialData.canAccessResearchPro ? "Research Pro cap" : "Research cap"}
            </span>
          </div>

          {placeResults.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-border/60 p-3">
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
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border/60 hover:bg-accent"
                      }`}
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
                          {place.rating != null ? `${place.rating.toFixed(1)} stars` : "No rating"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button onClick={handleAddCompetitor} disabled={isSaving || !name.trim()}>
            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Add competitor
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest Signals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {competitors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add competitors to start daily Tavily and Google Places checks.
            </p>
          ) : (
            competitors.map((item) => (
              <div
                key={item.competitor.id}
                className="rounded-xl border border-border/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {item.competitor.name}
                    </p>
                    {item.competitor.url ? (
                      <p className="text-xs text-muted-foreground">
                        {item.competitor.url}
                      </p>
                    ) : null}
                    {item.competitor.google_place_label ? (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {item.competitor.google_place_label}
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
                </div>

                <div className="mt-4 space-y-2">
                  {item.latestChecks[0] ? (
                    <p className="text-xs text-muted-foreground">
                      Last checked {formatDateTime(item.latestChecks[0].checked_at)}
                    </p>
                  ) : null}
                  {item.latestMeaningfulSignals.length > 0 ? (
                    item.latestMeaningfulSignals.map((signal) => (
                      <div
                        key={signal.checkId}
                        className="rounded-lg bg-muted/40 px-3 py-2"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {signal.summary}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {signal.detail} · {formatDateTime(signal.checkedAt)}
                        </p>
                        {initialData.canAccessResearchPro ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 px-2 text-xs text-wisk-section-winston"
                            disabled={proposingCheckId === signal.checkId}
                            onClick={() => void handleProposeContent(signal)}
                          >
                            {proposingCheckId === signal.checkId ? (
                              <Loader2 className="mr-1.5 size-3 animate-spin" />
                            ) : (
                              <Sparkles className="mr-1.5 size-3" />
                            )}
                            {proposingCheckId === signal.checkId
                              ? "Building proposal…"
                              : "Propose content"}
                          </Button>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No meaningful changes flagged yet.
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
          {proposalError ? (
            <p className="text-sm text-destructive">{proposalError}</p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(activeProposal)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveProposal(null);
            setProposalSummary(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Review content proposal</DialogTitle>
            <DialogDescription>
              Nothing is created until you confirm. Same Winston review → commit
              loop used elsewhere in the app.
            </DialogDescription>
          </DialogHeader>
          {proposalSummary ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {proposalSummary}
            </p>
          ) : null}
          {activeProposal ? (
            <WinstonProposalReview
              proposal={activeProposal}
              allowedEntityTypes={["content_post"]}
              title="Review content proposal"
              commitLabel="Create selected"
              onCancel={() => {
                setActiveProposal(null);
                setProposalSummary(null);
              }}
              onCommitted={(result) => {
                setProposalToast(result);
                router.refresh();
                if (result.errors.length === 0) {
                  setActiveProposal(null);
                  setProposalSummary(null);
                }
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <WinstonProposalSuccessToast
        result={proposalToast}
        onDismiss={() => setProposalToast(null)}
      />
    </div>
  );
}
