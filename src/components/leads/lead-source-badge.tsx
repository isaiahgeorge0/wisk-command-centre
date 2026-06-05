import type { LeadSource } from "@/lib/leads/types";
import { LEAD_SOURCE_BADGE_CLASS } from "@/lib/leads/constants";
import { formatLeadSource, isLeadSource } from "@/lib/leads/format";
import { cn } from "@/lib/utils";

type LeadSourceBadgeProps = {
  source: string;
  className?: string;
};

export function LeadSourceBadge({ source, className }: LeadSourceBadgeProps) {
  const key = isLeadSource(source) ? source : "Other";

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
        LEAD_SOURCE_BADGE_CLASS[key as LeadSource],
        className
      )}
    >
      {formatLeadSource(source)}
    </span>
  );
}
