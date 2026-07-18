"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import Link from "next/link";

import type { MorningBriefingContent } from "@/lib/morning/briefing-generator";

type MorningBriefingModalProps = {
  cardId: string;
  briefing: MorningBriefingContent;
  onClose: () => void;
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

export function MorningBriefingModal({
  cardId,
  briefing,
  onClose,
}: MorningBriefingModalProps) {
  const reduced = useReducedMotion() ?? false;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        onClick={onClose}
      />

      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
        <motion.div
          layoutId={reduced ? undefined : `card-${cardId}`}
          className="pointer-events-auto relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-card p-6 shadow-2xl"
          style={{
            boxShadow: "0 0 60px -12px rgba(195,255,50,0.18)",
          }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", damping: 30, stiffness: 300 }
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby={`morning-modal-${cardId}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-[#c3ff32] to-[#016c81]" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="Close morning briefing"
          >
            <X className="size-4" />
          </button>

          <div className="pr-10">
            <p
              id={`morning-modal-${cardId}`}
              className="text-xs font-semibold uppercase tracking-wider text-[#c3ff32]"
            >
              Morning briefing
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {briefing.date}
            </p>
            <h2 className="mt-3 text-lg font-bold text-foreground">
              {briefing.greeting}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {briefing.headline}
            </p>
          </div>

          <div className="my-4 border-t border-border/40" />

          <div className="max-h-[40vh] space-y-1 overflow-y-auto scrollbar-hide">
            {briefing.focuses.map((focus, index) => {
              const colour =
                URGENCY_COLOURS[focus.urgency] ?? URGENCY_COLOURS.low;
              return (
                <Link
                  key={`${focus.category}-${focus.item}-${index}`}
                  href={focus.href}
                  onClick={onClose}
                  className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/30"
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
                    <p className="text-sm text-foreground/90">{focus.item}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <p className="mt-5 text-center text-xs italic text-muted-foreground/60">
            &ldquo;{briefing.encouragement}&rdquo; — Winston
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Link
              href="/"
              onClick={onClose}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#c3ff32] py-2.5 text-sm font-semibold text-[#141b27] transition-opacity hover:opacity-90"
            >
              <ExternalLink className="size-4" />
              Open WISK
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border/60 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
