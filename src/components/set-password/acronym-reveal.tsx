"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

type AcronymRevealProps = {
  onComplete: () => void;
};

const WORDS = [
  { letter: "W", word: "Wisdom", color: "text-[#c3ff32]" },
  { letter: "I", word: "Integrity", color: "text-[#7c9ef0]" },
  { letter: "S", word: "Strength", color: "text-[#4fb8b0]" },
  { letter: "K", word: "Knowledge", color: "text-[#016c81]" },
];

const WORD_DELAY = 0.3;
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
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background px-6">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.55 0.14 300 / 0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 100%, oklch(0.65 0.1 180 / 0.06), transparent 50%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <div className="flex flex-col gap-5 sm:gap-6">
          {WORDS.map(({ letter, word, color }, i) => (
            <motion.div
              key={letter}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                ease: [0.25, 0.1, 0.25, 1],
                delay: i * WORD_DELAY,
              }}
              className="flex items-center gap-4"
            >
              <span
                className={`w-8 shrink-0 text-center text-3xl font-bold sm:text-4xl ${color}`}
              >
                {letter}
              </span>
              <span className="text-2xl font-medium text-foreground">{word}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: [0.25, 0.1, 0.25, 1],
            delay: WISK_DELAY,
          }}
          className="mt-8 bg-wisk-lime bg-clip-text text-5xl font-bold tracking-widest text-transparent uppercase"
        >
          WISK
        </motion.div>
      </div>
    </div>
  );
}
