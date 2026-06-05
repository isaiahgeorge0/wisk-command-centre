import { CONTENT_TYPE_LABELS } from "@/lib/content/constants";
import type { ContentType } from "@/lib/content/types";
import { cn } from "@/lib/utils";

type ContentTypeBadgeProps = {
  contentType: ContentType | string;
  className?: string;
};

export function ContentTypeBadge({
  contentType,
  className,
}: ContentTypeBadgeProps) {
  const key = contentType as ContentType;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground",
        className
      )}
    >
      {CONTENT_TYPE_LABELS[key] ?? contentType}
    </span>
  );
}
