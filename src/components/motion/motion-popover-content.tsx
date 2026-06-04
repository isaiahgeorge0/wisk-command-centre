"use client";

import { motion, useReducedMotion } from "framer-motion";

import {
  popoverEnterHidden,
  popoverEnterVisible,
} from "@/lib/motion/config";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";

type MotionPopoverSurfaceProps = {
  children: React.ReactNode;
  className?: string;
};

/** Fade + scale entrance for popover surfaces (mount-only). */
export function MotionPopoverSurface({
  children,
  className,
}: MotionPopoverSurfaceProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={popoverEnterHidden}
      animate={popoverEnterVisible}
      transition={{
        duration: MOTION_DURATION.fast,
        ease: MOTION_EASE.smooth,
      }}
    >
      {children}
    </motion.div>
  );
}
