import { Badge } from "@/components/ui/badge";
import {
  PROPERTY_STATUS_BADGE_CLASS,
  PROPERTY_STATUSES,
} from "@/lib/properties/constants";
import { getPropertyStatusDisplayName } from "@/lib/properties/display-names";
import type { PropertyStatus } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

function normalizeStatus(status: string | null): PropertyStatus {
  if (status && PROPERTY_STATUSES.includes(status as PropertyStatus)) {
    return status as PropertyStatus;
  }
  return "vacant";
}

export function PropertyStatusBadge({
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
        PROPERTY_STATUS_BADGE_CLASS[normalized],
        className
      )}
    >
      {getPropertyStatusDisplayName(normalized)}
    </Badge>
  );
}
