import { ContentPlatformDots } from "@/components/content/content-platform-dots";
import { PLATFORM_PILL_CLASS } from "@/lib/content/constants";
import { getPostPlatforms } from "@/lib/content/platforms";
import type { ContentPost } from "@/lib/content/types";
import { cn } from "@/lib/utils";

type ContentCalendarPillProps = {
  post: ContentPost;
  label: string;
  className?: string;
};

export function ContentCalendarPill({
  post,
  label,
  className,
}: ContentCalendarPillProps) {
  const platforms = getPostPlatforms(post);
  const primaryPlatform = platforms[0] ?? "Other";

  return (
    <span
      className={cn(
        "flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight",
        PLATFORM_PILL_CLASS[primaryPlatform] ?? PLATFORM_PILL_CLASS.Other,
        className
      )}
      title={`${label} (${platforms.join(", ")})`}
    >
      {platforms.length > 1 ? (
        <ContentPlatformDots platforms={platforms} />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}
