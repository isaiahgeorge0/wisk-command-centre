"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { useWinstonSidebar } from "@/components/winston/winston-sidebar-context";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";

export function WinstonFab() {
  const reduced = useReducedMotion();
  const { open, trigger, openSidebar, closeSidebar } = useWinstonSidebar();
  const isGlobalOpen = open && trigger?.tier === "global";

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
      className="fixed bottom-20 right-4 z-40 inline-flex size-12 items-center justify-center rounded-full bg-wisk-section-winston text-wisk-section-winston-fg shadow-[0_0_20px_rgba(139,0,255,0.25)] hover:opacity-90 md:bottom-6 md:right-6 md:z-50"
      whileHover={reduced ? undefined : { scale: 1.05 }}
      whileTap={reduced ? undefined : { scale: 0.95 }}
      animate={
        reduced
          ? undefined
          : {
              scale: [1, 1.06, 1],
            }
      }
      transition={
        reduced
          ? { duration: 0 }
          : {
              scale: {
                duration: MOTION_DURATION.fabPulse,
                ease: MOTION_EASE.smooth,
                times: [0, 0.5, 1],
              },
              default: { duration: MOTION_DURATION.fast },
            }
      }
    >
      <Sparkles className="size-5" strokeWidth={2.25} aria-hidden />
    </motion.button>
  );
}
