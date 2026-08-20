"use client";

import { Sparkles } from "lucide-react";

import { useWinstonSidebar } from "@/components/winston/winston-sidebar-context";
import type { WinstonPageSection } from "@/lib/winston/scope";
import { cn } from "@/lib/utils";

type WinstonEntryButtonProps = {
  /** Section-level: "Brainstorm with Winston". Record-level: "Winston". */
  variant?: "section" | "record";
  pressed?: boolean;
  onClick: () => void;
  className?: string;
  label?: string;
};

export function WinstonEntryButton({
  variant = "section",
  pressed = false,
  onClick,
  className,
  label: labelOverride,
}: WinstonEntryButtonProps) {
  const label =
    labelOverride ??
    (variant === "record" ? "Winston" : "Brainstorm with Winston");
  const shortLabel =
    labelOverride ?? (variant === "record" ? "Winston" : "Winston");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
        pressed
          ? "border-wisk-section-winston/50 bg-wisk-section-winston/15 text-foreground"
          : "border-wisk-section-winston/30 bg-wisk-section-winston/10 text-foreground hover:border-wisk-section-winston/50",
        className
      )}
    >
      <Sparkles className="size-4 text-wisk-section-winston" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel}</span>
    </button>
  );
}

/** Section-level "Brainstorm with Winston" — scoped to the current page, not a record. */
export function WinstonSectionEntry({
  section,
  className,
  label,
}: {
  section: WinstonPageSection;
  className?: string;
  /** Override the default "Brainstorm with Winston" label. */
  label?: string;
}) {
  const { open, trigger, toggleSidebar } = useWinstonSidebar();
  const pressed =
    open && trigger?.tier === "section" && trigger.section === section;

  return (
    <WinstonEntryButton
      className={className}
      pressed={pressed}
      label={label}
      onClick={() => toggleSidebar({ tier: "section", section })}
    />
  );
}
