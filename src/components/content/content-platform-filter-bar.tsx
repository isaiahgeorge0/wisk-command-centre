"use client";

import {
  PLATFORM_TOGGLE_SELECTED_CLASS,
} from "@/lib/content/constants";
import { CONTENT_PLATFORMS, type ContentPlatform } from "@/lib/content/types";
import { cn } from "@/lib/utils";

type ContentPlatformFilterBarProps = {
  activePlatforms: Set<ContentPlatform>;
  onToggle: (platform: ContentPlatform) => void;
  onClear: () => void;
};

export function ContentPlatformFilterBar({
  activePlatforms,
  onToggle,
  onClear,
}: ContentPlatformFilterBarProps) {
  const hasActiveFilters = activePlatforms.size > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        Platform
      </span>
      {CONTENT_PLATFORMS.map((platform) => {
        const active = activePlatforms.has(platform);

        return (
          <button
            key={platform}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(platform)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              active
                ? PLATFORM_TOGGLE_SELECTED_CLASS[platform]
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            {platform}
          </button>
        );
      })}
      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
