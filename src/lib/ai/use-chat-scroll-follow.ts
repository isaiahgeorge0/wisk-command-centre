"use client";

import { useCallback, useEffect, useRef } from "react";

const NEAR_BOTTOM_PX = 100;
const SMOOTH_SCROLL_EPSILON = 1;
const SMOOTH_SCROLL_FACTOR = 0.35;

/**
 * Chat panel scroll follow: scroll the overflow container itself (never
 * scrollIntoView on a child — that can scroll the page). Auto-follows only
 * when the user was already near the bottom.
 *
 * Touch note: momentum scrolling and touchend fire after the finger lifts.
 * We pause follow for the whole gesture (and briefly after) so stream updates
 * cannot yank the viewport back down mid-scroll.
 */
export function useChatScrollFollow(followDeps: unknown[]) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const pointerDraggingRef = useRef(false);
  const followPausedUntilRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const targetScrollTopRef = useRef<number | null>(null);

  const stopAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    targetScrollTopRef.current = null;
  }, []);

  const measureNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
  }, []);

  const pauseFollowForGesture = useCallback(() => {
    pointerDraggingRef.current = true;
    stopAnimation();
    measureNearBottom();
  }, [measureNearBottom, stopAnimation]);

  const resumeFollowAfterGesture = useCallback(() => {
    pointerDraggingRef.current = false;
    // Cover iOS momentum scrolling after touchend.
    followPausedUntilRef.current = Date.now() + 350;
    measureNearBottom();
  }, [measureNearBottom]);

  /** Mark as stuck to bottom so the next content update will auto-follow. */
  const stickToBottom = useCallback(() => {
    nearBottomRef.current = true;
  }, []);

  const canAutoFollow = useCallback(() => {
    if (pointerDraggingRef.current) return false;
    if (Date.now() < followPausedUntilRef.current) return false;
    return nearBottomRef.current;
  }, []);

  const scrollToBottom = useCallback(
    (options?: { force?: boolean }) => {
      if (!options?.force && !canAutoFollow()) return;
      const el = scrollRef.current;
      if (!el) return;

      targetScrollTopRef.current = Math.max(
        0,
        el.scrollHeight - el.clientHeight
      );
      if (rafRef.current !== null) return;

      const animate = () => {
        const target = scrollRef.current;
        const targetScrollTop = targetScrollTopRef.current;
        if (!target || targetScrollTop == null) {
          rafRef.current = null;
          return;
        }

        // User took over mid-animation (touch/wheel) — stop following.
        if (pointerDraggingRef.current) {
          rafRef.current = null;
          targetScrollTopRef.current = null;
          measureNearBottom();
          return;
        }

        const distanceFromBottom =
          target.scrollHeight - target.scrollTop - target.clientHeight;
        // If the user scrolled away while we were animating, abort.
        if (
          !options?.force &&
          distanceFromBottom > NEAR_BOTTOM_PX + 20 &&
          Math.abs(targetScrollTop - target.scrollTop) > NEAR_BOTTOM_PX
        ) {
          nearBottomRef.current = false;
          rafRef.current = null;
          targetScrollTopRef.current = null;
          return;
        }

        const delta = targetScrollTop - target.scrollTop;
        if (Math.abs(delta) <= SMOOTH_SCROLL_EPSILON) {
          target.scrollTop = targetScrollTop;
          nearBottomRef.current = true;
          rafRef.current = null;
          targetScrollTopRef.current = null;
          return;
        }

        target.scrollTop += delta * SMOOTH_SCROLL_FACTOR;
        // Do NOT set nearBottomRef=true here — that fights touch scroll by
        // re-arming follow before the user has finished the gesture.
        rafRef.current = requestAnimationFrame(animate);
      };

      rafRef.current = requestAnimationFrame(animate);
    },
    [canAutoFollow, measureNearBottom]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    measureNearBottom();

    const onScroll = () => {
      measureNearBottom();
      // If a follow animation is running and the user scrolled away, stop it.
      if (
        rafRef.current !== null &&
        el.scrollHeight - el.scrollTop - el.clientHeight > NEAR_BOTTOM_PX
      ) {
        stopAnimation();
        nearBottomRef.current = false;
      }
    };

    const onWheel = () => {
      pauseFollowForGesture();
      // Wheel is discrete — resume on next frame after measuring.
      requestAnimationFrame(() => {
        pointerDraggingRef.current = false;
        measureNearBottom();
      });
    };

    const onTouchStart = () => {
      pauseFollowForGesture();
    };

    const onTouchEnd = () => {
      resumeFollowAfterGesture();
    };

    const onTouchCancel = () => {
      resumeFollowAfterGesture();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [
    measureNearBottom,
    pauseFollowForGesture,
    resumeFollowAfterGesture,
    stopAnimation,
  ]);

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
