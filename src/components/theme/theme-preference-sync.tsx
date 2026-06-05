"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

import type { ThemePreference } from "@/lib/preferences/types";

type ThemePreferenceSyncProps = {
  themePreference: ThemePreference;
  enabled: boolean;
};

export function ThemePreferenceSync({
  themePreference,
  enabled,
}: ThemePreferenceSyncProps) {
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!enabled) {
      return;
    }
    setTheme(themePreference);
  }, [enabled, setTheme, themePreference]);

  return null;
}
