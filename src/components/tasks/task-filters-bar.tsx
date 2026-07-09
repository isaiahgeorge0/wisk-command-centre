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
  DEFAULT_TASK_FILTERS,
  TASK_DUE_DATE_OPTIONS,
  TASK_PRIORITY_FILTER_OPTIONS,
  TASK_SORT_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/lib/tasks/constants";
import { countActiveFilters } from "@/lib/tasks/selectors";
import type {
  ProjectOption,
  TaskDueDateFilter,
  TaskFilters,
  TaskPriority,
  TaskSortKey,
  TaskStatusFilter,
} from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

type TaskFiltersBarProps = {
  filters: TaskFilters;
  projects: ProjectOption[];
  onChange: (filters: TaskFilters) => void;
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
          active && "border-wisk-section-tasks/40 bg-wisk-section-tasks/10 text-wisk-section-tasks"
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

function defaultSortDirection(key: TaskSortKey): "asc" | "desc" {
  return key === "due_date" || key === "priority" ? "asc" : "desc";
}

export function TaskFiltersBar({
  filters,
  projects,
  onChange,
}: TaskFiltersBarProps) {
  const activeCount = countActiveFilters(filters);

  const patch = useCallback(
    (partial: Partial<TaskFilters>) => {
      onChange({ ...filters, ...partial });
    },
    [filters, onChange]
  );

  const handleSortKeyChange = useCallback(
    (value: string | null) => {
      if (!value) return;

      const key = value as TaskSortKey;

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
    TASK_SORT_OPTIONS.find((option) => option.value === filters.sort_key)
      ?.label ?? "Sort";
  const directionArrow = filters.sort_direction === "asc" ? "↑" : "↓";

  const projectOptions: { value: string; label: string }[] = [
    { value: "all", label: "All projects" },
    ...projects.map((project) => ({
      value: project.id,
      label: project.project_name,
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
            placeholder="Search tasks or projects…"
            className="h-9 pr-9 pl-9"
            aria-label="Search tasks"
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
            aria-label="Sort tasks"
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
            {TASK_SORT_OPTIONS.map((option) => (
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

        <FilterSelect<TaskStatusFilter>
          label="Status"
          value={filters.status}
          options={TASK_STATUS_OPTIONS}
          onChange={(status) => patch({ status })}
          active={filters.status !== DEFAULT_TASK_FILTERS.status}
        />

        <FilterSelect<TaskPriority | "all">
          label="Priority"
          value={filters.priority}
          options={TASK_PRIORITY_FILTER_OPTIONS}
          onChange={(priority) => patch({ priority })}
          active={filters.priority !== DEFAULT_TASK_FILTERS.priority}
        />

        <FilterSelect<TaskDueDateFilter>
          label="Due date"
          value={filters.due_date}
          options={TASK_DUE_DATE_OPTIONS}
          onChange={(due_date) => patch({ due_date })}
          active={filters.due_date !== DEFAULT_TASK_FILTERS.due_date}
        />

        {projects.length > 0 ? (
          <FilterSelect<string>
            label="Project"
            value={filters.project_id}
            options={projectOptions}
            onChange={(project_id) => patch({ project_id })}
            active={filters.project_id !== DEFAULT_TASK_FILTERS.project_id}
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
              onClick={() => onChange(DEFAULT_TASK_FILTERS)}
            >
              Clear all
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
