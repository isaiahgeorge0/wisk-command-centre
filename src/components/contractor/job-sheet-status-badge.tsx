import { Badge } from "@/components/ui/badge";
import {
  formatAccessRequestStatus,
  formatJobSheetStatus,
} from "@/lib/properties/contractor-display";
import type { JobSheetStatus } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

const JOB_SHEET_STATUS_CLASS: Record<JobSheetStatus, string> = {
  sent: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  viewed: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  in_progress:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  completed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled: "border-border/60 bg-muted/40 text-muted-foreground",
};

export function JobSheetStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const normalized = (status in JOB_SHEET_STATUS_CLASS
    ? status
    : "sent") as JobSheetStatus;

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", JOB_SHEET_STATUS_CLASS[normalized], className)}
    >
      {formatJobSheetStatus(status)}
    </Badge>
  );
}

export function AccessRequestStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const classes =
    status === "approved"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : status === "declined"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
        : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";

  return (
    <Badge variant="outline" className={cn("font-medium", classes, className)}>
      {formatAccessRequestStatus(status)}
    </Badge>
  );
}
