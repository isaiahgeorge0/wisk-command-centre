"use client";

import { Sparkles } from "lucide-react";

import {
  leadAutoEnrichmentHasContent,
  type Lead,
  type LeadAutoEnrichment,
  type LeadResearchClaim,
} from "@/lib/leads/types";

type LeadAutoEnrichmentCardProps = {
  lead: Lead;
};

function CitedClaim({
  claim,
  citations,
}: {
  claim: LeadResearchClaim;
  citations: LeadAutoEnrichment["citations"];
}) {
  const citation = citations[claim.citationIndex];
  if (!citation) return null;

  return (
    <p className="text-xs leading-relaxed text-foreground">
      {claim.text}{" "}
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-wisk-section-leads underline-offset-2 hover:underline"
        title={citation.title}
        onClick={(e) => e.stopPropagation()}
      >
        [{claim.citationIndex + 1}]
      </a>
    </p>
  );
}

export function LeadAutoEnrichmentCard({ lead }: LeadAutoEnrichmentCardProps) {
  const enrichment = lead.auto_enrichment;
  if (!leadAutoEnrichmentHasContent(enrichment)) return null;

  return (
    <div className="space-y-2.5 rounded-lg border border-border/50 bg-muted/15 p-3">
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3 text-cyan-500/80" aria-hidden />
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Winston looked this up automatically
        </p>
      </div>

      {enrichment.companySize ? (
        <div className="space-y-0.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Company size
          </p>
          <CitedClaim
            claim={enrichment.companySize}
            citations={enrichment.citations}
          />
        </div>
      ) : null}

      {enrichment.likelyRole ? (
        <div className="space-y-0.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Likely role
          </p>
          <CitedClaim
            claim={enrichment.likelyRole}
            citations={enrichment.citations}
          />
        </div>
      ) : null}

      {enrichment.links.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Links
          </p>
          <ul className="space-y-1">
            {enrichment.links.map((link) => {
              const citation = enrichment.citations[link.citationIndex];
              if (!citation) return null;
              return (
                <li key={`${link.url}-${link.citationIndex}`}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-wisk-section-leads underline-offset-2 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {link.label}
                  </a>
                  <span className="text-[11px] text-muted-foreground">
                    {" "}
                    [{link.citationIndex + 1}]
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="border-t border-border/40 pt-2">
        <ol className="space-y-0.5 text-[10px] leading-relaxed text-muted-foreground">
          {enrichment.citations.map((citation, index) => (
            <li key={`${citation.url}-${index}`}>
              [{index + 1}]{" "}
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/80 underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {citation.title}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
