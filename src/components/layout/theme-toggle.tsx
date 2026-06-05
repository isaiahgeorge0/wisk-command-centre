"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { updateThemePreference } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import type { ThemePreference } from "@/lib/preferences/types";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-11 text-muted-foreground md:size-9"
        aria-label="Toggle theme"
        disabled
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  function handleToggle() {
    const nextTheme: ThemePreference = isDark ? "light" : "dark";
    setTheme(nextTheme);
    void updateThemePreference(nextTheme);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-foreground size-11 md:size-9"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
