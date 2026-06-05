"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useSpotlightTour } from "@/components/spotlight-tour/spotlight-tour-context";
import { Button } from "@/components/ui/button";
import { MOTION_DURATION } from "@/lib/motion/config";

const SPOTLIGHT_PADDING = 8;
const TOUR_LAYER_CLASS = "spotlight-tour-target";
const LARGE_JUMP_THRESHOLD_PX = 200;
const TOOLTIP_FADE_OUT_MS = 100;
const TOOLTIP_SETTLE_DELAY_MS = 300;

const SPRING_DEFAULT = { type: "spring" as const, stiffness: 300, damping: 30 };
const SPRING_SOFT = { type: "spring" as const, stiffness: 250, damping: 28 };

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type TooltipPhase = "visible" | "exiting" | "hidden" | "entering";

type SpringTransition =
  | typeof SPRING_DEFAULT
  | typeof SPRING_SOFT
  | { duration: number };

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

function rectCenter(rect: TargetRect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function centerDistance(from: TargetRect, to: TargetRect): number {
  const a = rectCenter(from);
  const b = rectCenter(to);
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getSpringTransition(
  from: TargetRect | null,
  to: TargetRect,
  reduced: boolean
): SpringTransition {
  if (reduced) {
    return { duration: 0 };
  }
  if (from && centerDistance(from, to) > LARGE_JUMP_THRESHOLD_PX) {
    return SPRING_SOFT;
  }
  return SPRING_DEFAULT;
}

function toRingBounds(rect: TargetRect) {
  const diameter = Math.max(rect.width, rect.height);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return {
    left: centerX - diameter / 2,
    top: centerY - diameter / 2,
    width: diameter,
    height: diameter,
  };
}

function getPanelDimensions(rect: TargetRect, viewportWidth: number, viewportHeight: number) {
  const bottom = rect.top + rect.height;
  const right = rect.left + rect.width;

  return {
    top: { height: Math.max(0, rect.top) },
    left: {
      top: rect.top,
      width: Math.max(0, rect.left),
      height: rect.height,
    },
    right: {
      top: rect.top,
      left: right,
      width: Math.max(0, viewportWidth - right),
      height: rect.height,
    },
    bottom: {
      top: bottom,
      height: Math.max(0, viewportHeight - bottom),
    },
  };
}

function AnimatedSpotlightPanels({
  rect,
  viewportWidth,
  viewportHeight,
  transition,
}: {
  rect: TargetRect;
  viewportWidth: number;
  viewportHeight: number;
  transition: SpringTransition;
}) {
  const panels = getPanelDimensions(rect, viewportWidth, viewportHeight);
  const panelClassName = "fixed bg-black/50";

  return (
    <>
      <motion.div
        className={panelClassName}
        style={{ top: 0, left: 0, right: 0 }}
        animate={panels.top}
        transition={transition}
        aria-hidden
      />
      <motion.div
        className={panelClassName}
        style={{ left: 0 }}
        animate={panels.left}
        transition={transition}
        aria-hidden
      />
      <motion.div
        className={panelClassName}
        animate={panels.right}
        transition={transition}
        aria-hidden
      />
      <motion.div
        className={panelClassName}
        style={{ left: 0, right: 0 }}
        animate={panels.bottom}
        transition={transition}
        aria-hidden
      />
    </>
  );
}

function AnimatedFocusRing({
  rect,
  transition,
  pulse,
  entrance,
}: {
  rect: TargetRect;
  transition: SpringTransition;
  pulse: boolean;
  entrance: boolean;
}) {
  const reduced = useReducedMotion();
  const ring = toRingBounds(rect);

  return (
    <motion.div
      className="pointer-events-none fixed rounded-full border-2 border-wisk-teal/80 shadow-[0_0_24px_rgba(45,212,191,0.35)]"
      animate={ring}
      transition={transition}
      aria-hidden
    >
      <motion.div
        className="size-full rounded-full"
        initial={entrance && !reduced ? { scale: 0.8, opacity: 0 } : false}
        animate={
          reduced
            ? { opacity: 1, scale: 1 }
            : pulse
              ? { scale: [1, 1.03, 1], opacity: 1 }
              : { scale: 1, opacity: 1 }
        }
        transition={
          reduced
            ? { duration: 0 }
            : entrance
              ? {
                  scale: {
                    duration: TOOLTIP_SETTLE_DELAY_MS / 1000,
                    ease: [0.22, 1, 0.36, 1],
                  },
                  opacity: {
                    duration: TOOLTIP_SETTLE_DELAY_MS / 1000,
                    ease: "easeOut",
                  },
                }
              : pulse
                ? {
                    scale: {
                      duration: 1.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }
                : { duration: 0 }
        }
      />
    </motion.div>
  );
}

function SpotlightTooltip({
  rect,
  phase,
  stepIndex,
  stepCount,
  title,
  body,
  cta,
  onAction,
  onSkip,
}: {
  rect: TargetRect;
  phase: TooltipPhase;
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

  const isInteractive = phase === "visible" || phase === "entering";

  return (
    <motion.div
      className="fixed z-[202] w-[min(calc(100vw-2rem),22rem)] rounded-xl border border-border/60 bg-surface p-4 shadow-2xl"
      style={{
        ...tooltipStyle,
        pointerEvents: isInteractive ? "auto" : "none",
      }}
      animate={{ opacity: phase === "visible" || phase === "entering" ? 1 : 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : phase === "exiting"
            ? { duration: TOOLTIP_FADE_OUT_MS / 1000, ease: "easeOut" }
            : phase === "entering"
              ? {
                  duration: MOTION_DURATION.fast,
                  delay: TOOLTIP_SETTLE_DELAY_MS / 1000,
                  ease: "easeOut",
                }
              : { duration: 0 }
      }
      role="dialog"
      aria-label={title}
      aria-hidden={!isInteractive}
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
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [renderRect, setRenderRect] = useState<TargetRect | null>(null);
  const [springTransition, setSpringTransition] = useState<SpringTransition>(
    reduced ? { duration: 0 } : SPRING_DEFAULT
  );
  const [tooltipPhase, setTooltipPhase] = useState<TooltipPhase>("hidden");
  const [displayedStep, setDisplayedStep] = useState(step);
  const [showRingEntrance, setShowRingEntrance] = useState(true);

  const previousRectRef = useRef<TargetRect | null>(null);
  const previousStepIndexRef = useRef<number | null>(null);
  const tooltipTimerRef = useRef<number | null>(null);

  const clearTooltipTimer = useCallback(() => {
    if (tooltipTimerRef.current !== null) {
      window.clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
  }, []);

  const scheduleTooltipReveal = useCallback(() => {
    clearTooltipTimer();
    if (reduced) {
      setTooltipPhase("visible");
      return;
    }
    setTooltipPhase("entering");
    tooltipTimerRef.current = window.setTimeout(() => {
      setTooltipPhase("visible");
      tooltipTimerRef.current = null;
    }, TOOLTIP_SETTLE_DELAY_MS + MOTION_DURATION.fast * 1000);
  }, [clearTooltipTimer, reduced]);

  const applyMeasuredRect = useCallback(
    (nextRect: TargetRect) => {
      setSpringTransition(
        getSpringTransition(previousRectRef.current, nextRect, !!reduced)
      );
      previousRectRef.current = nextRect;
      setRenderRect(nextRect);
    },
    [reduced]
  );

  const updateRect = useCallback(() => {
    if (!step?.target) {
      return;
    }
    const measured = measureTarget(step.target);
    if (measured) {
      applyMeasuredRect(measured);
    }
  }, [applyMeasuredRect, step?.target]);

  useEffect(() => {
    setMounted(true);
    setViewportSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEffect(() => {
    if (!isActive || !step) {
      clearTooltipTimer();
      setRenderRect(null);
      setTooltipPhase("hidden");
      previousRectRef.current = null;
      previousStepIndexRef.current = null;
      setShowRingEntrance(true);
      return;
    }

    updateRect();

    const retryTimers = [50, 150, 300, 500].map((delay) =>
      window.setTimeout(updateRect, delay)
    );

    const handleViewportChange = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      updateRect();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [clearTooltipTimer, isActive, step, stepIndex, updateRect]);

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
    if (!isActive) return;

    if (isTransitioning) {
      setTooltipPhase("exiting");
    }
  }, [isActive, isTransitioning]);

  useEffect(() => {
    if (!isActive || isTransitioning) return;

    if (tooltipPhase === "exiting") {
      setTooltipPhase("hidden");
    }
  }, [isActive, isTransitioning, tooltipPhase]);

  useEffect(() => {
    if (!isActive || !step || !renderRect) return;

    const isFirstStep = previousStepIndexRef.current === null;
    const stepChanged =
      previousStepIndexRef.current !== null &&
      previousStepIndexRef.current !== stepIndex;

    previousStepIndexRef.current = stepIndex;

    if (stepChanged) {
      setShowRingEntrance(false);
    }

    if (isFirstStep || stepChanged) {
      scheduleTooltipReveal();
    }
  }, [isActive, renderRect, scheduleTooltipReveal, step, stepIndex]);

  useEffect(() => {
    if (tooltipPhase === "hidden" || tooltipPhase === "entering") {
      setDisplayedStep(step);
    }
  }, [step, tooltipPhase]);

  useEffect(() => {
    if (!isActive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isActive]);

  useEffect(() => {
    return () => clearTooltipTimer();
  }, [clearTooltipTimer]);

  if (!mounted || !isActive || !step || !renderRect || viewportSize.width === 0) {
    return null;
  }

  const tooltipStep = displayedStep ?? step;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[200]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : MOTION_DURATION.fast }}
    >
      <AnimatedSpotlightPanels
        rect={renderRect}
        viewportWidth={viewportSize.width}
        viewportHeight={viewportSize.height}
        transition={springTransition}
      />
      <AnimatedFocusRing
        rect={renderRect}
        transition={springTransition}
        pulse={tooltipPhase === "visible"}
        entrance={showRingEntrance}
      />
      <SpotlightTooltip
        rect={renderRect}
        phase={tooltipPhase}
        stepIndex={stepIndex}
        stepCount={stepCount}
        title={tooltipStep.title}
        body={tooltipStep.body}
        cta={tooltipStep.cta}
        onAction={handleStepAction}
        onSkip={() => {
          void skipTour();
        }}
      />
    </motion.div>,
    document.body
  );
}
