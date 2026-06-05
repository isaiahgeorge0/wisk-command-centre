"use client";

import { motion, useReducedMotion } from "framer-motion";

const PURPLE = "#7F77DD";
const TEAL = "#1D9E75";
const CX = 200;
const CY = 200;
const OUTER_RADIUS = 185;
const INNER_RADIUS = 8;
const ARM_COUNT = 8;
const TURNS = 1.75;

function spiralArmPath(startAngle: number): string {
  const steps = 72;
  const parts: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = startAngle + t * TURNS * Math.PI * 2;
    const radius = OUTER_RADIUS - (OUTER_RADIUS - INNER_RADIUS) * t;
    const x = CX + radius * Math.cos(angle);
    const y = CY + radius * Math.sin(angle);
    parts.push(i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `L ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return parts.join(" ");
}

const SPIRAL_ARMS = Array.from({ length: ARM_COUNT }, (_, index) => ({
  id: index,
  d: spiralArmPath((index / ARM_COUNT) * Math.PI * 2),
  color: index % 2 === 0 ? PURPLE : TEAL,
}));

type OnboardingWelcomeSpiralProps = {
  active: boolean;
};

export function OnboardingWelcomeSpiral({ active }: OnboardingWelcomeSpiralProps) {
  const reduced = useReducedMotion();

  if (reduced || !active) {
    return null;
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {SPIRAL_ARMS.map((arm) => (
        <motion.path
          key={arm.id}
          d={arm.d}
          fill="none"
          stroke={arm.color}
          strokeWidth={1.5}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 0.85, 0.5, 0] }}
          transition={{
            pathLength: {
              duration: 1.2,
              ease: [0.4, 0, 0.2, 1],
              delay: arm.id * 0.03,
            },
            opacity: {
              duration: 1.2,
              ease: [0.4, 0, 0.2, 1],
              delay: arm.id * 0.03,
              times: [0, 0.25, 0.75, 1],
            },
          }}
        />
      ))}
    </svg>
  );
}
