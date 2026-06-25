import { Badge } from "@/components/ui/badge";
import { MAINTENANCE_STATUSES } from "@/lib/properties/constants";
import { getMaintenanceStatusDisplayName } from "@/lib/properties/display-names";
import type { MaintenanceStatus } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

const MAINTENANCE_STATUS_BADGE_CLASS: Record<MaintenanceStatus, string> = {
  new: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  in_progress:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  resolved:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export function MaintenanceStatusBadge({
  status,
  className,
}: {
  status: string | null;
  className?: string;
}) {
  const normalized =
    status && MAINTENANCE_STATUSES.includes(status as MaintenanceStatus)
      ? (status as MaintenanceStatus)
      : "new";

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        MAINTENANCE_STATUS_BADGE_CLASS[normalized],
        className
      )}
    >
      {getMaintenanceStatusDisplayName(normalized)}
    </Badge>
  );
}
