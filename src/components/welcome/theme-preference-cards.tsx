"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import type { ThemePreference } from "@/lib/preferences/types";
import { cn } from "@/lib/utils";

type ThemePreferenceCardsProps = {
  value: ThemePreference;
  onChange: (theme: ThemePreference) => void;
};

export function ThemePreferenceCards({
  value,
  onChange,
}: ThemePreferenceCardsProps) {
  const { setTheme } = useTheme();

  function selectTheme(theme: ThemePreference) {
    onChange(theme);
    setTheme(theme);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => selectTheme("dark")}
        className={cn(
          "group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all",
          value === "dark"
            ? "border-wisk-lime ring-2 ring-wisk-lime/20"
            : "border-border/60 hover:border-border"
        )}
      >
        <div className="mb-3 flex h-16 items-center justify-center rounded-lg bg-zinc-950 ring-1 ring-white/10">
          <Moon className="size-5 text-zinc-300" aria-hidden />
        </div>
        <p className="text-sm font-medium text-foreground">Dark</p>
        <p className="text-xs text-muted-foreground">Recommended</p>
      </button>

      <button
        type="button"
        onClick={() => selectTheme("light")}
        className={cn(
          "group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all",
          value === "light"
            ? "border-wisk-lime ring-2 ring-wisk-lime/20"
            : "border-border/60 hover:border-border"
        )}
      >
        <div className="mb-3 flex h-16 items-center justify-center rounded-lg bg-zinc-100 ring-1 ring-black/5">
          <Sun className="size-5 text-amber-500" aria-hidden />
        </div>
        <p className="text-sm font-medium text-foreground">Light</p>
        <p className="text-xs text-muted-foreground">&nbsp;</p>
      </button>
    </div>
  );
}
