"use client";

import { motion, useReducedMotion } from "framer-motion";

export function OnboardingWelcomeBackground() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-br from-wisk-lime/20 via-transparent to-wisk-turquoise/20" />
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      aria-hidden
    >
      <motion.div
        className="absolute -inset-1/2 size-[200%] opacity-60"
        style={{
          background:
            "radial-gradient(circle at 30% 40%, rgba(139, 92, 246, 0.35) 0%, transparent 45%), radial-gradient(circle at 70% 60%, rgba(45, 212, 191, 0.28) 0%, transparent 42%)",
        }}
        animate={{
          x: ["-8%", "8%", "-8%"],
          y: ["-6%", "6%", "-6%"],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -inset-1/2 size-[200%] opacity-40"
        style={{
          background:
            "radial-gradient(circle at 60% 30%, rgba(45, 212, 191, 0.25) 0%, transparent 40%), radial-gradient(circle at 35% 70%, rgba(139, 92, 246, 0.2) 0%, transparent 38%)",
        }}
        animate={{
          x: ["10%", "-10%", "10%"],
          y: ["8%", "-8%", "8%"],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="absolute size-24 rounded-full blur-3xl"
          style={{
            background:
              index === 0
                ? "rgba(139, 92, 246, 0.15)"
                : index === 1
                  ? "rgba(45, 212, 191, 0.12)"
                  : "rgba(139, 92, 246, 0.08)",
            left: `${20 + index * 28}%`,
            top: `${25 + index * 15}%`,
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 8 + index * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 1.5,
          }}
        />
      ))}
    </div>
  );
}
