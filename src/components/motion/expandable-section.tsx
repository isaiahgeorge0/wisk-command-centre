"use client";

import { AnimatePresence, motion } from "framer-motion";

import { useMotionSafe } from "@/lib/motion/use-motion-safe";

type ExpandableSectionProps = {
  open: boolean;
  children: React.ReactNode;
  className?: string;
};

export function ExpandableSection({
  open,
  children,
  className,
}: ExpandableSectionProps) {
  const { getInitial, itemTransition, reduced } = useMotionSafe();

  if (reduced) {
    return open ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="expanded"
          className={className}
          initial={getInitial({ opacity: 0, height: 0 })}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={itemTransition}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
