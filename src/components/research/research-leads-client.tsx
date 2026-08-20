"use client";

import { ArrowUpRight, UserSearch } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { StaggerItem } from "@/components/motion/stagger-item";
import { StaggerList } from "@/components/motion/stagger-list";
import {
  SectionIconChip,
  SectionSurface,
} from "@/components/overview/section-card";
import { useResearchAccent } from "@/components/research/use-research-accent";
import { useStaggerOnce } from "@/lib/motion/use-stagger-once";
import type { ResearchLeadIntelligenceData } from "@/lib/research/types";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type ResearchLeadsClientProps = {
  data: ResearchLeadIntelligenceData;
};

export function ResearchLeadsClient({ data }: ResearchLeadsClientProps) {
  const accent = useResearchAccent();
  const stagger = useStaggerOnce();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Intelligence"
        subtitle="Briefs generated from Leads. Open a lead to regenerate or dig deeper."
        accent="research"
        icon={
          <UserSearch
            className="size-5 text-wisk-section-research"
            aria-hidden
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <SectionSurface accent={accent} cardId="research-leads-stat-month">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Briefs this month
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground md:text-3xl">
            {data.briefsThisMonth}
          </p>
        </SectionSurface>
        <SectionSurface accent={accent} cardId="research-leads-stat-total">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Leads with a brief
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground md:text-3xl">
            {data.briefsTotal}
          </p>
        </SectionSurface>
      </div>

      <SectionSurface accent={accent} cardId="research-leads-index">
        <div className="flex items-start gap-3">
          <SectionIconChip accent={accent}>
            <UserSearch size={16} style={{ color: accent }} aria-hidden />
          </SectionIconChip>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Recent briefs
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Generation stays in Leads. This index surfaces what you have
              already run.
            </p>
          </div>
        </div>

        <div className="mt-4">
          {data.briefs.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-background/40 p-4">
              <p className="text-sm text-foreground">
                No lead briefs yet.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Open Leads, pick a lead in the Winston panel, and generate a
                cited intelligence brief there.
              </p>
              <Link
                href="/leads"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-wisk-section-research hover:underline"
              >
                Go to Leads
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          ) : (
            <StaggerList
              stagger={stagger}
              className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/50"
            >
              {data.briefs.map((brief) => (
                <StaggerItem key={brief.id} stagger={stagger} as="div">
                  <Link
                    href="/leads"
                    className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-card/80"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {brief.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {brief.serviceInterest || brief.status} ·{" "}
                        {formatDate(brief.generatedAt)}
                      </p>
                      {brief.summary ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground/80">
                          {brief.summary}
                        </p>
                      ) : null}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-wisk-section-research">
                      Open in Leads
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </span>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerList>
          )}

          {data.leadsWithoutBrief > 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-wisk-section-research/30 bg-wisk-section-research/5 px-4 py-3">
              <p className="text-sm text-foreground">
                {data.leadsWithoutBrief} lead
                {data.leadsWithoutBrief === 1 ? "" : "s"} still need a brief
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generate from the Lead intelligence card in the Leads Winston
                panel. No second generator here.
              </p>
              <Link
                href="/leads"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-wisk-section-research hover:underline"
              >
                Open Leads
                <ArrowUpRight className="size-3" aria-hidden />
              </Link>
            </div>
          ) : null}
        </div>
      </SectionSurface>
    </div>
  );
}
