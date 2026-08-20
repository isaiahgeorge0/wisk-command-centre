"use client";

import { motion } from "framer-motion";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import { useMobileSheetBottom } from "@/components/layout/use-mobile-sheet-inset";
import { shouldSkipMobileInputExpand } from "@/lib/layout/mobile-input-expand";
import { useIsMobile } from "@/lib/layout/use-is-mobile";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import { cn } from "@/lib/utils";

type MobileInputShellProps = {
  children: ReactNode;
  className?: string;
};

function mergeFocusHandlers(
  existing: ((event: FocusEvent<HTMLElement>) => void) | undefined,
  next: (event: FocusEvent<HTMLElement>) => void
) {
  return (event: FocusEvent<HTMLElement>) => {
    existing?.(event);
    next(event);
  };
}

export function MobileInputShell({ children, className }: MobileInputShellProps) {
  const isMobile = useIsMobile();
  const { reduced } = useMotionSafe();
  const [expanded, setExpanded] = useState(false);
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

  useEffect(() => () => clearBlurTimeout(), []);

  const handleFocus = (event: FocusEvent<HTMLElement>) => {
    if (!isMobile || shouldSkipMobileInputExpand(event.target)) return;
    clearBlurTimeout();
    if (shellRef.current) {
      setSpacerHeight(shellRef.current.offsetHeight);
    }
    setExpanded(true);
  };

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
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
      setExpanded(false);
      setSpacerHeight(0);
    }, 120);
  };

  if (!isMobile || !isValidElement(children)) {
    return className ? <div className={className}>{children}</div> : children;
  }

  const child = children as ReactElement<{
    onFocus?: (event: FocusEvent<HTMLElement>) => void;
    onBlur?: (event: FocusEvent<HTMLElement>) => void;
    className?: string;
  }>;

  const enhancedChild = cloneElement(child, {
    onFocus: mergeFocusHandlers(child.props.onFocus, handleFocus),
    onBlur: mergeFocusHandlers(child.props.onBlur, handleBlur),
    className: cn(child.props.className, "text-base"),
  });

  return (
    <>
      {expanded && spacerHeight > 0 ? (
        <div aria-hidden style={{ height: spacerHeight }} />
      ) : null}
      <motion.div
        ref={shellRef}
        className={cn(
          className,
          expanded &&
            "fixed inset-x-0 z-[45] border-t border-border/60 bg-card/95 px-4 py-3 shadow-[0_-12px_36px_-8px_rgba(0,0,0,0.22)] backdrop-blur-md"
        )}
        style={expanded ? { bottom: sheetBottom } : undefined}
        initial={false}
        animate={{
          y: expanded && !reduced ? [28, 0] : 0,
          scale: expanded && !reduced ? 1.01 : 1,
          opacity: 1,
        }}
        transition={{
          duration: expanded && !reduced ? MOTION_DURATION.slow : 0,
          ease: MOTION_EASE.smooth,
        }}
        onFocusCapture={handleFocus}
        onBlurCapture={handleBlur}
      >
        {enhancedChild}
      </motion.div>
    </>
  );
}
