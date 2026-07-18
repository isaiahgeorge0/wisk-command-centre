"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";

import type { MorningBriefingContent } from "@/lib/morning/briefing-generator";

type MorningBriefingProps = {
  briefing: MorningBriefingContent | null;
  canAccess: boolean;
  cardId: string;
  onExpand: () => void;
  isExpanded?: boolean;
};

const URGENCY_COLOURS = {
  high: "#e8001d",
  medium: "#ff5d00",
  low: "#aca0ff",
} as const;

const CATEGORY_ICONS: Record<string, string> = {
  Tasks: "✓",
  Leads: "◎",
  Goals: "◈",
  Content: "◻",
  Properties: "⌂",
};

export function MorningBriefing({
  briefing,
  canAccess,
  cardId,
  onExpand,
  isExpanded = false,
}: MorningBriefingProps) {
  if (!canAccess) return null;

  if (!briefing) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-wisk-section-winston/20 bg-card/60 p-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#8b00ff]/10">
          <Clock className="size-4 text-[#8b00ff]" />
        </div>
        <p className="text-sm text-muted-foreground">
          Your morning briefing will arrive at 7:30am.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      layoutId={`card-${cardId}`}
      onClick={onExpand}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onExpand();
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      className="relative cursor-pointer overflow-hidden rounded-2xl border border-white/8 bg-card/60 p-4 transition-all hover:border-[#c3ff32]/20 hover:shadow-[0_0_24px_-4px_rgba(195,255,50,0.1)]"
    >
      <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-[#c3ff32] to-[#016c81]" />

      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#c3ff32]">
          Morning briefing
        </span>
        <span className="text-right text-[10px] text-muted-foreground">
          {briefing.date}
        </span>
      </div>

      <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {briefing.headline}
      </p>

      {briefing.focuses.slice(0, 3).map((focus, index) => {
        const colour =
          URGENCY_COLOURS[focus.urgency] ?? URGENCY_COLOURS.low;
        return (
          <div
            key={`${focus.category}-${focus.item}-${index}`}
            className="flex items-start gap-3 border-b border-border/30 py-1.5 last:border-0"
          >
            <div
              className="mt-0.5 h-5 w-[3px] shrink-0 rounded-full"
              style={{ background: colour }}
            />
            <div className="min-w-0 flex-1">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: colour }}
              >
                {CATEGORY_ICONS[focus.category] ?? "·"} {focus.category}
              </span>
              <p className="truncate text-sm text-foreground/80">
                {focus.item}
              </p>
            </div>
          </div>
        );
      })}

      <p className="mt-3 text-[10px] text-muted-foreground">Click to expand</p>
    </motion.div>
  );
}
