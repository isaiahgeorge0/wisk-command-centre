"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useEffect } from "react";

type LeadWonCelebrationProps = {
  active: boolean;
};

const PARTICLES = [
  { x: -48, y: -36, color: "bg-amber-400", size: "size-2" },
  { x: 44, y: -40, color: "bg-emerald-400", size: "size-1.5" },
  { x: -32, y: 28, color: "bg-yellow-300", size: "size-2" },
  { x: 52, y: 20, color: "bg-emerald-500", size: "size-1.5" },
  { x: 0, y: -52, color: "bg-amber-300", size: "size-2" },
  { x: -56, y: 8, color: "bg-wisk-section-leads", size: "size-1.5" },
  { x: 36, y: 36, color: "bg-yellow-400", size: "size-1.5" },
  { x: -20, y: -48, color: "bg-emerald-300", size: "size-1.5" },
  { x: 24, y: -24, color: "bg-amber-500", size: "size-1" },
  { x: -40, y: -8, color: "bg-emerald-400", size: "size-1" },
  { x: 8, y: 44, color: "bg-yellow-300", size: "size-1.5" },
  { x: 60, y: -12, color: "bg-amber-400", size: "size-1" },
];

export function LeadWonCelebration({ active }: LeadWonCelebrationProps) {
  const reduced = useReducedMotion();

  if (!active) return null;

  if (reduced) {
    return (
      <div
        className="pointer-events-none absolute inset-0 rounded-xl bg-amber-400/15 ring-2 ring-amber-400/50"
        aria-hidden
      />
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-amber-400/25 via-emerald-400/15 to-transparent"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.8, ease: "easeOut" }}
        aria-hidden
      />
      <motion.div
        className="absolute inset-0 ring-2 ring-amber-400/70 ring-inset"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.8, ease: "easeOut" }}
        aria-hidden
      />
      {PARTICLES.map((particle, index) => (
        <motion.span
          key={index}
          className={`absolute left-1/2 top-1/2 rounded-full ${particle.size} ${particle.color}`}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: particle.x,
            y: particle.y,
            opacity: 0,
            scale: 0.3,
          }}
          transition={{
            duration: 0.9,
            ease: "easeOut",
            delay: index * 0.03,
          }}
          aria-hidden
        />
      ))}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.1, 1, 0.9] }}
        transition={{
          duration: 2,
          times: [0, 0.15, 0.7, 1],
          ease: "easeOut",
        }}
        aria-hidden
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-amber-400/20 shadow-lg">
          <Trophy className="size-6 text-amber-400" />
        </div>
      </motion.div>
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
    const timeout = window.setTimeout(onComplete, reduced ? 150 : 2000);
    return () => window.clearTimeout(timeout);
  }, [celebrate, onComplete, reduced]);

  return <LeadWonCelebration active={celebrate} />;
}
