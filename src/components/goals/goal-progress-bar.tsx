"use client";

import { motion, useReducedMotion } from "framer-motion";

import {
  PROGRESS_BAR_FILL_CLASS,
} from "@/lib/goals/constants";
import {
  getProgressPercent,
  getProgressTone,
} from "@/lib/goals/format";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import { cn } from "@/lib/utils";

type GoalProgressBarProps = {
  current: number;
  target: number | null;
  className?: string;
  onClick?: () => void;
};

export function GoalProgressBar({
  current,
  target,
  className,
  onClick,
}: GoalProgressBarProps) {
  const reduced = useReducedMotion();
  const { progressTransition } = useMotionSafe();
  const percent = getProgressPercent(current, target);
  const tone = getProgressTone(percent);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "relative h-3 w-full overflow-hidden rounded-full bg-muted/60",
          onClick && "cursor-pointer"
        )}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={onClick ? `Update progress, currently ${percent}%` : undefined}
      >
        <motion.div
          className={cn(
            "h-full rounded-full",
            PROGRESS_BAR_FILL_CLASS[tone]
          )}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={progressTransition}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
          {current} of {target ?? "—"}
        </span>
      </div>
    </div>
  );
}

export function useGoalProgress(current: number, target: number | null) {
  const percent = getProgressPercent(current, target);
  const tone = getProgressTone(percent);
  return { percent, tone };
}
