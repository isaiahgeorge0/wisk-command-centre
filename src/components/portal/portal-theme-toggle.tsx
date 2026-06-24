"use client";

import { Moon, Sun } from "lucide-react";

import { usePortalTheme } from "@/components/portal/portal-theme-provider";
import { cn } from "@/lib/utils";

export function PortalThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, isPending } = usePortalTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={isPending}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-[var(--portal-muted)] transition-colors hover:bg-[var(--portal-border)] hover:text-[var(--portal-text)]",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
