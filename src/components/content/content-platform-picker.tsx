"use client";

import {
  PLATFORM_TOGGLE_SELECTED_CLASS,
} from "@/lib/content/constants";
import { CONTENT_PLATFORMS, type ContentPlatform } from "@/lib/content/types";
import { cn } from "@/lib/utils";

type ContentPlatformPickerProps = {
  id: string;
  value: ContentPlatform[];
  onChange: (platforms: ContentPlatform[]) => void;
  disabled?: boolean;
};

export function ContentPlatformPicker({
  id,
  value,
  onChange,
  disabled,
}: ContentPlatformPickerProps) {
  const togglePlatform = (platform: ContentPlatform) => {
    if (disabled) return;

    if (value.includes(platform)) {
      if (value.length === 1) return;
      onChange(value.filter((item) => item !== platform));
      return;
    }

    onChange([...value, platform]);
  };

  return (
    <div className="grid gap-2">
      <div
        id={id}
        role="group"
        aria-label="Platforms"
        className="flex flex-wrap gap-2"
      >
        {CONTENT_PLATFORMS.map((platform) => {
          const selected = value.includes(platform);

          return (
            <button
              key={platform}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => togglePlatform(platform)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                selected
                  ? PLATFORM_TOGGLE_SELECTED_CLASS[platform]
                  : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              {platform}
            </button>
          );
        })}
      </div>
      {value.length === 0 ? (
        <p className="text-xs text-destructive">Select at least one platform</p>
      ) : null}
    </div>
  );
}
