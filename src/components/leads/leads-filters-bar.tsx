"use client";

import { Search, X } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUS_LABELS, PIPELINE_STATUSES } from "@/lib/leads/constants";
import {
  LEADS_SORT_OPTIONS,
  type LeadsSortDirection,
} from "@/lib/leads/selectors";
import type { LeadsFilterState, LeadsSortKey } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

type LeadsFiltersBarProps = {
  filters: LeadsFilterState;
  onFiltersChange: (filters: LeadsFilterState) => void;
  sortKey: LeadsSortKey;
  sortDirection: LeadsSortDirection;
  onSortChange: (key: LeadsSortKey, direction: LeadsSortDirection) => void;
  showSort?: boolean;
  className?: string;
};

export function LeadsFiltersBar({
  filters,
  onFiltersChange,
  sortKey,
  sortDirection,
  onSortChange,
  showSort = false,
  className,
}: LeadsFiltersBarProps) {
  const hasActiveFilters =
    filters.search.trim().length > 0 || filters.stage !== "all";

  const sortValue = `${sortKey}:${sortDirection}`;
  const activeSortLabel =
    LEADS_SORT_OPTIONS.find(
      (option) =>
        option.key === sortKey && option.direction === sortDirection
    )?.label ?? "Sort by";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            placeholder="Search leads…"
            className="h-9 w-full rounded-lg border border-border/60 bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-wisk-teal/40"
          />
        </div>

        <Select
          value={filters.stage}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              stage: value as LeadsFilterState["stage"],
            })
          }
        >
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {PIPELINE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {LEAD_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => onFiltersChange({ search: "", stage: "all" })}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
            Clear filters
          </button>
        ) : null}
      </div>

      {showSort ? (
        <Select
          value={sortValue}
          onValueChange={(value) => {
            if (!value) return;
            const [key, direction] = value.split(":") as [
              LeadsSortKey,
              LeadsSortDirection,
            ];
            onSortChange(key, direction);
          }}
        >
          <SelectTrigger className="h-9 w-full sm:w-52">
            <SelectValue placeholder="Sort by">{activeSortLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LEADS_SORT_OPTIONS.map((option) => (
              <SelectItem
                key={option.key}
                value={`${option.key}:${option.direction}`}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
