"use client";

import { useEffect, useState } from "react";

/**
 * Space reserved for BottomNav on small screens.
 * Matches checkout sticky CTAs: min-h-11 row + pt-1 + safe area.
 */
export const MOBILE_NAV_CLEARANCE =
  "var(--wisk-mobile-nav-clearance, calc(3.25rem + env(safe-area-inset-bottom)))";

/**
 * Bottom offset for full-height mobile sheets (Winston, Leads tools).
 * Clears the bottom nav when the keyboard is closed; tracks the visual
 * viewport when the keyboard is open so the composer stays tappable.
 */
export function useMobileSheetBottom(enabled = true): string {
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      setKeyboardOverlap(
        Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      );
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [enabled]);

  return `max(${keyboardOverlap}px, ${MOBILE_NAV_CLEARANCE})`;
}
