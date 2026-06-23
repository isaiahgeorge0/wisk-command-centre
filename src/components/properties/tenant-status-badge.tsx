import { Badge } from "@/components/ui/badge";
import {
  TENANT_STATUS_BADGE_CLASS,
  TENANT_STATUSES,
} from "@/lib/properties/constants";
import { getTenantStatusDisplayName } from "@/lib/properties/display-names";
import type { TenantStatus } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

export function TenantStatusBadge({
  status,
  className,
}: {
  status: string | null;
  className?: string;
}) {
  const normalized =
    status && TENANT_STATUSES.includes(status as TenantStatus)
      ? (status as TenantStatus)
      : "active";

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        TENANT_STATUS_BADGE_CLASS[normalized],
        className
      )}
    >
      {getTenantStatusDisplayName(normalized)}
    </Badge>
  );
}
