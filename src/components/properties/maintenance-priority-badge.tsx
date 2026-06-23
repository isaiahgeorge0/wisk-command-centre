import { Badge } from "@/components/ui/badge";
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_PRIORITY_BADGE_CLASS,
} from "@/lib/properties/constants";
import { getMaintenancePriorityDisplayName } from "@/lib/properties/display-names";
import type { MaintenancePriority } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

export function MaintenancePriorityBadge({
  priority,
  className,
}: {
  priority: string | null;
  className?: string;
}) {
  const normalized =
    priority && MAINTENANCE_PRIORITIES.includes(priority as MaintenancePriority)
      ? (priority as MaintenancePriority)
      : "medium";

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        MAINTENANCE_PRIORITY_BADGE_CLASS[normalized],
        className
      )}
    >
      {getMaintenancePriorityDisplayName(normalized)}
    </Badge>
  );
}
