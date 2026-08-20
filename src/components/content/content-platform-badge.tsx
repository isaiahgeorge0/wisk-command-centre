import {
  PLATFORM_ABBREVIATIONS,
  PLATFORM_BADGE_CLASS,
  PLATFORM_COMPACT_BADGE_CLASS,
} from "@/lib/content/constants";
import type { ContentPlatform } from "@/lib/content/types";
import { cn } from "@/lib/utils";

type ContentPlatformBadgeProps = {
  platform: ContentPlatform | string;
  /** Abbreviation + solid brand fill — for dense Content board cards. */
  compact?: boolean;
  className?: string;
};

export function ContentPlatformBadge({
  platform,
  compact = false,
  className,
}: ContentPlatformBadgeProps) {
  const key = platform as ContentPlatform;
  const label = compact
    ? (PLATFORM_ABBREVIATIONS[key] ?? String(platform).slice(0, 2).toUpperCase())
    : platform;

  return (
    <span
      title={String(platform)}
      className={cn(
        compact
          ? "inline-flex size-5 shrink-0 items-center justify-center rounded-md text-[9px] font-bold tracking-wide"
          : "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        compact
          ? (PLATFORM_COMPACT_BADGE_CLASS[key] ??
              PLATFORM_COMPACT_BADGE_CLASS.Other)
          : (PLATFORM_BADGE_CLASS[key] ?? PLATFORM_BADGE_CLASS.Other),
        className
      )}
    >
      {label}
    </span>
  );
}
