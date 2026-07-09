"use client";

import { useCallback } from "react";
import { ArrowUpDown, Search, SlidersHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_PROJECT_FILTERS,
  PROJECT_SORT_OPTIONS,
  PROJECT_STATUS_FILTER_OPTIONS,
} from "@/lib/projects/constants";
import { countActiveProjectFilters } from "@/lib/projects/selectors";
import type { ProjectFilters, ProjectSortKey } from "@/lib/projects/types";
import { cn } from "@/lib/utils";

type ProjectFiltersBarProps = {
  filters: ProjectFilters;
  serviceTypes: string[];
  onChange: (filters: ProjectFilters) => void;
};

type FilterSelectProps<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  active?: boolean;
};

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  active = false,
}: FilterSelectProps<T>) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? label;

  return (
    <Select value={value} onValueChange={(next) => next && onChange(next as T)}>
      <SelectTrigger
        size="sm"
        className={cn(
          "h-7 w-auto max-w-[10rem] gap-1 border-border/60 bg-card/40 px-2.5 text-xs font-medium",
          active && "border-wisk-section-projects/40 bg-wisk-section-projects/10 text-wisk-section-projects"
        )}
        aria-label={label}
      >
        <span className="truncate">{selectedLabel}</span>
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function defaultSortDirection(key: ProjectSortKey): "asc" | "desc" {
  return key === "deadline" || key === "value" ? "asc" : "desc";
}

export function ProjectFiltersBar({
  filters,
  serviceTypes,
  onChange,
}: ProjectFiltersBarProps) {
  const activeCount = countActiveProjectFilters(filters);

  const patch = useCallback(
    (partial: Partial<ProjectFilters>) => {
      onChange({ ...filters, ...partial });
    },
    [filters, onChange]
  );

  const handleSortKeyChange = useCallback(
    (value: string | null) => {
      if (!value) return;

      const key = value as ProjectSortKey;

      if (key === filters.sort_key) {
        patch({
          sort_direction: filters.sort_direction === "asc" ? "desc" : "asc",
        });
        return;
      }

      patch({
        sort_key: key,
        sort_direction: defaultSortDirection(key),
      });
    },
    [filters.sort_direction, filters.sort_key, patch]
  );

  const sortLabel =
    PROJECT_SORT_OPTIONS.find((option) => option.value === filters.sort_key)
      ?.label ?? "Sort";
  const directionArrow = filters.sort_direction === "asc" ? "↑" : "↓";

  const serviceTypeOptions: { value: string; label: string }[] = [
    { value: "all", label: "All types" },
    ...serviceTypes.map((type) => ({
      value: type,
      label: type,
    })),
  ];

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={filters.search}
            onChange={(event) => patch({ search: event.target.value })}
            placeholder="Search projects, clients, or types…"
            className="h-9 pr-9 pl-9"
            aria-label="Search projects"
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

        <Select value={filters.sort_key} onValueChange={handleSortKeyChange}>
          <SelectTrigger
            size="sm"
            className="h-9 w-full gap-2 border-border/60 bg-card/40 sm:w-auto sm:min-w-[11rem]"
            aria-label="Sort projects"
          >
            <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" />
            <SelectValue>
              <span className="flex items-center gap-1.5 text-sm">
                {sortLabel}
                <span className="text-muted-foreground" aria-hidden>
                  {directionArrow}
                </span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {PROJECT_SORT_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="flex items-center justify-between gap-3"
              >
                <span>{option.label}</span>
                {option.value === filters.sort_key ? (
                  <span className="text-muted-foreground" aria-hidden>
                    {directionArrow}
                  </span>
                ) : null}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />

        <FilterSelect
          label="Status"
          value={filters.status}
          options={PROJECT_STATUS_FILTER_OPTIONS}
          onChange={(status) => patch({ status })}
          active={filters.status !== DEFAULT_PROJECT_FILTERS.status}
        />

        {serviceTypes.length > 0 ? (
          <FilterSelect
            label="Service type"
            value={filters.service_type}
            options={serviceTypeOptions}
            onChange={(service_type) => patch({ service_type })}
            active={filters.service_type !== DEFAULT_PROJECT_FILTERS.service_type}
          />
        ) : null}

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
              onClick={() => onChange(DEFAULT_PROJECT_FILTERS)}
            >
              Clear all
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
