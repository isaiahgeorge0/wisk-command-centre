"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

import { useMotionSafe } from "@/lib/motion/use-motion-safe";

type PageTransitionProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();
  const { getPageInitial, getPageAnimate, pageTransition } = useMotionSafe();

  return (
    <motion.div
      key={pathname}
      className={className}
      initial={getPageInitial()}
      animate={getPageAnimate()}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}
