"use client";

import { Loader2, Mail, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { addLeadActivity } from "@/app/(dashboard)/leads/actions";
import { LeadSelector } from "@/components/leads/lead-selector";
import { Button } from "@/components/ui/button";
import {
  buildLeadEmailUrl,
  wrapWinstonEmailBody,
} from "@/lib/leads/email";
import type { Lead } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

export type PipelineDraftContext = {
  issue: string;
  suggestedAction: string;
};

export type WinstonEmailDraftSeed = {
  leadId: string;
  pipelineContext: PipelineDraftContext;
};

type WinstonEmailDraftCardProps = {
  leads: Lead[];
  /** When set, select the lead and auto-draft with pipeline health context. */
  seed?: WinstonEmailDraftSeed | null;
  onSeedConsumed?: () => void;
};

export function WinstonEmailDraftCard({
  leads,
  seed = null,
  onSeedConsumed,
}: WinstonEmailDraftCardProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [pipelineContext, setPipelineContext] =
    useState<PipelineDraftContext | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [logActivity, setLogActivity] = useState(true);
  const [isLogging, startLogTransition] = useTransition();
  const cardRef = useRef<HTMLDivElement>(null);
  const autoDraftKeyRef = useRef<string | null>(null);

  const selectedLead =
    leads.find((lead) => lead.id === selectedLeadId) ?? null;
  const leadsWithEmail = leads.filter((lead) => lead.email);

  const onSeedConsumedRef = useRef(onSeedConsumed);
  onSeedConsumedRef.current = onSeedConsumed;

  useEffect(() => {
    if (!seed) return;

    setSelectedLeadId(seed.leadId);
    setPipelineContext(seed.pipelineContext);
    setSubject("");
    setBody("");
    setError(null);
    autoDraftKeyRef.current = null;
    onSeedConsumedRef.current?.();

    requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [seed]);

  useEffect(() => {
    setSubject("");
    setBody("");
    setError(null);
  }, [selectedLeadId]);

  const handleDraft = async (
    contextOverride?: PipelineDraftContext | null
  ) => {
    if (!selectedLead) return;

    const context = contextOverride ?? pipelineContext;
    setDrafting(true);
    setError(null);

    try {
      const response = await fetch("/api/winston/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLead.id,
          ...(context
            ? {
                pipelineContext: {
                  issue: context.issue,
                  suggestedAction: context.suggestedAction,
                },
              }
            : {}),
        }),
      });

      const data = (await response.json()) as {
        subject?: string;
        body?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not draft email");
      }

      if (!data.subject || !data.body) {
        throw new Error("No draft returned from Winston");
      }

      setSubject(data.subject);
      setBody(wrapWinstonEmailBody(selectedLead, data.body));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDrafting(false);
    }
  };

  useEffect(() => {
    if (!selectedLead?.email || !pipelineContext) return;
    if (subject || body || drafting) return;

    const key = `${selectedLead.id}:${pipelineContext.issue}:${pipelineContext.suggestedAction}`;
    if (autoDraftKeyRef.current === key) return;
    autoDraftKeyRef.current = key;
    void handleDraft(pipelineContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot auto-draft when seeded
  }, [selectedLead, pipelineContext, subject, body, drafting]);

  const handleOpenMailto = () => {
    if (!selectedLead?.email || !subject.trim() || !body.trim()) return;
    window.location.href = buildLeadEmailUrl(
      selectedLead,
      subject.trim(),
      body.trim()
    );
  };

  const handleLogEmail = () => {
    if (!selectedLead || !logActivity) return;

    startLogTransition(async () => {
      const result = await addLeadActivity(selectedLead.id, {
        activity_type: "email",
        title: `Email sent to ${selectedLead.name}`,
        content: subject.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error);
      }
    });
  };

  return (
    <div
      ref={cardRef}
      className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
          <Mail className="size-4 text-indigo-500" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Email drafting</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Select a lead and Winston writes a personalised follow-up email
            based on their stage, history, and your previous interactions.
          </p>
          {pipelineContext ? (
            <p className="mt-1.5 text-[11px] leading-relaxed text-wisk-section-leads">
              Using Pipeline Health context for this draft.
            </p>
          ) : null}
        </div>
      </div>

      <LeadSelector
        leads={leadsWithEmail}
        value={selectedLeadId}
        onChange={(id) => {
          setPipelineContext(null);
          setSelectedLeadId(id);
        }}
        placeholder="Select a lead..."
      />

      {!selectedLead ? (
        <p className="text-xs text-muted-foreground">Select a lead to get started</p>
      ) : !selectedLead.email ? (
        <p className="text-xs text-muted-foreground">
          This lead has no email address on file.
        </p>
      ) : (
        <div className="space-y-3">
          {!subject && !body ? (
            <Button
              type="button"
              size="sm"
              onClick={() => void handleDraft()}
              disabled={drafting}
              className="w-full gap-1.5 bg-wisk-section-leads text-wisk-section-leads-fg hover:opacity-90"
            >
              {drafting ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-3.5" aria-hidden />
              )}
              {drafting ? "Drafting…" : "Draft with Winston"}
            </Button>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-wisk-section-leads/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  className="w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-xs leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-wisk-section-leads/40"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleOpenMailto}
                disabled={!subject.trim() || !body.trim()}
                className={cn(
                  "w-full gap-1.5 border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400"
                )}
              >
                <Mail className="size-3.5" aria-hidden />
                Open in email client
              </Button>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={logActivity}
                  onChange={(e) => setLogActivity(e.target.checked)}
                  className="rounded border-border"
                />
                Log as activity
              </label>
              <Button
                type="button"
                size="sm"
                onClick={handleLogEmail}
                disabled={!logActivity || isLogging}
                className="w-full"
              >
                {isLogging ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : null}
                Log email sent
              </Button>
              <button
                type="button"
                onClick={() => void handleDraft()}
                disabled={drafting}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Regenerate draft
              </button>
            </>
          )}
        </div>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
