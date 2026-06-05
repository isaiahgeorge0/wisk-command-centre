import { PLATFORM_DOT_CLASS } from "@/lib/content/constants";
import type { ContentPlatform } from "@/lib/content/types";
import { cn } from "@/lib/utils";

type ContentPlatformDotsProps = {
  platforms: ContentPlatform[];
  className?: string;
  size?: "sm" | "md";
};

export function ContentPlatformDots({
  platforms,
  className,
  size = "sm",
}: ContentPlatformDotsProps) {
  if (platforms.length === 0) return null;

  const dotSize = size === "sm" ? "size-1.5" : "size-2";

  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-0.5", className)}
      aria-hidden
    >
      {platforms.map((platform) => (
        <span
          key={platform}
          className={cn(
            "rounded-full",
            dotSize,
            PLATFORM_DOT_CLASS[platform] ?? PLATFORM_DOT_CLASS.Other
          )}
        />
      ))}
    </span>
  );
}
