"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";

import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";

export function QuickAddFab() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const { openProjectAdd, openTaskAdd, openGoalAdd, openIdeaAdd, openLeadAdd, openContentAdd } =
    useQuickAdd();

  const handleClick = () => {
    if (pathname === "/") {
      openTaskAdd();
    } else if (pathname === "/calendar") {
      openTaskAdd();
    } else if (pathname === "/projects") {
      openProjectAdd();
    } else if (pathname === "/tasks") {
      openTaskAdd();
    } else if (pathname === "/goals") {
      openGoalAdd();
    } else if (pathname === "/ideas") {
      openIdeaAdd();
    } else if (pathname === "/leads") {
      openLeadAdd();
    } else if (pathname === "/content") {
      openContentAdd();
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-label="Quick add"
      className="fixed bottom-20 right-4 z-40 inline-flex size-12 items-center justify-center rounded-full border border-wisk-purple/20 bg-wisk-purple text-white shadow-[0_0_20px_rgba(139,92,246,0.1)] hover:bg-wisk-purple/90 hover:shadow-[0_0_24px_rgba(45,212,191,0.12)] md:bottom-6 md:right-6 md:z-50"
      whileHover={reduced ? undefined : { scale: 1.05 }}
      whileTap={reduced ? undefined : { scale: 0.95 }}
      initial={reduced ? false : { scale: 1 }}
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
      <Plus className="size-5" strokeWidth={2.5} />
    </motion.button>
  );
}
