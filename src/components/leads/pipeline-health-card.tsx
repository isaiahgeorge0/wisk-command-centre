"use client";

import { AlertCircle, ArrowRight, BarChart2, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";

import type { WinstonEmailDraftSeed } from "@/components/leads/winston-email-draft-card";
import { Button } from "@/components/ui/button";
import { formatLeadValue, formatPipelineValueSplit } from "@/lib/leads/format";
import type { Lead, PipelineHealthResult } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

const URGENCY_STYLES = {
  high: {
    dot: "bg-[#e8001d]",
    text: "text-[#e8001d]",
    badge: "border-[#e8001d]/20 bg-[#e8001d]/10 text-[#e8001d]",
  },
  medium: {
    dot: "bg-[#ff5d00]",
    text: "text-[#ff5d00]",
    badge: "border-[#ff5d00]/20 bg-[#ff5d00]/10 text-[#ff5d00]",
  },
  low: {
    dot: "bg-[#aca0ff]",
    text: "text-[#aca0ff]",
    badge: "border-[#aca0ff]/20 bg-[#aca0ff]/10 text-[#aca0ff]",
  },
} as const;

type PipelineHealthCardProps = {
  open: boolean;
  leads: Lead[];
  onFocusLead: (leadId: string) => void;
  onDraftFollowUp: (seed: WinstonEmailDraftSeed) => void;
};

export function PipelineHealthCard({
  open,
  leads,
  onFocusLead,
  onDraftFollowUp,
}: PipelineHealthCardProps) {
  const [result, setResult] = useState<PipelineHealthResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || result) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch("/api/winston/pipeline-health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(async (response) => {
        const data = (await response.json()) as
          | PipelineHealthResult
          | { error?: string };
        if (!response.ok) {
          throw new Error(
            data && "error" in data && data.error
              ? data.error
              : "Could not load pipeline health"
          );
        }
        if (!cancelled) {
          setResult(data as PipelineHealthResult);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Could not load pipeline health"
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      // Clear spinner if this effect is torn down mid-request
      // (Strict Mode remount or panel close).
      setLoading(false);
    };
  }, [open, result]);

  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-wisk-section-leads/10">
          <BarChart2 className="size-4 text-wisk-section-leads" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Pipeline health</h3>
            {loading ? (
              <span className="rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Analysing
              </span>
            ) : null}
          </div>

          {loading ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Winston is reviewing your pipeline…
            </div>
          ) : error ? (
            <div className="mt-2 flex items-start gap-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : result ? (
            <>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {result.summary}
              </p>
              {result.valueAtRisk.oneTime > 0 || result.valueAtRisk.monthly > 0 ? (
                <p className="mt-1.5 text-[11px] font-medium tabular-nums text-foreground/80">
                  Value at risk: {formatPipelineValueSplit(result.valueAtRisk)}
                </p>
              ) : null}

              {result.focuses.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {result.focuses.map((focus) => {
                    const styles = URGENCY_STYLES[focus.urgency];
                    const lead = leadsById.get(focus.leadId);
                    const canDraft = Boolean(lead?.email);
                    return (
                      <div
                        key={`${focus.leadId}-${focus.issue}`}
                        className="rounded-lg border border-border/50 bg-background/40"
                      >
                        <button
                          type="button"
                          onClick={() => onFocusLead(focus.leadId)}
                          className="flex w-full items-start gap-3 px-3 pt-3 pb-2 text-left transition-colors hover:bg-muted/30"
                        >
                          <span
                            className={cn(
                              "mt-1 h-5 w-[3px] shrink-0 rounded-full",
                              styles.dot
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {focus.leadName}
                              </p>
                              {focus.value != null ? (
                                <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
                                  {formatLeadValue(focus.value, focus.valueType)}
                                </span>
                              ) : null}
                              <span
                                className={cn(
                                  "rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                                  styles.badge
                                )}
                              >
                                {focus.urgency}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {focus.issue}
                            </p>
                            <p
                              className={cn(
                                "mt-1 text-[11px] font-medium",
                                styles.text
                              )}
                            >
                              {focus.suggestedAction}
                            </p>
                          </div>
                          <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        </button>
                        <div className="border-t border-border/40 px-3 py-2">
                          {canDraft ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 w-full gap-1.5 border-indigo-500/30 text-[11px] text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400"
                              onClick={() =>
                                onDraftFollowUp({
                                  leadId: focus.leadId,
                                  pipelineContext: {
                                    issue: focus.issue,
                                    suggestedAction: focus.suggestedAction,
                                  },
                                })
                              }
                            >
                              <Mail className="size-3" aria-hidden />
                              Draft follow-up
                            </Button>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              Add an email on this lead to draft a follow-up.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    No leads are stalled and nothing is overdue right now.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Open Winston to review which leads need attention and why.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
