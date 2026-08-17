"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { useMobileComposeFocus } from "@/components/layout/mobile-compose-focus-context";
import { useWinstonSidebar } from "@/components/winston/winston-sidebar-context";
import { useIsMobile } from "@/lib/layout/use-is-mobile";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";

export function WinstonFab() {
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();
  const { isComposeFocused } = useMobileComposeFocus();
  const { open, trigger, openSidebar, closeSidebar } = useWinstonSidebar();
  const isGlobalOpen = open && trigger?.tier === "global";
  const hiddenOnMobile = isMobile && isComposeFocused;

  return (
    <motion.button
      type="button"
      onClick={() => {
        if (isGlobalOpen) {
          closeSidebar();
          return;
        }
        openSidebar({ tier: "global" });
      }}
      aria-label="Open Winston"
      aria-pressed={isGlobalOpen}
      aria-hidden={hiddenOnMobile}
      tabIndex={hiddenOnMobile ? -1 : 0}
      className="fixed bottom-20 right-4 z-40 inline-flex size-12 items-center justify-center rounded-full bg-wisk-section-winston text-wisk-section-winston-fg shadow-[0_0_20px_rgba(139,0,255,0.25)] hover:opacity-90 md:bottom-6 md:right-6 md:z-50"
      whileHover={reduced || hiddenOnMobile ? undefined : { scale: 1.05 }}
      whileTap={reduced || hiddenOnMobile ? undefined : { scale: 0.95 }}
      animate={
        reduced
          ? { opacity: hiddenOnMobile ? 0 : 1, scale: hiddenOnMobile ? 0.85 : 1 }
          : {
              opacity: hiddenOnMobile ? 0 : 1,
              scale: hiddenOnMobile ? 0.85 : [1, 1.06, 1],
            }
      }
      transition={
        reduced
          ? { duration: MOTION_DURATION.fast, ease: MOTION_EASE.smooth }
          : {
              opacity: { duration: MOTION_DURATION.fast, ease: MOTION_EASE.smooth },
              scale: hiddenOnMobile
                ? { duration: MOTION_DURATION.fast, ease: MOTION_EASE.smooth }
                : {
                    duration: MOTION_DURATION.fabPulse,
                    ease: MOTION_EASE.smooth,
                    times: [0, 0.5, 1],
                  },
            }
      }
      style={{ pointerEvents: hiddenOnMobile ? "none" : "auto" }}
    >
      <Sparkles className="size-5" strokeWidth={2.25} aria-hidden />
    </motion.button>
  );
}
