"use client";

import { motion, useReducedMotion } from "framer-motion";

import {
  getTaskCompletionPercent,
  getTaskProgressTone,
  TASK_PROGRESS_FILL_CLASS,
} from "@/lib/projects/progress";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import { cn } from "@/lib/utils";

type ProjectTaskProgressBarProps = {
  completed: number;
  total: number;
  compact?: boolean;
  className?: string;
};

export function ProjectTaskProgressBar({
  completed,
  total,
  compact = false,
  className,
}: ProjectTaskProgressBarProps) {
  const reduced = useReducedMotion();
  const { progressTransition } = useMotionSafe();
  const percent = getTaskCompletionPercent(completed, total);
  const tone = getTaskProgressTone(percent);

  return (
    <div className={cn(compact ? "space-y-1" : "space-y-1.5", className)}>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/60 md:h-2.5">
        <motion.div
          className={cn("h-full rounded-full", TASK_PROGRESS_FILL_CLASS[tone])}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={progressTransition}
        />
      </div>
      {!compact ? (
        <div className="flex items-center justify-between text-xs">
          <span className="text-xs uppercase tracking-wide text-muted-foreground/70">
            Tasks
          </span>
          <span className="text-xs font-bold tabular-nums text-foreground">
            {completed}/{total}
            <span className="ml-1 font-normal text-muted-foreground">
              · {percent}%
            </span>
          </span>
        </div>
      ) : (
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {completed}/{total} tasks · {percent}%
        </p>
      )}
    </div>
  );
}
