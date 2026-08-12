"use client";

import { useCallback, useEffect, useRef } from "react";

const NEAR_BOTTOM_PX = 100;

/**
 * Chat panel scroll follow: scroll the overflow container itself (never
 * scrollIntoView on a child — that can scroll the page). Auto-follows only
 * when the user was already near the bottom.
 */
export function useChatScrollFollow(followDeps: unknown[]) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const rafRef = useRef<number | null>(null);

  const measureNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
  }, []);

  /** Mark as stuck to bottom so the next content update will auto-follow. */
  const stickToBottom = useCallback(() => {
    nearBottomRef.current = true;
  }, []);

  const scrollToBottom = useCallback((options?: { force?: boolean }) => {
    if (!options?.force && !nearBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const target = scrollRef.current;
      if (!target) return;
      // Direct assignment — after paint, against the updated scrollHeight.
      target.scrollTop = target.scrollHeight;
      nearBottomRef.current = true;
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    measureNearBottom();
    el.addEventListener("scroll", measureNearBottom, { passive: true });
    return () => {
      el.removeEventListener("scroll", measureNearBottom);
    };
  }, [measureNearBottom]);

  useEffect(() => {
    scrollToBottom();
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // followDeps is intentional — callers pass [messages, isSending, …]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, followDeps);

  return { scrollRef, scrollToBottom, stickToBottom };
}
