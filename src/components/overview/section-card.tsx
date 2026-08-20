"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { hexToRgba } from "@/lib/color";
import { cn } from "@/lib/utils";

export type SectionCardItem = {
  label: string;
  sub?: string;
  subColour?: string;
  href?: string;
};

type SectionCardProps = {
  title: string;
  href: string;
  accent: string;
  icon: ReactNode;
  stat: { label: string; value: string | number };
  alert?: { label: string; count: number } | null;
  items: SectionCardItem[];
  emptyMessage: string;
  cta: string;
  cardId: string;
  expandedItems?: SectionCardItem[];
  onExpand: () => void;
  isExpanded?: boolean;
};

/** Accent colour CSS vars used by SectionCard depth treatment. */
export function sectionAccentStyle(accent: string): CSSProperties {
  return {
    "--section-accent-border": hexToRgba(accent, 0.3),
    "--section-accent-shadow": hexToRgba(accent, 0.15),
  } as CSSProperties;
}

/** Coloured icon chip matching Overview SectionCard. */
export function SectionIconChip({
  accent,
  children,
  className,
}: {
  accent: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-8 items-center justify-center rounded-lg md:size-10",
        className
      )}
      style={{ background: hexToRgba(accent, 0.08) }}
    >
      {children}
    </div>
  );
}

/**
 * Non-expandable surface with the same depth treatment as SectionCard
 * (accent top bar, border/shadow via hexToRgba). Use for section pages
 * that need Overview-style cards without the expand/modal interaction.
 */
export function SectionSurface({
  accent,
  cardId,
  children,
  className,
  lit = true,
}: {
  accent: string;
  cardId?: string;
  children: ReactNode;
  className?: string;
  /** When true, applies a soft always-on accent border/shadow (Research). */
  lit?: boolean;
}) {
  return (
    <motion.div
      layoutId={cardId ? `surface-${cardId}` : undefined}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 transition-all duration-200 md:p-6",
        lit &&
          "border-[color:var(--section-accent-border)] shadow-[0_0_24px_-6px_var(--section-accent-shadow)]",
        className
      )}
      style={sectionAccentStyle(accent)}
    >
      <div
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl"
        style={{ background: accent }}
      />
      {children}
    </motion.div>
  );
}

export function SectionCard({
  title,
  accent,
  icon,
  stat,
  alert,
  items,
  emptyMessage,
  cta,
  cardId,
  onExpand,
  isExpanded = false,
}: SectionCardProps) {
  const accentStyles = sectionAccentStyle(accent);

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
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 transition-all duration-200 hover:border-[color:var(--section-accent-border)] hover:bg-card/80 hover:shadow-[0_0_24px_-4px_var(--section-accent-shadow)] md:p-6"
      style={accentStyles}
    >
      <div
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl"
        style={{ background: accent }}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center">
          <SectionIconChip accent={accent}>{icon}</SectionIconChip>
          <span className="ml-2 text-sm font-semibold text-foreground">
            {title}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold tabular-nums text-foreground md:text-3xl">
            {stat.value}
          </span>
          <span className="text-right text-[10px] uppercase tracking-wide text-muted-foreground">
            {stat.label}
          </span>
        </div>
      </div>

      {alert && alert.count > 0 ? (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/[0.08] px-2.5 py-1.5">
          <span className="size-1.5 rounded-full bg-red-400" />
          <span className="text-xs font-medium text-red-400">
            {alert.count} {alert.label}
          </span>
        </div>
      ) : null}

      <div className="my-3 border-t border-border/40" />

      {items.length > 0 ? (
        <div>
          {items.slice(0, 3).map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex items-center gap-2 py-1">
              <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground/80">
                {item.label}
              </span>
              {item.sub ? (
                <span
                  className={cn(
                    "shrink-0 text-xs",
                    item.subColour ? "font-medium" : "text-muted-foreground"
                  )}
                  style={
                    item.subColour ? { color: item.subColour } : undefined
                  }
                >
                  {item.sub}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="py-2 text-sm text-muted-foreground">{emptyMessage}</p>
      )}

      <div className="mt-auto flex items-center justify-between pt-4">
        <span
          className="flex items-center gap-1 text-xs font-medium"
          style={{ color: accent }}
        >
          {cta}
          <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </span>
        <span className="text-[10px] text-muted-foreground/60">
          Click to expand
        </span>
      </div>
    </motion.div>
  );
}
