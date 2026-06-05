"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { OnboardingWelcomeSpiral } from "@/components/onboarding/onboarding-welcome-spiral";
import { MOTION_EASE } from "@/lib/motion/config";

const SPIRAL_MS = 1200;
const BURST_MS = 250;
const WORDMARK_MS = 400;
const TAGLINE_START_MS = 1800;
const TAGLINE_MS = 300;
const BUTTON_REVEAL_START_MS = 2100;

const TAGLINE = "Your business. Centralised.";

type OnboardingWelcomeIntroProps = {
  onIntroComplete: () => void;
};

export function OnboardingWelcomeIntro({
  onIntroComplete,
}: OnboardingWelcomeIntroProps) {
  const reduced = useReducedMotion();
  const [showSpiral, setShowSpiral] = useState(!reduced);
  const [showBurst, setShowBurst] = useState(false);
  const [showWordmark, setShowWordmark] = useState(!!reduced);
  const [showTagline, setShowTagline] = useState(!!reduced);

  useEffect(() => {
    if (reduced) {
      const timer = window.setTimeout(onIntroComplete, TAGLINE_MS);
      return () => window.clearTimeout(timer);
    }

    const burstTimer = window.setTimeout(() => {
      setShowSpiral(false);
      setShowBurst(true);
    }, SPIRAL_MS);

    const wordmarkTimer = window.setTimeout(() => {
      setShowBurst(false);
      setShowWordmark(true);
    }, SPIRAL_MS + BURST_MS);

    const taglineTimer = window.setTimeout(() => {
      setShowTagline(true);
    }, TAGLINE_START_MS);

    const completeTimer = window.setTimeout(() => {
      onIntroComplete();
    }, BUTTON_REVEAL_START_MS);

    return () => {
      window.clearTimeout(burstTimer);
      window.clearTimeout(wordmarkTimer);
      window.clearTimeout(taglineTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onIntroComplete, reduced]);

  if (reduced) {
    return (
      <div className="relative flex min-h-[22rem] flex-col items-center justify-center bg-surface px-6 py-10 text-center sm:px-10 sm:py-12">
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: TAGLINE_MS / 1000, ease: MOTION_EASE.smooth }}
        >
          <Wordmark />
          <Tagline visible />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[22rem] flex-col items-center justify-center overflow-hidden bg-surface px-6 py-10 text-center sm:px-10 sm:py-12">
      <OnboardingWelcomeSpiral active={showSpiral} />

      {showBurst ? <CenterBurst /> : null}

      <div className="relative z-10 flex flex-col items-center">
        {showWordmark ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: WORDMARK_MS / 1000,
              ease: MOTION_EASE.easeOut,
            }}
          >
            <Wordmark />
          </motion.div>
        ) : (
          <div className="invisible" aria-hidden>
            <Wordmark />
          </div>
        )}

        {showTagline ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: TAGLINE_MS / 1000,
              ease: MOTION_EASE.smooth,
            }}
          >
            <Tagline visible />
          </motion.div>
        ) : (
          <div className="invisible" aria-hidden>
            <Tagline visible={false} />
          </div>
        )}
      </div>
    </div>
  );
}

function Wordmark() {
  return (
    <span className="bg-gradient-to-r from-wisk-purple to-wisk-teal bg-clip-text text-3xl font-bold tracking-[0.22em] text-transparent uppercase sm:text-4xl">
      WISK
    </span>
  );
}

function Tagline({ visible }: { visible: boolean }) {
  return (
    <p
      className="mt-8 max-w-sm text-lg font-medium tracking-tight text-foreground sm:text-xl"
      aria-hidden={!visible}
    >
      {TAGLINE}
    </p>
  );
}

function CenterBurst() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden
    >
      <motion.div
        className="absolute size-16 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(29,158,117,0.75) 35%, rgba(127,119,221,0.35) 55%, transparent 72%)",
        }}
        initial={{ scale: 0.15, opacity: 0 }}
        animate={{ scale: [0.15, 1, 1.6], opacity: [0, 1, 0] }}
        transition={{
          duration: BURST_MS / 1000,
          ease: [0.22, 1, 0.36, 1],
          times: [0, 0.35, 1],
        }}
      />

      {[0, 1, 2].map((ring) => (
        <motion.div
          key={ring}
          className="absolute size-20 rounded-full border border-white/70"
          style={{
            boxShadow: "0 0 12px rgba(29,158,117,0.45)",
          }}
          initial={{ scale: 0.2, opacity: 0.9 }}
          animate={{ scale: 2.8 + ring * 0.4, opacity: 0 }}
          transition={{
            duration: BURST_MS / 1000,
            delay: ring * 0.04,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}

      <motion.div
        className="absolute size-24 rounded-full"
        style={{
          background:
            "radial-gradient(circle, transparent 55%, rgba(29,158,117,0.25) 70%, transparent 85%)",
        }}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 3.2, opacity: [0, 0.7, 0] }}
        transition={{
          duration: BURST_MS / 1000,
          delay: 0.03,
          ease: [0.22, 1, 0.36, 1],
          times: [0, 0.4, 1],
        }}
      />
    </div>
  );
}
