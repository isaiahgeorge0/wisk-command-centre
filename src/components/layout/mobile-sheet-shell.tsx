"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { useMobileSheetBottom } from "@/components/layout/use-mobile-sheet-inset";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";

type MobileSheetShellProps = {
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
};

/**
 * Full-height mobile drawer that clears the bottom nav and keyboard.
 * Shared by Winston chat and Leads tools so clearance cannot drift.
 */
export function MobileSheetShell({
  onClose,
  closeLabel,
  children,
}: MobileSheetShellProps) {
  const { reduced } = useMotionSafe();
  const sheetBottom = useMobileSheetBottom(true);

  return (
    <>
      <motion.button
        type="button"
        aria-label={closeLabel}
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduced ? undefined : { opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        onClick={onClose}
      />
      <motion.aside
        data-mobile-sheet-content
        className="fixed top-0 right-0 z-[60] flex min-h-0 w-full max-w-sm flex-col overflow-hidden border-l border-border/60 bg-card shadow-2xl md:hidden"
        style={{ bottom: sheetBottom }}
        initial={reduced ? false : { x: "100%" }}
        animate={{ x: 0 }}
        exit={reduced ? undefined : { x: "100%" }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth }
        }
      >
        {children}
      </motion.aside>
    </>
  );
}
