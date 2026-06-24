"use client";

import { motion, useReducedMotion } from "framer-motion";

type PortalPageProps = {
  children: React.ReactNode;
};

export function PortalPage({ children }: PortalPageProps) {
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
