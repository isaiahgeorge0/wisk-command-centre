import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function MaintenanceTenantReportedBadge({
  className,
}: {
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-amber-500/30 bg-amber-500/10 font-medium text-amber-700 dark:text-amber-300",
        className
      )}
    >
      Tenant reported
    </Badge>
  );
}
