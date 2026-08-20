"use client";

import { Activity, Loader2, MapPin, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { StaggerItem } from "@/components/motion/stagger-item";
import { StaggerList } from "@/components/motion/stagger-list";
import {
  SectionIconChip,
  SectionSurface,
} from "@/components/overview/section-card";
import { useResearchAccent } from "@/components/research/use-research-accent";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WinstonProposalReview } from "@/components/winston/winston-proposal-review";
import { WinstonProposalSuccessToast } from "@/components/winston/proposal-success-toast";
import { hexToRgba } from "@/lib/color";
import { useStaggerOnce } from "@/lib/motion/use-stagger-once";
import type {
  ResearchCompetitorListItem,
  ResearchSignal,
} from "@/lib/research/types";
import type {
  WinstonProposal,
  WinstonProposalCommitResult,
} from "@/lib/winston/proposal";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

type ResearchSignalsClientProps = {
  competitors: ResearchCompetitorListItem[];
  canAccessResearchPro: boolean;
};

export function ResearchSignalsClient({
  competitors,
  canAccessResearchPro,
}: ResearchSignalsClientProps) {
  const accent = useResearchAccent();
  const stagger = useStaggerOnce();
  const router = useRouter();
  const [proposingCheckId, setProposingCheckId] = useState<string | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSummary, setProposalSummary] = useState<string | null>(null);
  const [activeProposal, setActiveProposal] = useState<WinstonProposal | null>(
    null
  );
  const [proposalToast, setProposalToast] =
    useState<WinstonProposalCommitResult | null>(null);

  const signalCount = useMemo(
    () =>
      competitors.reduce(
        (sum, item) => sum + item.latestMeaningfulSignals.length,
        0
      ),
    [competitors]
  );

  async function handleProposeContent(signal: ResearchSignal) {
    if (!canAccessResearchPro || proposingCheckId) return;
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
      <PageHeader
        title="Latest Signals"
        subtitle="Focus-surfaced competitor changes from daily checks."
        accent="research"
        icon={
          <Activity className="size-5 text-wisk-section-research" aria-hidden />
        }
      />

      <SectionSurface accent={accent} cardId="research-signals">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <SectionIconChip accent={accent}>
              <Activity size={16} style={{ color: accent }} aria-hidden />
            </SectionIconChip>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Feed</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Meaningful changes across your watchlist.
              </p>
            </div>
          </div>
          {signalCount > 0 ? (
            <span
              className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{
                borderColor: hexToRgba(accent, 0.3),
                background: hexToRgba(accent, 0.1),
                color: accent,
              }}
            >
              {signalCount} live
            </span>
          ) : null}
        </div>

        <div className="mt-4">
          {competitors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add competitors on the Watchlist to start daily checks.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/50 bg-background/30">
              <StaggerList
                stagger={stagger}
                className="divide-y divide-border/40"
              >
                {competitors.map((item) => (
                  <StaggerItem
                    key={item.competitor.id}
                    stagger={stagger}
                    as="div"
                  >
                    <div className="border-l-2 border-l-wisk-section-research/70 px-4 py-3">
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

                      <div className="mt-3 space-y-2">
                        {item.latestChecks[0] ? (
                          <p className="text-xs text-muted-foreground">
                            Last checked{" "}
                            {formatDateTime(item.latestChecks[0].checked_at)}
                          </p>
                        ) : null}
                        {item.latestMeaningfulSignals.length > 0 ? (
                          item.latestMeaningfulSignals.map((signal) => (
                            <div
                              key={signal.checkId}
                              className="rounded-lg border border-border/40 bg-card/60 px-3 py-2"
                            >
                              <p className="text-sm font-medium text-foreground">
                                {signal.summary}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {signal.detail} ·{" "}
                                {formatDateTime(signal.checkedAt)}
                              </p>
                              {canAccessResearchPro ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 h-7 px-2 text-xs text-wisk-section-research"
                                  disabled={
                                    proposingCheckId === signal.checkId
                                  }
                                  onClick={() =>
                                    void handleProposeContent(signal)
                                  }
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
                  </StaggerItem>
                ))}
              </StaggerList>
            </div>
          )}
          {proposalError ? (
            <p className="mt-3 text-sm text-destructive">{proposalError}</p>
          ) : null}
        </div>
      </SectionSurface>

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
