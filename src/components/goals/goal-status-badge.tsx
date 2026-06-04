import { Badge } from "@/components/ui/badge";
import {
  GOAL_STATUS_BADGE_CLASS,
  GOAL_STATUS_LABELS,
} from "@/lib/goals/constants";
import type { GoalStatus } from "@/lib/goals/types";
import { GOAL_STATUSES } from "@/lib/goals/types";
import { cn } from "@/lib/utils";

function normalizeStatus(status: string | null): GoalStatus {
  if (status && GOAL_STATUSES.includes(status as GoalStatus)) {
    return status as GoalStatus;
  }
  return "active";
}

export function GoalStatusBadge({
  status,
  className,
}: {
  status: string | null;
  className?: string;
}) {
  const normalized = normalizeStatus(status);

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        GOAL_STATUS_BADGE_CLASS[normalized],
        className
      )}
    >
      {GOAL_STATUS_LABELS[normalized]}
    </Badge>
  );
}
