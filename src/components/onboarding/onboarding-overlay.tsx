"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { useOnboarding } from "@/components/onboarding/onboarding-context";
import { OnboardingProgressDots } from "@/components/onboarding/onboarding-progress-dots";
import { OnboardingSlideContent } from "@/components/onboarding/onboarding-slide-content";
import { Button } from "@/components/ui/button";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import {
  ONBOARDING_SLIDES,
  ONBOARDING_SLIDE_COUNT,
} from "@/lib/onboarding/slides";

export function OnboardingOverlay() {
  const reduced = useReducedMotion();
  const {
    isOpen,
    currentSlide,
    direction,
    nextSlide,
    prevSlide,
    complete,
  } = useOnboarding();

  const slide = ONBOARDING_SLIDES[currentSlide];
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === ONBOARDING_SLIDE_COUNT - 1;
  const showSkip = currentSlide >= 1 && !isLast;
  const [welcomeIntroComplete, setWelcomeIntroComplete] = useState(false);

  const handleWelcomeIntroComplete = useCallback(() => {
    setWelcomeIntroComplete(true);
  }, []);

  useEffect(() => {
    if (isOpen && isFirst) {
      setWelcomeIntroComplete(false);
    }
  }, [isOpen, isFirst, currentSlide]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handlePrimary = async () => {
    if (isLast) {
      await complete();
      return;
    }
    nextSlide();
  };

  const handleSkip = async () => {
    await complete();
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: reduced ? 0 : dir > 0 ? 48 : -48,
      opacity: reduced ? 1 : 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: reduced ? 0 : dir > 0 ? -48 : 48,
      opacity: reduced ? 1 : 0,
    }),
  };

  const primaryLabel =
    slide.primaryCta ??
    (isLast ? "Let's go →" : isFirst ? "Get started →" : "Next");

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="onboarding-overlay"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MOTION_DURATION.normal }}
          role="dialog"
          aria-modal="true"
          aria-label="App walkthrough"
        >
          <div className="relative flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-surface shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border/40 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
              <div className="w-16" />
              <OnboardingProgressDots current={currentSlide} />
              <div className="flex w-16 justify-end">
                {showSkip ? (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Skip
                  </button>
                ) : null}
              </div>
            </div>

            <div className="relative min-h-[22rem] flex-1 overflow-hidden">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={slide.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    duration: reduced ? 0 : MOTION_DURATION.normal,
                    ease: MOTION_EASE.smooth,
                  }}
                  className="absolute inset-0"
                >
                  <OnboardingSlideContent
                    slide={slide}
                    onWelcomeIntroComplete={
                      isFirst ? handleWelcomeIntroComplete : undefined
                    }
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <div
              className="flex items-center justify-between gap-3 border-t border-border/40 px-4 py-4 sm:px-6"
              style={{
                paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
              }}
            >
              {!isFirst ? (
                <Button type="button" variant="ghost" size="sm" onClick={prevSlide}>
                  Back
                </Button>
              ) : (
                <span />
              )}

              <div className="flex flex-col items-end gap-2 sm:flex-row">
                {isLast && slide.secondaryCta ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={complete}
                  >
                    {slide.secondaryCta}
                  </Button>
                ) : null}
                {isFirst && !welcomeIntroComplete ? (
                  <span className="inline-flex h-8 min-w-[7.5rem]" aria-hidden />
                ) : (
                  <motion.div
                    initial={
                      isFirst && welcomeIntroComplete
                        ? { opacity: 0, y: 8 }
                        : false
                    }
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: MOTION_DURATION.normal,
                      ease: MOTION_EASE.smooth,
                    }}
                  >
                    <Button type="button" size="sm" onClick={handlePrimary}>
                      {primaryLabel}
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
