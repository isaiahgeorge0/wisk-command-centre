"use client";

import { useEffect, useState } from "react";

/**
 * Returns true only for the first mount cycle so list stagger runs once.
 * After mount, returns false so edits/toggles don't re-stagger items.
 */
export function useStaggerOnce(): boolean {
  const [stagger, setStagger] = useState(true);

  useEffect(() => {
    setStagger(false);
  }, []);

  return stagger;
}
