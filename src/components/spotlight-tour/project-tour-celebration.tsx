"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

import { useSpotlightTour } from "@/components/spotlight-tour/spotlight-tour-context";
import { Button } from "@/components/ui/button";
import { MOTION_DURATION } from "@/lib/motion/config";

const PARTICLES = [
  { x: -18, y: -12, color: "bg-wisk-turquoise" },
  { x: 16, y: -16, color: "bg-emerald-300" },
  { x: -10, y: 14, color: "bg-emerald-300" },
  { x: 20, y: 8, color: "bg-wisk-turquoise" },
  { x: 0, y: -20, color: "bg-emerald-400" },
  { x: -22, y: 4, color: "bg-wisk-turquoise" },
];

function ProjectTourConfetti() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl bg-wisk-turquoise/10"
        aria-hidden
      />
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <motion.div
        className="absolute inset-0 bg-wisk-turquoise/15"
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

type ProjectTourCelebrationProps = {
  displayName: string;
};

export function ProjectTourCelebration({
  displayName,
}: ProjectTourCelebrationProps) {
  const reduced = useReducedMotion();
  const { showCelebration, dismissCelebration } = useSpotlightTour();

  if (!showCelebration) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="First project created"
    >
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : MOTION_DURATION.fast }}
        aria-hidden
      />

      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-surface px-6 py-8 text-center shadow-2xl"
        initial={{ opacity: 0, scale: reduced ? 1 : 0.96, y: reduced ? 0 : 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : MOTION_DURATION.normal, ease: "easeOut" }}
      >
        <ProjectTourConfetti />

        <div className="relative z-10 flex flex-col items-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-wisk-turquoise/15">
            <CheckCircle2 className="size-9 text-wisk-lime" aria-hidden />
          </div>

          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            {displayName.trim()
              ? `${displayName.trim()}, your first project is live.`
              : "Your first project is live."}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
            Your command centre is ready. Keep adding projects, tasks, and goals
            as your business grows.
          </p>

          <Button
            type="button"
            className="mt-6"
            onClick={() => {
              void dismissCelebration();
            }}
          >
            Let&apos;s go
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
