"use client";

import { useEffect, useRef } from "react";
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
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasSyncedRef.current) {
      return;
    }

    setTheme(themePreference);
    hasSyncedRef.current = true;
  }, [enabled, setTheme, themePreference]);

  return null;
}
