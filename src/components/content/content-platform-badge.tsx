import { PLATFORM_BADGE_CLASS } from "@/lib/content/constants";
import type { ContentPlatform } from "@/lib/content/types";
import { cn } from "@/lib/utils";

type ContentPlatformBadgeProps = {
  platform: ContentPlatform | string;
  className?: string;
};

export function ContentPlatformBadge({
  platform,
  className,
}: ContentPlatformBadgeProps) {
  const key = platform as ContentPlatform;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        PLATFORM_BADGE_CLASS[key] ?? PLATFORM_BADGE_CLASS.Other,
        className
      )}
    >
      {platform}
    </span>
  );
}
