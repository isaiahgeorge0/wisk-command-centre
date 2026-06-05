import type { LeadStatus } from "@/lib/leads/types";
import { LEAD_STATUS_BADGE_CLASS, LEAD_STATUS_LABELS } from "@/lib/leads/constants";
import { cn } from "@/lib/utils";

type LeadStatusBadgeProps = {
  status: LeadStatus | string;
  className?: string;
};

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const key = (status in LEAD_STATUS_LABELS ? status : "new") as LeadStatus;

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
        LEAD_STATUS_BADGE_CLASS[key],
        className
      )}
    >
      {LEAD_STATUS_LABELS[key]}
    </span>
  );
}
