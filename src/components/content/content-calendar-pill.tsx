import { PLATFORM_PILL_CLASS } from "@/lib/content/constants";
import type { ContentPlatform } from "@/lib/content/types";
import { cn } from "@/lib/utils";

type ContentCalendarPillProps = {
  platform: ContentPlatform | string;
  label: string;
  className?: string;
};

export function ContentCalendarPill({
  platform,
  label,
  className,
}: ContentCalendarPillProps) {
  const key = platform as ContentPlatform;
  return (
    <span
      className={cn(
        "block truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight",
        PLATFORM_PILL_CLASS[key] ?? PLATFORM_PILL_CLASS.Other,
        className
      )}
      title={label}
    >
      {label}
    </span>
  );
}
