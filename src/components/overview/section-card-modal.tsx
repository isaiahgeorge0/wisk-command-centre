"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { SectionCardItem } from "@/components/overview/section-card";
import { hexToRgba } from "@/lib/color";
import { cn } from "@/lib/utils";

type SectionCardModalProps = {
  cardId: string;
  title: string;
  href: string;
  accent: string;
  icon: ReactNode;
  stat: { label: string; value: string | number };
  alert?: { label: string; count: number } | null;
  items: SectionCardItem[];
  expandedItems?: SectionCardItem[];
  emptyMessage: string;
  cta: string;
  onClose: () => void;
};

export function SectionCardModal({
  cardId,
  title,
  href,
  accent,
  icon,
  stat,
  alert,
  items,
  expandedItems,
  emptyMessage,
  cta,
  onClose,
}: SectionCardModalProps) {
  const reduced = useReducedMotion() ?? false;
  const allItems = expandedItems ?? items;

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
          className="pointer-events-auto relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-hidden rounded-2xl border bg-card p-6 shadow-2xl"
          style={{
            borderColor: hexToRgba(accent, 0.25),
            boxShadow: `0 0 60px -12px ${hexToRgba(accent, 0.19)}`,
          }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", damping: 30, stiffness: 300 }
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby={`section-modal-${cardId}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl"
            style={{ background: accent }}
          />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label={`Close ${title}`}
          >
            <X className="size-4" />
          </button>

          <div className="flex items-center gap-3 pr-10">
            <div
              className="flex size-10 items-center justify-center rounded-xl"
              style={{ background: hexToRgba(accent, 0.08) }}
            >
              {icon}
            </div>
            <div>
              <h2
                id={`section-modal-${cardId}`}
                className="text-lg font-bold text-foreground"
              >
                {title}
              </h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold tabular-nums text-foreground">
                  {stat.value}
                </span>{" "}
                {stat.label}
              </p>
            </div>
          </div>

          {alert && alert.count > 0 ? (
            <div className="mt-4 flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/[0.08] px-3 py-2">
              <span className="size-1.5 rounded-full bg-red-400" />
              <span className="text-xs font-medium text-red-400">
                {alert.count} {alert.label}
              </span>
            </div>
          ) : null}

          <div className="my-4 border-t border-border/40" />

          <div className="max-h-[40vh] space-y-1 overflow-y-auto scrollbar-hide">
            {allItems.length > 0 ? (
              allItems.slice(0, 10).map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="flex cursor-default items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/30"
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: accent }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">
                    {item.label}
                  </span>
                  {item.sub ? (
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        item.subColour
                          ? "font-medium"
                          : "text-muted-foreground"
                      )}
                      style={
                        item.subColour
                          ? { color: item.subColour }
                          : undefined
                      }
                    >
                      {item.sub}
                    </span>
                  ) : null}
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="shrink-0 text-xs font-medium transition-colors hover:opacity-80"
                      style={{ color: accent }}
                    >
                      View →
                    </Link>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            )}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Link
              href={href}
              onClick={onClose}
              aria-label={cta}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: accent }}
            >
              <ExternalLink className="size-4" />
              Open {title}
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
