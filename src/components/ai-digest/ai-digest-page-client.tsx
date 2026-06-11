"use client";

import {
  AlertCircle,
  ArrowRight,
  BarChart2,
  Calendar,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Trophy,
} from "lucide-react";

import { PageTransition } from "@/components/layout/page-transition";
import type { DigestContent } from "@/lib/ai/digest-generator";
import { cn } from "@/lib/utils";

type WinstonDigestPageClientProps = {
  digest: DigestContent | null;
};

function formatWeekRange(generatedAt: string): string {
  const date = new Date(generatedAt);
  const weekEnd = new Date(date);
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - 6);

  const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const startDay = weekStart.getDate();
  const endFormatted = fmt.format(weekEnd);
  // "Week of 9–15 June 2026"
  return `Week of ${startDay}–${endFormatted}`;
}

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ─── Section card ─────────────────────────────────────────────────────────────

function DigestCard({
  icon,
  iconClass,
  title,
  children,
  className,
}: {
  icon: React.ReactNode;
  iconClass?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/80 p-5 shadow-sm",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className={cn("shrink-0", iconClass)}>{icon}</span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Bullet list helpers ──────────────────────────────────────────────────────

function WinList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-wisk-teal" aria-hidden />
          <span className="text-sm text-foreground">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function AttentionList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span
            className="mt-1.5 size-2 shrink-0 rounded-full bg-red-400"
            aria-hidden
          />
          <span className="text-sm text-foreground">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function WeekAheadList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span
            className="mt-1.5 size-2 shrink-0 rounded-full bg-wisk-purple/70"
            aria-hidden
          />
          <span className="text-sm text-foreground">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-wisk-purple/20 to-wisk-teal/20">
        <Sparkles className="size-7 text-wisk-teal" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        Your first digest is on its way.
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Winston generates your weekly business summary every Sunday morning.
        Check back then — or ask your admin to trigger one manually.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WinstonDigestPageClient({
  digest,
}: WinstonDigestPageClientProps) {
  return (
    <PageTransition>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-wisk-purple/30 to-wisk-teal/30 shadow-sm">
            <Sparkles className="size-5 text-wisk-teal" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Winston
            </h1>
            <p className="text-sm text-muted-foreground">
              Your weekly business digest
            </p>
          </div>
        </div>
        {digest ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              {formatWeekRange(digest.generatedAt)}
            </span>
            <span className="text-xs text-muted-foreground">
              · Generated every Sunday
            </span>
          </div>
        ) : null}
      </div>

      {!digest ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">

          {/* 1 — Week in Review */}
          <DigestCard
            icon={<BarChart2 className="size-4" />}
            iconClass="text-muted-foreground"
            title="Week in Review"
            className="sm:col-span-2 xl:col-span-2"
          >
            <p className="text-sm leading-relaxed text-foreground">
              {digest.weekSummary}
            </p>
          </DigestCard>

          {/* 2 — Wins */}
          <DigestCard
            icon={<Trophy className="size-4" />}
            iconClass="text-amber-400"
            title="Wins this week"
          >
            <WinList items={digest.wins} />
          </DigestCard>

          {/* 3 — Needs attention */}
          <DigestCard
            icon={<AlertCircle className="size-4" />}
            iconClass="text-red-400"
            title="Needs attention"
          >
            <AttentionList items={digest.needsAttention} />
          </DigestCard>

          {/* 4 — Week ahead */}
          <DigestCard
            icon={<Calendar className="size-4" />}
            iconClass="text-wisk-purple"
            title="This week ahead"
          >
            <WeekAheadList items={digest.weekAhead} />
          </DigestCard>

          {/* 5 — Insight */}
          <DigestCard
            icon={<Lightbulb className="size-4" />}
            iconClass="text-wisk-teal"
            title="Winston's insight"
            className="sm:col-span-2 xl:col-span-1"
          >
            <div className="border-l-2 border-wisk-teal/60 pl-4">
              <p className="text-sm leading-relaxed text-foreground">
                {digest.insight}
              </p>
            </div>
          </DigestCard>

          {/* 6 — Recommendation (most prominent) */}
          <div className="sm:col-span-2 xl:col-span-3 rounded-xl border border-wisk-purple/30 bg-gradient-to-br from-wisk-purple/[0.06] to-wisk-teal/[0.06] p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-wisk-purple to-wisk-teal">
                <ArrowRight className="size-4 text-white" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                Winston&apos;s recommendation
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {digest.recommendation}
            </p>
          </div>

        </div>
      )}

      {/* Footer */}
      {digest ? (
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Generated by Winston · {formatTimestamp(digest.generatedAt)}
        </p>
      ) : null}
    </PageTransition>
  );
}
