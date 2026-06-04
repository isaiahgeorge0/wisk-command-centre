"use client";

import { motion, useReducedMotion } from "framer-motion";

import {
  fadeUpHidden,
  fadeUpVisible,
  MOTION_DURATION,
  MOTION_EASE,
  STAGGER_CHILD_DELAY,
} from "@/lib/motion/config";

type SignInEntranceProps = {
  children: React.ReactNode;
};

export function SignInEntrance({ children }: SignInEntranceProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <>{children}</>;
  }

  return (
    <motion.div
      className="flex w-full max-w-md flex-col items-center text-center"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: STAGGER_CHILD_DELAY },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function SignInEntranceItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: fadeUpHidden,
        visible: fadeUpVisible,
      }}
      transition={{
        duration: MOTION_DURATION.normal,
        ease: MOTION_EASE.smooth,
      }}
    >
      {children}
    </motion.div>
  );
}
