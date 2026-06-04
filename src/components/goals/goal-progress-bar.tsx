"use client";

import {
  PROGRESS_BAR_FILL_CLASS,
} from "@/lib/goals/constants";
import {
  getProgressPercent,
  getProgressTone,
} from "@/lib/goals/format";
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
  const percent = getProgressPercent(current, target);
  const tone = getProgressTone(percent);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "relative h-2.5 w-full overflow-hidden rounded-full bg-muted/80",
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
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            PROGRESS_BAR_FILL_CLASS[tone]
          )}
          style={{ width: `${percent}%` }}
        />
        {percent > 12 ? (
          <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-semibold text-white/95 drop-shadow-sm">
            {percent}%
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium tabular-nums text-foreground">{percent}%</span>
      </div>
    </div>
  );
}

export function useGoalProgress(current: number, target: number | null) {
  const percent = getProgressPercent(current, target);
  const tone = getProgressTone(percent);
  return { percent, tone };
}
