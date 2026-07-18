import type { ReactNode } from "react";

import { hexToRgba } from "@/lib/color";
import { cn } from "@/lib/utils";

const SECTION_ACCENT_CLASSES = {
  projects: {
    iconBg: "bg-wisk-section-projects/15",
    title: "text-wisk-section-projects",
  },
  tasks: {
    iconBg: "bg-wisk-section-tasks/15",
    title: "text-wisk-section-tasks",
  },
  goals: {
    iconBg: "bg-wisk-section-goals/15",
    title: "text-wisk-section-goals",
  },
  ideas: {
    iconBg: "bg-wisk-section-ideas/15",
    title: "text-wisk-section-ideas",
  },
  leads: {
    iconBg: "bg-wisk-section-leads/15",
    title: "text-wisk-section-leads",
  },
  content: {
    iconBg: "bg-wisk-section-content/15",
    title: "text-wisk-section-content",
  },
  calendar: {
    iconBg: "bg-wisk-section-calendar/15",
    title: "text-wisk-section-calendar",
  },
  winston: {
    iconBg: "bg-wisk-section-winston/15",
    title: "text-wisk-section-winston",
  },
  email: {
    iconBg: "bg-wisk-section-email/15",
    title: "text-wisk-section-email",
  },
  notes: {
    iconBg: "bg-wisk-section-notes/15",
    title: "text-wisk-section-notes",
  },
  properties: {
    iconBg: "bg-[#e8001d]/15",
    title: "text-[#e8001d]",
  },
} as const;

export type PageHeaderAccent = keyof typeof SECTION_ACCENT_CLASSES;

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  gradient?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  /** Hex colour — converted to rgba() for hydration-safe inline styles. */
  accentColour?: string;
  /** Theme-aware section token — preferred over accentColour. */
  accent?: PageHeaderAccent;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  icon,
  gradient = false,
  gradientFrom,
  gradientTo,
  accentColour,
  accent,
  className,
}: PageHeaderProps) {
  const accentClasses = accent ? SECTION_ACCENT_CLASSES[accent] : null;

  const iconContainerStyle =
    gradient && gradientFrom && gradientTo
      ? {
          backgroundImage: `linear-gradient(to bottom right, ${hexToRgba(gradientFrom, 0.3)}, ${hexToRgba(gradientTo, 0.3)})`,
        }
      : !accentClasses && accentColour
        ? {
            backgroundColor: hexToRgba(accentColour, 0.15),
          }
        : undefined;

  const titleStyle =
    gradient && gradientFrom && gradientTo
      ? {
          backgroundImage: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }
      : !accentClasses && accentColour
        ? { color: accentColour }
        : undefined;

  return (
    <header className={cn("mb-6 flex items-center gap-4", className)}>
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-sm md:size-12",
          accentClasses?.iconBg
        )}
        style={iconContainerStyle}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h1
          className={cn(
            "text-xl font-semibold tracking-tight md:text-3xl",
            accentClasses?.title
          )}
          style={titleStyle}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </header>
  );
}
