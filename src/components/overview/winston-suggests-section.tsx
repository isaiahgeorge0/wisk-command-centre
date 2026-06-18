"use client";

import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CheckSquare,
  Flame,
  FolderKanban,
  Lightbulb,
  Phone,
  Sparkles,
  Target,
  Trophy,
  User,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import type { SmartSuggestion, SuggestionPriority } from "@/lib/suggestions/types";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  User,
  UserPlus,
  Phone,
  FolderKanban,
  CalendarClock,
  ArrowRight,
  CheckSquare,
  CalendarDays,
  Target,
  Trophy,
  Flame,
  CalendarPlus,
  Lightbulb,
};

const PRIORITY_BADGE: Record<
  SuggestionPriority,
  { label: string; className: string }
> = {
  high: {
    label: "High",
    className: "border-wisk-coral/30 bg-wisk-coral/10 text-wisk-coral",
  },
  medium: {
    label: "Medium",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  low: {
    label: "Low",
    className: "border-border bg-muted/50 text-muted-foreground",
  },
};

type WinstonSuggestsSectionProps = {
  suggestions: SmartSuggestion[];
};

function SuggestionCard({
  suggestion,
  index,
}: {
  suggestion: SmartSuggestion;
  index: number;
}) {
  const Icon = ICON_MAP[suggestion.icon] ?? Sparkles;
  const badge = PRIORITY_BADGE[suggestion.priority];

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className={cn(
        "min-w-[260px] shrink-0 rounded-xl border border-border/60 bg-card/60 p-4 transition-colors hover:bg-card sm:min-w-0",
        "border-l-[3px]",
        suggestion.accentColour.replace("text-", "border-l-")
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("size-4 shrink-0", suggestion.accentColour)} />
          <p className="text-sm font-medium text-foreground">{suggestion.title}</p>
        </div>
        <Badge
          variant="outline"
          className={cn("shrink-0 text-[10px] px-1.5 py-0", badge.className)}
        >
          {badge.label}
        </Badge>
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {suggestion.description}
      </p>
      {suggestion.actionLabel && suggestion.actionHref ? (
        <Link
          href={suggestion.actionHref}
          className={cn(
            "mt-3 inline-block text-xs underline-offset-2 hover:underline",
            suggestion.accentColour
          )}
        >
          {suggestion.actionLabel}
        </Link>
      ) : null}
    </motion.li>
  );
}

export function WinstonSuggestsSection({
  suggestions,
}: WinstonSuggestsSectionProps) {
  if (suggestions.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-wisk-purple/20 to-wisk-teal/20">
          <Sparkles className="size-4 text-wisk-teal" aria-hidden />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Winston suggests
          </h2>
          <p className="text-xs text-muted-foreground">
            Based on what&apos;s happening in your business
          </p>
        </div>
      </div>

      <ul className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-3">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            index={index}
          />
        ))}
      </ul>
    </section>
  );
}
