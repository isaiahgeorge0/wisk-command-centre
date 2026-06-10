import { ContentPlatformDots } from "@/components/content/content-platform-dots";
import { PLATFORM_PILL_CLASS } from "@/lib/content/constants";
import { getPostPlatforms } from "@/lib/content/platforms";
import type { ContentPost } from "@/lib/content/types";
import { cn } from "@/lib/utils";

type ContentCalendarPillProps = {
  post: ContentPost;
  label: string;
  className?: string;
  onClick?: () => void;
};

export function ContentCalendarPill({
  post,
  label,
  className,
  onClick,
}: ContentCalendarPillProps) {
  const platforms = getPostPlatforms(post);
  const primaryPlatform = platforms[0] ?? "Other";

  const classNames = cn(
    "flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight",
    PLATFORM_PILL_CLASS[primaryPlatform] ?? PLATFORM_PILL_CLASS.Other,
    onClick && "cursor-pointer hover:opacity-90",
    className
  );

  const content = (
    <>
      {platforms.length > 1 ? (
        <ContentPlatformDots platforms={platforms} />
      ) : null}
      <span className="truncate">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn("w-full text-left", classNames)}
        title={`${label} (${platforms.join(", ")})`}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={classNames}
      title={`${label} (${platforms.join(", ")})`}
    >
      {content}
    </span>
  );
}
