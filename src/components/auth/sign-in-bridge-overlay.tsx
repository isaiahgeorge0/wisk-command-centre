"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

import { MOTION_DURATION } from "@/lib/motion/config";

type SignInBridgeOverlayProps = {
  visible: boolean;
  onComplete: () => void;
};

export function SignInBridgeOverlay({
  visible,
  onComplete,
}: SignInBridgeOverlayProps) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (reduced) {
      onComplete();
      return;
    }

    const timer = window.setTimeout(onComplete, 900);
    return () => window.clearTimeout(timer);
  }, [visible, onComplete, reduced]);

  if (!visible) {
    return null;
  }

  if (reduced) {
    return null;
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: MOTION_DURATION.fast }}
    >
      <div className="relative flex flex-col items-center">
        <motion.div
          className="pointer-events-none absolute inset-0 -m-16 rounded-full"
          aria-hidden
          initial={{ opacity: 0.35, scale: 0.9 }}
          animate={{
            opacity: [0.35, 0.75, 0.25],
            scale: [0.9, 1.08, 1],
          }}
          transition={{
            duration: 0.85,
            ease: "easeInOut",
            times: [0, 0.45, 1],
          }}
          style={{
            background:
              "radial-gradient(circle, oklch(0.55 0.14 300 / 0.28) 0%, oklch(0.65 0.1 180 / 0.14) 45%, transparent 70%)",
          }}
        />

        <motion.span
          className="relative bg-gradient-to-r from-wisk-purple to-wisk-teal bg-clip-text text-4xl font-bold tracking-[0.28em] text-transparent uppercase sm:text-5xl"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: MOTION_DURATION.normal, ease: "easeOut" }}
        >
          WISK
        </motion.span>
      </div>
    </motion.div>
  );
}
