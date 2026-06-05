"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useSpotlightTour } from "@/components/spotlight-tour/spotlight-tour-context";
import { Button } from "@/components/ui/button";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";

const SPOTLIGHT_PADDING = 8;
const RING_SETTLE_MS = 300;
const TOUR_LAYER_CLASS = "spotlight-tour-target";

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function measureTarget(selector: string): TargetRect | null {
  const element = document.querySelector(`[data-tour="${selector}"]`);
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  return {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };
}

function SpotlightPanels({ rect }: { rect: TargetRect }) {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
  const bottom = rect.top + rect.height;
  const right = rect.left + rect.width;

  const panelClassName = "fixed bg-black/50";

  return (
    <>
      <div
        className={panelClassName}
        style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }}
        aria-hidden
      />
      <div
        className={panelClassName}
        style={{
          top: rect.top,
          left: 0,
          width: Math.max(0, rect.left),
          height: rect.height,
        }}
        aria-hidden
      />
      <div
        className={panelClassName}
        style={{
          top: rect.top,
          left: right,
          width: Math.max(0, viewportWidth - right),
          height: rect.height,
        }}
        aria-hidden
      />
      <div
        className={panelClassName}
        style={{
          top: bottom,
          left: 0,
          right: 0,
          height: Math.max(0, viewportHeight - bottom),
        }}
        aria-hidden
      />
    </>
  );
}

function FocusRing({
  rect,
  visible,
  pulse,
}: {
  rect: TargetRect;
  visible: boolean;
  pulse: boolean;
}) {
  const reduced = useReducedMotion();
  const diameter = Math.max(rect.width, rect.height);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  if (!visible) return null;

  return (
    <motion.div
      className="pointer-events-none fixed rounded-full border-2 border-wisk-teal/80 shadow-[0_0_24px_rgba(45,212,191,0.35)]"
      style={{
        width: diameter,
        height: diameter,
        left: centerX - diameter / 2,
        top: centerY - diameter / 2,
      }}
      initial={reduced ? false : { scale: 0.8, opacity: 0 }}
      animate={
        reduced
          ? { opacity: 1 }
          : pulse
            ? {
                scale: [1, 1.03, 1],
                opacity: 1,
              }
            : {
                scale: [0.8, 1, 1.03, 1],
                opacity: 1,
              }
      }
      transition={
        reduced
          ? { duration: 0 }
          : pulse
            ? {
                scale: {
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                opacity: {
                  duration: RING_SETTLE_MS / 1000,
                  ease: "easeOut",
                },
              }
            : {
                scale: {
                  duration: RING_SETTLE_MS / 1000,
                  ease: MOTION_EASE.easeOut,
                  times: [0, 0.7, 0.85, 1],
                },
                opacity: {
                  duration: RING_SETTLE_MS / 1000,
                  ease: "easeOut",
                },
              }
      }
      aria-hidden
    />
  );
}

function SpotlightTooltip({
  rect,
  visible,
  stepIndex,
  stepCount,
  title,
  body,
  cta,
  onAction,
  onSkip,
}: {
  rect: TargetRect;
  visible: boolean;
  stepIndex: number;
  stepCount: number;
  title: string;
  body: string;
  cta: string;
  onAction: () => void;
  onSkip: () => void;
}) {
  const reduced = useReducedMotion();
  const [placement, setPlacement] = useState<"below" | "above">("below");

  useEffect(() => {
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - (rect.top + rect.height);
    setPlacement(spaceBelow < 220 ? "above" : "below");
  }, [rect]);

  const tooltipStyle =
    placement === "below"
      ? {
          top: rect.top + rect.height + 16,
          left: "50%" as const,
          transform: "translateX(-50%)",
        }
      : {
          bottom: window.innerHeight - rect.top + 16,
          left: "50%" as const,
          transform: "translateX(-50%)",
        };

  if (!visible) return null;

  return (
    <motion.div
      className="fixed z-[202] w-[min(calc(100vw-2rem),22rem)] rounded-xl border border-border/60 bg-surface p-4 shadow-2xl"
      style={tooltipStyle}
      initial={reduced ? false : { opacity: 0, y: placement === "below" ? 10 : -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0 : MOTION_DURATION.normal,
        delay: reduced ? 0 : RING_SETTLE_MS / 1000,
        ease: MOTION_EASE.smooth,
      }}
      role="dialog"
      aria-label={title}
    >
      <p className="text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {stepIndex + 1} of {stepCount}
      </p>
      <h3 className="mt-2 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>

      <div className="mt-4 flex flex-col gap-3">
        <Button type="button" size="sm" className="w-full" onClick={onAction}>
          {cta}
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip tour
        </button>
      </div>
    </motion.div>
  );
}

export function SpotlightTourOverlay() {
  const reduced = useReducedMotion();
  const {
    isActive,
    step,
    stepIndex,
    stepCount,
    isTransitioning,
    handleStepAction,
    skipTour,
  } = useSpotlightTour();

  const [mounted, setMounted] = useState(false);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [ringVisible, setRingVisible] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const updateRect = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }
    setTargetRect(measureTarget(step.target));
  }, [step?.target]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isActive || !step) {
      setTargetRect(null);
      setRingVisible(false);
      setTooltipVisible(false);
      return;
    }

    updateRect();

    const retryTimers = [50, 150, 300, 500].map((delay) =>
      window.setTimeout(updateRect, delay)
    );

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isActive, step, stepIndex, updateRect]);

  useEffect(() => {
    if (!isActive || !step) return;

    const element = document.querySelector(`[data-tour="${step.target}"]`);
    if (!(element instanceof HTMLElement)) return;

    element.classList.add("relative", "z-[201]", TOUR_LAYER_CLASS);

    const observer = new ResizeObserver(updateRect);
    observer.observe(element);

    return () => {
      element.classList.remove("relative", "z-[201]", TOUR_LAYER_CLASS);
      observer.disconnect();
    };
  }, [isActive, step, stepIndex, updateRect]);

  useEffect(() => {
    if (!isActive || isTransitioning || !targetRect) {
      setRingVisible(false);
      setTooltipVisible(false);
      return;
    }

    setRingVisible(true);
    const timer = window.setTimeout(() => {
      setTooltipVisible(true);
    }, reduced ? 0 : RING_SETTLE_MS);

    return () => window.clearTimeout(timer);
  }, [isActive, isTransitioning, reduced, stepIndex, targetRect]);

  useEffect(() => {
    if (!isActive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isActive]);

  if (!mounted || !isActive || !step) {
    return null;
  }

  return createPortal(
    <AnimatePresence mode="wait">
      {targetRect ? (
        <motion.div
          key={stepIndex}
          className="fixed inset-0 z-[200]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : MOTION_DURATION.fast }}
        >
          <SpotlightPanels rect={targetRect} />
          <FocusRing rect={targetRect} visible={ringVisible} pulse={tooltipVisible} />
          <SpotlightTooltip
            rect={targetRect}
            visible={tooltipVisible}
            stepIndex={stepIndex}
            stepCount={stepCount}
            title={step.title}
            body={step.body}
            cta={step.cta}
            onAction={handleStepAction}
            onSkip={() => {
              void skipTour();
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
