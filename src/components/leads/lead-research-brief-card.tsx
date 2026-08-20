"use client";

import { Building2, Loader2, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { generateLeadResearchBrief } from "@/app/(dashboard)/leads/actions";
import { LeadSelector } from "@/components/leads/lead-selector";
import { Button } from "@/components/ui/button";
import type { Lead, LeadResearchBrief } from "@/lib/leads/types";

type LeadResearchBriefCardProps = {
  leads: Lead[];
  canAccessResearch: boolean;
};

function ClaimList({
  title,
  claims,
  citations,
}: {
  title: string;
  claims: LeadResearchBrief["companyBackground"];
  citations: LeadResearchBrief["citations"];
}) {
  if (claims.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-1.5">
        {claims.map((claim, index) => {
          const citation = citations[claim.citationIndex];
          if (!citation) return null;
          return (
            <li key={`${title}-${index}`} className="text-xs leading-relaxed text-foreground">
              {claim.text}{" "}
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-wisk-section-leads underline-offset-2 hover:underline"
                title={citation.title}
              >
                [{claim.citationIndex + 1}]
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function LeadResearchBriefCard({
  leads,
  canAccessResearch,
}: LeadResearchBriefCardProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [brief, setBrief] = useState<LeadResearchBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  const handleGenerate = () => {
    if (!selectedLead) return;
    setError(null);
    startTransition(async () => {
      const result = await generateLeadResearchBrief({ leadId: selectedLead.id });
      if (!result.success) {
        setBrief(null);
        setError(result.error);
        return;
      }
      if (!result.data) {
        setBrief(null);
        setError("No brief was generated.");
        return;
      }
      setBrief(result.data);
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
          <Building2 className="size-4 text-cyan-500" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Lead intelligence brief</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Winston researches company background, budget signals, and likely pain
            points with cited sources from Tavily and Exa.
          </p>
        </div>
      </div>

      <LeadSelector
        leads={leads}
        value={selectedLeadId}
        onChange={(id) => {
          setSelectedLeadId(id);
          setBrief(null);
          setError(null);
        }}
        placeholder="Select a lead..."
      />

      {!canAccessResearch ? (
        <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            WISK Research unlocks cited lead intelligence briefs, company
            background, budget signals, and pain points before every call.
          </p>
          <Link
            href="/upgrade/research"
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            <Lock className="size-3" aria-hidden />
            Upgrade to Research, £19/mo
          </Link>
        </div>
      ) : !selectedLead ? (
        <p className="text-xs text-muted-foreground">Select a lead to get started</p>
      ) : (
        <Button
          type="button"
          size="sm"
          onClick={handleGenerate}
          disabled={isPending}
          className="w-full gap-1.5 bg-wisk-section-leads text-wisk-section-leads-fg hover:opacity-90"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-3.5" aria-hidden />
          )}
          {isPending ? "Researching…" : "Generate lead brief"}
        </Button>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {brief ? (
        <div className="space-y-3 rounded-lg border border-border/50 bg-background/50 p-3">
          <p className="text-sm leading-relaxed text-foreground">{brief.summary}</p>
          <ClaimList
            title="Company background"
            claims={brief.companyBackground}
            citations={brief.citations}
          />
          <ClaimList
            title="Budget signals"
            claims={brief.budgetSignals}
            citations={brief.citations}
          />
          <ClaimList
            title="Pain points"
            claims={brief.painPoints}
            citations={brief.citations}
          />
          <div className="border-t border-border/60 pt-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Sources
            </p>
            <ol className="mt-1 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
              {brief.citations.map((citation, index) => (
                <li key={`${citation.url}-${index}`}>
                  [{index + 1}]{" "}
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/90 underline-offset-2 hover:underline"
                  >
                    {citation.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  );
}
