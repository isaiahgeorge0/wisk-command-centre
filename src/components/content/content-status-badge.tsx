import { CONTENT_STATUS_BADGE_CLASS, CONTENT_STATUS_LABELS } from "@/lib/content/constants";
import type { ContentStatus } from "@/lib/content/types";
import { cn } from "@/lib/utils";

type ContentStatusBadgeProps = {
  status: ContentStatus | string;
  className?: string;
};

export function ContentStatusBadge({
  status,
  className,
}: ContentStatusBadgeProps) {
  const key = status as ContentStatus;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        CONTENT_STATUS_BADGE_CLASS[key] ?? CONTENT_STATUS_BADGE_CLASS.idea,
        className
      )}
    >
      {CONTENT_STATUS_LABELS[key] ?? status}
    </span>
  );
}
