import { calculateLeadScore } from "@/lib/leads/scoring";
import { cn } from "@/lib/utils";

const GRADE_STYLES = {
  A: "border-emerald-500/30 bg-emerald-500/15 text-emerald-500",
  B: "border-orange-500/30 bg-orange-500/15 text-orange-400",
  C: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  D: "border-border/60 bg-muted/40 text-muted-foreground",
};

const GRADE_DOT = {
  A: "bg-emerald-500",
  B: "bg-orange-500",
  C: "bg-amber-500",
  D: "bg-muted-foreground",
};

type LeadScoreBadgeProps = {
  lead: Parameters<typeof calculateLeadScore>[0];
  size?: "sm" | "md";
};

export function LeadScoreBadge({
  lead,
  size = "md",
}: LeadScoreBadgeProps) {
  const score = calculateLeadScore(lead);

  if (size === "sm") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold",
          GRADE_STYLES[score.grade]
        )}
        title={`Lead score: ${score.score}/100 (${score.label})`}
      >
        <span className={cn("size-1.5 rounded-full", GRADE_DOT[score.grade])} />
        {score.grade}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        GRADE_STYLES[score.grade]
      )}
      title={`Lead score: ${score.score}/100`}
    >
      <span
        className={cn("size-2 shrink-0 rounded-full", GRADE_DOT[score.grade])}
      />
      {score.label}
      <span className="font-normal opacity-70">{score.score}</span>
    </span>
  );
}
