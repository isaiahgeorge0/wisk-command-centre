"use client";

import { motion } from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";

import { useOptionalMobileComposeFocus } from "@/components/layout/mobile-compose-focus-context";
import { useMobileSheetBottom } from "@/components/layout/use-mobile-sheet-inset";
import { useIsMobile } from "@/lib/layout/use-is-mobile";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import { cn } from "@/lib/utils";

type MobileSendComposeProps = {
  children: ReactNode;
  className?: string;
  /** Optional hint line below the compose row (e.g. keyboard shortcuts). */
  footer?: ReactNode;
};

export function MobileSendCompose({
  children,
  className,
  footer,
}: MobileSendComposeProps) {
  const isMobile = useIsMobile();
  const { reduced } = useMotionSafe();
  const { setComposeFocused } = useOptionalMobileComposeFocus();
  const [expanded, setExpanded] = useState(false);
  const [insideMobileSheet, setInsideMobileSheet] = useState(false);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetBottom = useMobileSheetBottom(expanded);

  const clearBlurTimeout = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearBlurTimeout();
      if (expanded) {
        setComposeFocused(false);
      }
    };
  }, [expanded, setComposeFocused]);

  const setFocused = (focused: boolean) => {
    setComposeFocused(focused);
    if (!focused) {
      setExpanded(false);
      setInsideMobileSheet(false);
      setSpacerHeight(0);
    }
  };

  const handleFocusCapture = (event: FocusEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLTextAreaElement)
    ) {
      return;
    }

    clearBlurTimeout();
    const insideSheet = Boolean(
      shellRef.current?.closest("[data-mobile-sheet-content]")
    );
    setInsideMobileSheet(insideSheet);
    setComposeFocused(true);

    if (!insideSheet) {
      if (shellRef.current) {
        setSpacerHeight(shellRef.current.offsetHeight);
      }
      setExpanded(true);
    }
  };

  const handleBlurCapture = (event: FocusEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    const related = event.relatedTarget;
    if (
      related instanceof Node &&
      shellRef.current?.contains(related)
    ) {
      return;
    }

    clearBlurTimeout();
    blurTimeoutRef.current = setTimeout(() => {
      setFocused(false);
      setSpacerHeight(0);
    }, 120);
  };

  if (!isMobile) {
    return (
      <div className={className} data-mobile-send-compose>
        {children}
        {footer}
      </div>
    );
  }

  const useFixedExpand = expanded && !insideMobileSheet;

  return (
    <>
      {useFixedExpand && spacerHeight > 0 ? (
        <div aria-hidden style={{ height: spacerHeight }} />
      ) : null}
      <motion.div
        ref={shellRef}
        data-mobile-send-compose
        className={cn(
          className,
          useFixedExpand &&
            "fixed inset-x-0 z-[45] border-t border-border/60 bg-card/95 px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.14)] backdrop-blur-md"
        )}
        style={useFixedExpand ? { bottom: sheetBottom } : undefined}
        initial={false}
        animate={{
          y: useFixedExpand && !reduced ? [32, 0] : 0,
          opacity: 1,
        }}
        transition={{
          duration: useFixedExpand && !reduced ? MOTION_DURATION.normal : 0,
          ease: MOTION_EASE.smooth,
        }}
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
      >
        {children}
        {footer}
      </motion.div>
    </>
  );
}
