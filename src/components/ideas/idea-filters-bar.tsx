"use client";

import { useCallback } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  DEFAULT_IDEA_FILTERS,
  IDEA_STATUS_FILTER_OPTIONS,
} from "@/lib/ideas/constants";
import { countActiveIdeaFilters } from "@/lib/ideas/selectors";
import type { IdeaFilters, IdeaStatusFilter } from "@/lib/ideas/types";
import { cn } from "@/lib/utils";

type IdeaFiltersBarProps = {
  filters: IdeaFilters;
  categories: string[];
  onChange: (filters: IdeaFilters) => void;
};

export function IdeaFiltersBar({
  filters,
  categories,
  onChange,
}: IdeaFiltersBarProps) {
  const activeCount = countActiveIdeaFilters(filters);

  const patch = useCallback(
    (partial: Partial<IdeaFilters>) => {
      onChange({ ...filters, ...partial });
    },
    [filters, onChange]
  );

  const categoryOptions: { value: string; label: string }[] = [
    { value: "all", label: "All categories" },
    ...categories.map((category) => ({
      value: category,
      label: category,
    })),
  ];

  const selectedCategoryLabel =
    categoryOptions.find((option) => option.value === filters.category)?.label ??
    "All categories";

  return (
    <div className="mb-6 space-y-3">
      <div className="relative min-w-0 sm:max-w-md">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={filters.search}
          onChange={(event) => patch({ search: event.target.value })}
          placeholder="Search ideas by title or description…"
          className="h-9 pr-9 pl-9"
          aria-label="Search ideas"
        />
        {filters.search.trim() ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
            onClick={() => patch({ search: "" })}
            aria-label="Clear search"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />

        {categories.length > 0 ? (
          <Select
            value={filters.category}
            onValueChange={(value) => value && patch({ category: value })}
          >
            <SelectTrigger
              size="sm"
              className={cn(
                "h-7 w-auto max-w-[10rem] gap-1 border-border/60 bg-card/40 px-2.5 text-xs font-medium",
                filters.category !== DEFAULT_IDEA_FILTERS.category &&
                  "border-wisk-teal/40 bg-wisk-teal/10 text-wisk-teal"
              )}
              aria-label="Filter by category"
            >
              <span className="truncate">{selectedCategoryLabel}</span>
            </SelectTrigger>
            <SelectContent align="start">
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter by status"
        >
          {IDEA_STATUS_FILTER_OPTIONS.map((option) => {
            const active = filters.status === option.value;

            return (
              <Button
                key={option.value}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 rounded-md border px-2.5 text-xs font-medium",
                  active
                    ? "border-wisk-teal/40 bg-wisk-teal/10 text-wisk-teal hover:bg-wisk-teal/10 hover:text-wisk-teal"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
                )}
                onClick={() =>
                  patch({ status: option.value as IdeaStatusFilter })
                }
              >
                {option.label}
              </Button>
            );
          })}
        </div>

        {activeCount > 0 ? (
          <>
            <Badge variant="secondary" className="h-6 px-2 text-[11px]">
              {activeCount} active
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => onChange(DEFAULT_IDEA_FILTERS)}
            >
              Clear filters
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
