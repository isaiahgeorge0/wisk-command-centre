"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { SECTION_ACCENT_HEX } from "@/lib/color/readable-text";

/** Theme-aware Research accent hex (matches SECTION_COLOURS / CSS tokens). */
export function useResearchAccent(): string {
  const { resolvedTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const isDark = themeReady && resolvedTheme === "dark";
  return isDark
    ? SECTION_ACCENT_HEX.dark.research
    : SECTION_ACCENT_HEX.light.research;
}
