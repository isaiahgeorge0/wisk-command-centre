"use client";

import { Lock, Search } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import {
  SectionIconChip,
  SectionSurface,
} from "@/components/overview/section-card";
import { useResearchAccent } from "@/components/research/use-research-accent";

export function ResearchLockedClient() {
  const accent = useResearchAccent();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 md:p-8">
      <PageHeader
        title="Research"
        subtitle="Win-rate analytics, competitor watchlist, and research chat"
        accent="research"
        icon={
          <Search className="size-5 text-wisk-section-research" aria-hidden />
        }
      />

      <SectionSurface accent={accent} cardId="research-locked">
        <div className="flex items-start gap-3">
          <SectionIconChip accent={accent}>
            <Lock size={16} style={{ color: accent }} aria-hidden />
          </SectionIconChip>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Unlock WISK Research
            </h2>
            <p className="mt-1 text-sm font-medium text-foreground">
              Lead briefs, competitor watchlist, and win-rate analytics
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              £19/month. Research Pro (£39) adds open cited chat and findings →
              Winston proposals.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/upgrade/research"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-wisk-section-research px-3 text-sm font-medium text-wisk-section-research-fg transition-opacity hover:opacity-90"
          >
            Upgrade to Research
          </Link>
          <Link
            href="/upgrade/research-pro"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border/60 bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
          >
            See Research Pro
          </Link>
        </div>
      </SectionSurface>
    </div>
  );
}
