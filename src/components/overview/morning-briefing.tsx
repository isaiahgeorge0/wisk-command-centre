"use client";

import { motion } from "framer-motion";

import type { MorningBriefingContent } from "@/lib/morning/briefing-generator";

type MorningBriefingProps = {
  briefing: MorningBriefingContent;
  canAccess: boolean;
  cardId: string;
  onExpand: () => void;
  isExpanded?: boolean;
};

export function MorningBriefing({
  briefing,
  canAccess,
  cardId,
  onExpand,
  isExpanded = false,
}: MorningBriefingProps) {
  if (!canAccess) return null;

  const teaser =
    briefing.teaser?.trim() || briefing.headline?.trim() || briefing.greeting;

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
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/8 bg-card/60 p-4 transition-all hover:border-[#c3ff32]/20 hover:shadow-[0_0_24px_-4px_rgba(195,255,50,0.1)]"
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

      <p className="mb-3 line-clamp-4 text-sm leading-relaxed text-foreground/75">
        {teaser}
      </p>

      <p className="text-[10px] text-muted-foreground transition-colors group-hover:text-[#c3ff32]/70">
        Click to expand →
      </p>
    </motion.div>
  );
}
