"use client";

import { motion } from "framer-motion";
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

import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import { cn } from "@/lib/utils";

// ─── Fake digest data (realistic-looking preview) ─────────────────────────────

const FAKE_DIGEST = {
  weekSummary:
    "You made solid progress across three active projects this week and closed two new leads. Task completion is up compared to last week, and your content streak is holding strong at 12 days running.",
  wins: [
    "Completed 8 tasks — highest week in the last month",
    "Branding Refresh project moved to 70% complete",
    "Two leads moved to proposal stage",
    "Published 3 pieces of content across platforms",
    "Goal 'Hit 10k followers' reached 94%",
  ],
  needsAttention: [
    "Website Redesign has had no update in 9 days",
    "4 overdue tasks — oldest is 5 days past due",
    "Lead 'Oakwood Studio' stalled for 16 days",
  ],
  weekAhead: [
    "Project deadline: Social Media Strategy due Friday",
    "3 tasks due this week across two projects",
    "2 content posts scheduled for Tuesday and Thursday",
    "Goal deadline: Monthly Revenue goal closes Sunday",
  ],
  insight:
    "Your best task-completion weeks happen when you have a content post due — the external deadline seems to create a broader momentum. This week follows that pattern.",
  recommendation:
    "Reach out to Oakwood Studio today with a brief check-in. Leads left untouched for 14+ days have a significantly lower conversion rate — one message this week could recover the opportunity.",
};

// ─── Shared card component (mirrors real digest layout) ──────────────────────

function PreviewCard({
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

function PreviewWinList({ items }: { items: string[] }) {
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

function PreviewBulletList({
  items,
  dotClass,
}: {
  items: string[];
  dotClass: string;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span
            className={cn("mt-1.5 size-2 shrink-0 rounded-full", dotClass)}
            aria-hidden
          />
          <span className="text-sm text-foreground">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Blurred preview (full real-structure layout) ─────────────────────────────

function DigestPreview() {
  return (
    <div className="pointer-events-none select-none">
      {/* Fake header */}
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
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-foreground">
            Week of 2–8 June 2026
          </span>
          <span className="text-xs text-muted-foreground">
            · Generated every Sunday
          </span>
        </div>
      </div>

      {/* Fake digest grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PreviewCard
          icon={<BarChart2 className="size-4" />}
          iconClass="text-muted-foreground"
          title="Week in Review"
          className="sm:col-span-2 xl:col-span-2"
        >
          <p className="text-sm leading-relaxed text-foreground">
            {FAKE_DIGEST.weekSummary}
          </p>
        </PreviewCard>

        <PreviewCard
          icon={<Trophy className="size-4" />}
          iconClass="text-amber-400"
          title="Wins this week"
        >
          <PreviewWinList items={FAKE_DIGEST.wins} />
        </PreviewCard>

        <PreviewCard
          icon={<AlertCircle className="size-4" />}
          iconClass="text-red-400"
          title="Needs attention"
        >
          <PreviewBulletList
            items={FAKE_DIGEST.needsAttention}
            dotClass="bg-red-400"
          />
        </PreviewCard>

        <PreviewCard
          icon={<Calendar className="size-4" />}
          iconClass="text-wisk-purple"
          title="This week ahead"
        >
          <PreviewBulletList
            items={FAKE_DIGEST.weekAhead}
            dotClass="bg-wisk-purple/70"
          />
        </PreviewCard>

        <PreviewCard
          icon={<Lightbulb className="size-4" />}
          iconClass="text-wisk-teal"
          title="Winston's insight"
          className="sm:col-span-2 xl:col-span-1"
        >
          <div className="border-l-2 border-wisk-teal/60 pl-4">
            <p className="text-sm leading-relaxed text-foreground">
              {FAKE_DIGEST.insight}
            </p>
          </div>
        </PreviewCard>

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
            {FAKE_DIGEST.recommendation}
          </p>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Generated by Winston · Sunday, 8 June 2026 at 07:02
      </p>
    </div>
  );
}

// ─── Main teaser page ─────────────────────────────────────────────────────────

export function WinstonTeaserPage() {
  const { getPageInitial, getPageAnimate, pageTransition } = useMotionSafe();

  return (
    <motion.div
      initial={getPageInitial()}
      animate={getPageAnimate()}
      transition={pageTransition}
    >
      <div className="relative min-h-[70vh]">
        {/* Layer 1 — blurred digest preview */}
        <div
          className="w-full"
          style={{ filter: "blur(8px)" }}
          aria-hidden="true"
        >
          <DigestPreview />
        </div>

        {/* Gradient overlay */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/20 to-background/80"
          aria-hidden="true"
        />

        {/* Layer 2 — foreground content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center px-6 py-10 text-center"
          >
            {/* Monogram */}
            <div className="mb-5 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-wisk-purple/20 to-wisk-teal/20 shadow-lg ring-1 ring-wisk-purple/20">
              <span className="bg-gradient-to-br from-wisk-purple to-wisk-teal bg-clip-text text-6xl font-bold text-transparent leading-none">
                W
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Winston
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Your AI business assistant
            </p>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-foreground/80">
              Winston reads your projects, tasks, goals, leads, and content —
              then delivers a weekly digest every Sunday that feels like a
              trusted advisor. Wins, risks, insights, and one clear
              recommendation to start your week.
            </p>

            {/* Coming soon badge */}
            <div className="mt-6 inline-flex items-center rounded-full border border-wisk-purple/30 bg-gradient-to-r from-wisk-purple/10 to-wisk-teal/10 px-4 py-1.5">
              <span className="bg-gradient-to-r from-wisk-purple to-wisk-teal bg-clip-text text-sm font-bold tracking-widest text-transparent uppercase">
                Coming Soon
              </span>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              From £9/mo · 14-day free trial at launch
            </p>

            <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Early access is invite-only. More spots opening soon.
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
