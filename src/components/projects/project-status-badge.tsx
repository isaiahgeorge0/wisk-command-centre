import { Badge } from "@/components/ui/badge";
import {
  PROJECT_STATUS_BADGE_CLASS,
  PROJECT_STATUS_LABELS,
} from "@/lib/projects/constants";
import type { ProjectStatus } from "@/lib/projects/types";
import { PROJECT_STATUSES } from "@/lib/projects/types";
import { cn } from "@/lib/utils";

function normalizeStatus(status: string | null): ProjectStatus {
  if (status && PROJECT_STATUSES.includes(status as ProjectStatus)) {
    return status as ProjectStatus;
  }
  return "active";
}

export function ProjectStatusBadge({
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
        PROJECT_STATUS_BADGE_CLASS[normalized],
        className
      )}
    >
      {PROJECT_STATUS_LABELS[normalized]}
    </Badge>
  );
}
