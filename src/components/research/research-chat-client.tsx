"use client";

import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import {
  SectionIconChip,
  SectionSurface,
} from "@/components/overview/section-card";
import { useResearchAccent } from "@/components/research/use-research-accent";
import { WinstonSectionEntry } from "@/components/winston/winston-entry-button";
import { hexToRgba } from "@/lib/color";

type ResearchChatClientProps = {
  canAccessResearchPro: boolean;
};

export function ResearchChatClient({
  canAccessResearchPro,
}: ResearchChatClientProps) {
  const accent = useResearchAccent();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ask Winston"
        subtitle="Open-ended market and competitor research with cited sources."
        accent="research"
        icon={
          <Sparkles className="size-5 text-wisk-section-research" aria-hidden />
        }
      />

      <SectionSurface accent={accent} cardId="research-chat">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <SectionIconChip accent={accent}>
              <Sparkles size={16} style={{ color: accent }} aria-hidden />
            </SectionIconChip>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Research chat
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask any market or competitor question. Answers pull from live
                search and only keep claims with valid citations.
              </p>
            </div>
          </div>
          {canAccessResearchPro ? (
            <WinstonSectionEntry section="research" label="Ask Winston" />
          ) : null}
        </div>

        <div className="mt-4">
          {canAccessResearchPro ? (
            <p className="text-sm text-muted-foreground">
              Open the Winston panel to start a research-scoped thread. When a
              finding is actionable, use Create this to review a proposal before
              anything is saved.
            </p>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-border/50 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: hexToRgba(accent, 0.12) }}
                >
                  <Lock
                    className="size-4"
                    style={{ color: accent }}
                    aria-hidden
                  />
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
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-wisk-section-research px-3 text-sm font-medium text-wisk-section-research-fg transition-opacity hover:opacity-90"
              >
                Upgrade to Research Pro
              </Link>
            </div>
          )}
        </div>
      </SectionSurface>
    </div>
  );
}
