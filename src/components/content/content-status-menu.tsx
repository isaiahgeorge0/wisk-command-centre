"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CONTENT_STATUS_LABELS,
  PIPELINE_STATUSES,
} from "@/lib/content/constants";
import type { ContentStatus } from "@/lib/content/types";

type ContentStatusMenuProps = {
  currentStatus: ContentStatus;
  onStatusChange: (status: ContentStatus) => void;
  disabled?: boolean;
};

export function ContentStatusMenu({
  currentStatus,
  onStatusChange,
  disabled,
}: ContentStatusMenuProps) {
  const handleStatusChange = (status: ContentStatus) => {
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
            {CONTENT_STATUS_LABELS[status]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
