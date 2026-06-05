"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

import { MOTION_DURATION } from "@/lib/motion/config";

type LeadWonCelebrationProps = {
  active: boolean;
};

const PARTICLES = [
  { x: -18, y: -12, color: "bg-emerald-400" },
  { x: 16, y: -16, color: "bg-wisk-teal" },
  { x: -10, y: 14, color: "bg-emerald-300" },
  { x: 20, y: 8, color: "bg-emerald-500" },
  { x: 0, y: -20, color: "bg-emerald-400" },
  { x: -22, y: 4, color: "bg-wisk-teal" },
];

export function LeadWonCelebration({ active }: LeadWonCelebrationProps) {
  const reduced = useReducedMotion();

  if (!active) return null;

  if (reduced) {
    return (
      <div
        className="pointer-events-none absolute inset-0 rounded-xl bg-emerald-400/15"
        aria-hidden
      />
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <motion.div
        className="absolute inset-0 bg-emerald-400/20"
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 0 }}
        transition={{ duration: MOTION_DURATION.fast, ease: "easeOut" }}
        aria-hidden
      />
      {PARTICLES.map((particle, index) => (
        <motion.span
          key={index}
          className={`absolute left-1/2 top-1/2 size-1.5 rounded-full ${particle.color}`}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: particle.x,
            y: particle.y,
            opacity: 0,
            scale: 0.4,
          }}
          transition={{
            duration: 0.45,
            ease: "easeOut",
          }}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function LeadWonCelebrationTrigger({
  celebrate,
  onComplete,
}: {
  celebrate: boolean;
  onComplete: () => void;
}) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!celebrate) return;
    const timeout = window.setTimeout(
      onComplete,
      reduced ? 150 : 450
    );
    return () => window.clearTimeout(timeout);
  }, [celebrate, onComplete, reduced]);

  return <LeadWonCelebration active={celebrate} />;
}
