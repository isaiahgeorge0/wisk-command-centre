"use client";

import { motion } from "framer-motion";

import { STAGGER_CHILD_DELAY } from "@/lib/motion/config";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";

type StaggerListProps = {
  children: React.ReactNode;
  className?: string;
  /** When false, children render without stagger orchestration */
  stagger?: boolean;
  as?: "div" | "ul";
};

export function StaggerList({
  children,
  className,
  stagger = true,
  as = "div",
}: StaggerListProps) {
  const { staggerDelay, reduced } = useMotionSafe();
  const Component = motion[as];

  if (!stagger || reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Component
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay || STAGGER_CHILD_DELAY,
          },
        },
      }}
    >
      {children}
    </Component>
  );
}
