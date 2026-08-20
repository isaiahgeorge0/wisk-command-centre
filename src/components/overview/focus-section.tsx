"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  FolderOpen,
  Search,
  Target,
  UserCheck,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { StaggerItem } from "@/components/motion/stagger-item";
import { StaggerList } from "@/components/motion/stagger-list";
import { OverviewInlineEmpty } from "@/components/overview/overview-inline-empty";
import { useStaggerOnce } from "@/lib/motion/use-stagger-once";
import type {
  FocusSignal,
  FocusSignalCategory,
  FocusSourceFigure,
} from "@/lib/overview/focus-signals";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<FocusSignalCategory, ReactNode> = {
  tasks: <CheckCircle className="size-3.5" />,
  projects: <FolderOpen className="size-3.5" />,
  goals: <Target className="size-3.5" />,
  leads: <UserCheck className="size-3.5" />,
  properties: <Building2 className="size-3.5" />,
  digest: <Zap className="size-3.5" />,
  research: <Search className="size-3.5" />,
};

const CATEGORY_LABEL: Record<FocusSignalCategory, string> = {
  tasks: "Tasks",
  projects: "Projects",
  goals: "Goals",
  leads: "Leads",
  properties: "Properties",
  digest: "Digest",
  research: "Research",
};

const URGENCY_BORDER: Record<string, string> = {
  high: "border-l-red-400/80",
  medium: "border-l-yellow-400/60",
  low: "border-l-border",
};

type FocusSectionProps = {
  signals: FocusSignal[];
  canAccessSynthesis: boolean;
  synthesis:
    | {
        summary: string;
        sourceFigures: FocusSourceFigure[];
      }
    | null;
};

function SourceFiguresLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-medium tabular-nums text-foreground/80">
      {children}
    </p>
  );
}

function formatSourceFigures(figures: FocusSourceFigure[]): string {
  return figures.map((figure) => `${figure.label}: ${figure.value}`).join(" · ");
}

export function FocusSection({
  signals,
  canAccessSynthesis,
  synthesis,
}: FocusSectionProps) {
  const stagger = useStaggerOnce();

  if (signals.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="mb-4 text-base font-semibold text-foreground">Focus</h2>
        <OverviewInlineEmpty icon={CheckCircle}>
          Nothing needs your attention right now.
        </OverviewInlineEmpty>
      </section>
    );
  }

  const highCount = signals.filter((s) => s.urgency === "high").length;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-base font-semibold text-foreground">Focus</h2>
        {highCount > 0 ? (
          <span className="flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/[0.08] px-2 py-0.5 text-[10px] font-medium text-red-400">
            <AlertTriangle className="size-2.5" />
            {highCount} urgent
          </span>
        ) : null}
      </div>

      {canAccessSynthesis && synthesis ? (
        <div className="mb-4 rounded-xl border border-border/60 bg-card/60 p-4">
          {synthesis.sourceFigures.length > 0 ? (
            <SourceFiguresLine>
              {formatSourceFigures(synthesis.sourceFigures)}
            </SourceFiguresLine>
          ) : null}
          <p className="text-sm leading-6 text-foreground/90">{synthesis.summary}</p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
        <StaggerList stagger={stagger} className="divide-y divide-border/40">
          {signals.slice(0, 12).map((signal) => (
            <StaggerItem key={signal.id} stagger={stagger} as="div">
              <Link
                href={signal.href}
                className={cn(
                  "flex items-start gap-3 border-l-2 px-4 py-3 transition-colors hover:bg-card/80",
                  URGENCY_BORDER[signal.urgency] ?? URGENCY_BORDER.low
                )}
              >
                <span className="mt-0.5 shrink-0 text-muted-foreground">
                  {CATEGORY_ICON[signal.category]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {signal.label}
                    </span>
                  </div>
                  {signal.detail ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {signal.detail}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/60">
                  {CATEGORY_LABEL[signal.category]}
                </span>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}
