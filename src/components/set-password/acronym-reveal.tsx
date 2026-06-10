"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

type AcronymRevealProps = {
  onComplete: () => void;
};

const WORDS = [
  { letter: "W", word: "Wisdom" },
  { letter: "I", word: "Integrity" },
  { letter: "S", word: "Strength" },
  { letter: "K", word: "Knowledge" },
];

const WORD_DELAY = 0.32;
const WISK_DELAY = WORDS.length * WORD_DELAY + 0.25;
const COMPLETE_DELAY_MS = (WISK_DELAY + 0.5) * 1000;

export function AcronymReveal({ onComplete }: AcronymRevealProps) {
  const reduced = useReducedMotion() ?? false;
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;

    if (reduced) {
      calledRef.current = true;
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      if (!calledRef.current) {
        calledRef.current = true;
        onComplete();
      }
    }, COMPLETE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [reduced, onComplete]);

  if (reduced) return null;

  return (
    <div className="flex flex-col items-center gap-3 pb-2">
      <div className="flex flex-col items-center gap-1.5">
        {WORDS.map(({ letter, word }, i) => (
          <motion.div
            key={letter}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.28,
              ease: [0.25, 0.1, 0.25, 1],
              delay: i * WORD_DELAY,
            }}
            className="flex items-baseline gap-2"
          >
            <span className="w-4 text-right text-xs font-bold tracking-wider text-wisk-purple/80">
              {letter}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {word}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.35,
          ease: [0.25, 0.1, 0.25, 1],
          delay: WISK_DELAY,
        }}
        className="mt-2 bg-gradient-to-r from-wisk-purple to-wisk-teal bg-clip-text text-2xl font-bold tracking-[0.28em] text-transparent uppercase sm:text-3xl"
      >
        WISK
      </motion.div>
    </div>
  );
}
