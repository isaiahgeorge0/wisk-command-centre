import type { TenantReliabilityScore } from "@/lib/properties/reliability";
import { cn } from "@/lib/utils";

type TenantReliabilityBadgeProps = {
  score: TenantReliabilityScore;
  size?: "sm" | "md";
};

const GRADE_STYLES = {
  A: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  B: "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20",
  C: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  D: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
  F: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
} as const;

const NO_HISTORY_STYLES =
  "text-muted-foreground bg-muted/40 border-border/60";

export function TenantReliabilityBadge({
  score,
  size = "md",
}: TenantReliabilityBadgeProps) {
  const isNoHistory = score.totalPayments === 0;
  const styles = isNoHistory ? NO_HISTORY_STYLES : GRADE_STYLES[score.grade];

  if (size === "sm") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-lg border px-2 py-0.5",
          styles
        )}
      >
        <span className="text-xs font-bold">
          {isNoHistory ? "—" : score.grade}
        </span>
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex flex-col rounded-xl border px-3 py-1.5",
        styles
      )}
    >
      <div className="flex items-baseline">
        <span className="text-sm font-bold">
          {isNoHistory ? "—" : score.grade}
        </span>
        {!isNoHistory ? (
          <span className="ml-1 text-xs opacity-70">{score.score}</span>
        ) : null}
      </div>
      <span className="mt-0.5 text-xs text-muted-foreground">{score.label}</span>
    </div>
  );
}
