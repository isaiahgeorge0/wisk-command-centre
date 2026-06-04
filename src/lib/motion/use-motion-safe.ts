"use client";

import { useReducedMotion } from "framer-motion";
import { useMemo } from "react";

import {
  MOTION_DURATION,
  MOTION_EASE,
  pageEnterHidden,
  pageEnterVisible,
} from "@/lib/motion/config";

export function useMotionSafe() {
  const reduced = useReducedMotion();

  return useMemo(
    () => ({
      reduced: Boolean(reduced),
      duration: reduced ? 0 : MOTION_DURATION.normal,
      fastDuration: reduced ? 0 : MOTION_DURATION.fast,
      slowDuration: reduced ? 0 : MOTION_DURATION.slow,
      progressDuration: reduced ? 0 : MOTION_DURATION.progressBar,
      transition: reduced
        ? { duration: 0 }
        : { duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth },
      pageTransition: reduced
        ? { duration: 0 }
        : { duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth },
      itemTransition: reduced
        ? { duration: 0 }
        : { duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth },
      countUpTransition: reduced
        ? { duration: 0 }
        : { duration: MOTION_DURATION.slow, ease: MOTION_EASE.countUp },
      progressTransition: reduced
        ? { duration: 0 }
        : { duration: MOTION_DURATION.progressBar, ease: MOTION_EASE.easeOut },
      popoverTransition: reduced
        ? { duration: 0 }
        : { duration: MOTION_DURATION.fast, ease: MOTION_EASE.smooth },
      staggerDelay: reduced ? 0 : 0.06,
      getInitial: <T extends object>(hidden: T) =>
        reduced ? false : hidden,
      getPageInitial: () => (reduced ? false : pageEnterHidden),
      getPageAnimate: () => pageEnterVisible,
    }),
    [reduced]
  );
}
