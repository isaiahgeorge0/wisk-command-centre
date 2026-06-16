"use client";

import { ChevronDown } from "lucide-react";

import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LEAD_STATUS_LABELS, PIPELINE_STATUSES } from "@/lib/leads/constants";
import type { LeadStatus } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

type LeadInlineStatusProps = {
  status: LeadStatus | string;
  onStatusChange: (status: LeadStatus) => void;
  disabled?: boolean;
  className?: string;
};

export function LeadInlineStatus({
  status,
  onStatusChange,
  disabled,
  className,
}: LeadInlineStatusProps) {
  const currentStatus = (
    PIPELINE_STATUSES.includes(status as LeadStatus) ? status : "new"
  ) as LeadStatus;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "inline-flex items-center gap-1 rounded-full transition-opacity hover:opacity-80 disabled:opacity-50",
              className
            )}
          />
        }
      >
        <LeadStatusBadge status={currentStatus} />
        <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        {PIPELINE_STATUSES.map((nextStatus) => (
          <DropdownMenuItem
            key={nextStatus}
            disabled={nextStatus === currentStatus || disabled}
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(nextStatus);
            }}
          >
            {LEAD_STATUS_LABELS[nextStatus]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
