"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";

type AnimatedNumberProps = {
  value: number;
  className?: string;
};

export function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }

    const controls = animate(0, value, {
      duration: MOTION_DURATION.slow,
      ease: MOTION_EASE.countUp,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });

    return () => controls.stop();
  }, [value, reduced]);

  return <span className={className}>{display}</span>;
}
