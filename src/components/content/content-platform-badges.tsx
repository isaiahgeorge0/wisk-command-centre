import { ContentPlatformBadge } from "@/components/content/content-platform-badge";
import { getPostPlatforms } from "@/lib/content/platforms";
import type { ContentPlatform, ContentPost } from "@/lib/content/types";
import { cn } from "@/lib/utils";

type ContentPlatformBadgesProps = {
  platforms?: ContentPlatform[];
  post?: ContentPost;
  className?: string;
};

export function ContentPlatformBadges({
  platforms,
  post,
  className,
}: ContentPlatformBadgesProps) {
  const resolved = platforms ?? (post ? getPostPlatforms(post) : []);

  if (resolved.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {resolved.map((platform) => (
        <ContentPlatformBadge key={platform} platform={platform} />
      ))}
    </div>
  );
}
