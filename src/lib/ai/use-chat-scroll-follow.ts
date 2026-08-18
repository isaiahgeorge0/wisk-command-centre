"use client";

import { useCallback, useEffect, useRef } from "react";

const NEAR_BOTTOM_PX = 100;
const SMOOTH_SCROLL_EPSILON = 1;
const SMOOTH_SCROLL_FACTOR = 0.35;

/**
 * Chat panel scroll follow: scroll the overflow container itself (never
 * scrollIntoView on a child — that can scroll the page). Auto-follows only
 * when the user was already near the bottom.
 */
export function useChatScrollFollow(followDeps: unknown[]) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const targetScrollTopRef = useRef<number | null>(null);

  const stopAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

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

    targetScrollTopRef.current = Math.max(0, el.scrollHeight - el.clientHeight);
    if (rafRef.current !== null) return;

    const animate = () => {
      const target = scrollRef.current;
      const targetScrollTop = targetScrollTopRef.current;
      if (!target || targetScrollTop == null) {
        rafRef.current = null;
        return;
      }

      const delta = targetScrollTop - target.scrollTop;
      if (Math.abs(delta) <= SMOOTH_SCROLL_EPSILON) {
        target.scrollTop = targetScrollTop;
        nearBottomRef.current = true;
        rafRef.current = null;
        return;
      }

      target.scrollTop += delta * SMOOTH_SCROLL_FACTOR;
      nearBottomRef.current = true;
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
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
      stopAnimation();
    };
    // followDeps is intentional — callers pass [messages, isSending, …]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, followDeps);

  useEffect(() => stopAnimation, [stopAnimation]);

  return { scrollRef, scrollToBottom, stickToBottom };
}
