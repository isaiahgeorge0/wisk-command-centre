"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LEAD_STATUS_LABELS, PIPELINE_STATUSES } from "@/lib/leads/constants";
import type { LeadStatus } from "@/lib/leads/types";

type LeadStatusMenuProps = {
  currentStatus: LeadStatus;
  onStatusChange: (status: LeadStatus) => void;
  disabled?: boolean;
};

export function LeadStatusMenu({
  currentStatus,
  onStatusChange,
  disabled,
}: LeadStatusMenuProps) {
  const handleStatusChange = (status: LeadStatus) => {
    if (status === currentStatus || disabled) return;
    onStatusChange(status);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        Move
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        {PIPELINE_STATUSES.map((status) => (
          <DropdownMenuItem
            key={status}
            disabled={status === currentStatus || disabled}
            onClick={() => handleStatusChange(status)}
          >
            {LEAD_STATUS_LABELS[status]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
