import { Badge } from "@/components/ui/badge";
import {
  IDEA_STATUS_BADGE_CLASS,
  IDEA_STATUS_LABELS,
} from "@/lib/ideas/constants";
import type { IdeaStatus } from "@/lib/ideas/types";
import { IDEA_STATUSES } from "@/lib/ideas/types";
import { cn } from "@/lib/utils";

function normalizeStatus(status: string | null): IdeaStatus {
  if (status && IDEA_STATUSES.includes(status as IdeaStatus)) {
    return status as IdeaStatus;
  }
  return "new";
}

export function IdeaStatusBadge({
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
        IDEA_STATUS_BADGE_CLASS[normalized],
        className
      )}
    >
      {IDEA_STATUS_LABELS[normalized]}
    </Badge>
  );
}
