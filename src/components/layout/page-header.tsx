import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  gradient?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  accentColour?: string;
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
  className,
}: PageHeaderProps) {
  const iconContainerStyle =
    gradient && gradientFrom && gradientTo
      ? {
          backgroundImage: `linear-gradient(to bottom right, color-mix(in srgb, ${gradientFrom} 30%, transparent), color-mix(in srgb, ${gradientTo} 30%, transparent))`,
        }
      : accentColour
        ? {
            backgroundColor: `color-mix(in srgb, ${accentColour} 15%, transparent)`,
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
      : accentColour
        ? { color: accentColour }
        : undefined;

  return (
    <header className={cn("mb-6 flex items-center gap-4", className)}>
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-sm md:size-12"
        style={iconContainerStyle}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h1
          className="text-xl font-semibold tracking-tight md:text-3xl"
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
