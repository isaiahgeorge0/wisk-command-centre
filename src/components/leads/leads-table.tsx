"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import { LeadExpandedDetail } from "@/components/leads/lead-expanded-detail";
import { LeadInlineStatus } from "@/components/leads/lead-inline-status";
import { LeadSourceBadge } from "@/components/leads/lead-source-badge";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { LeadsFiltersBar } from "@/components/leads/leads-filters-bar";
import {
  DEFAULT_LEADS_SORT,
  DEFAULT_LEADS_SORT_DIRECTION,
  type LeadsSortDirection,
  sortLeads,
} from "@/lib/leads/selectors";
import {
  daysInStageCellClass,
  followUpCellClass,
  formatDaysInStage,
  formatFollowUpDate,
  formatLeadValue,
  lastActivityCellClass,
  relativeTime,
} from "@/lib/leads/format";
import type {
  Lead,
  LeadsFilterState,
  LeadsSortKey,
  LeadStatus,
  LeadWithActivity,
} from "@/lib/leads/types";
import { cn } from "@/lib/utils";

type LeadsTableProps = {
  leads: LeadWithActivity[];
  canAccessWinston: boolean;
  filters: LeadsFilterState;
  onFiltersChange: (filters: LeadsFilterState) => void;
  onDelete: (lead: Lead) => void;
  onLeadUpdate: (lead: Lead) => void;
  onProjectCreated?: (projectId: string) => void;
  onLeadStatusChange: (
    lead: Lead,
    newStatus: LeadStatus,
    previousStatus: LeadStatus
  ) => Promise<boolean>;
};

type SortableColumn = {
  key: LeadsSortKey;
  label: string;
  className?: string;
};

const SORTABLE_COLUMNS: SortableColumn[] = [
  { key: "name", label: "Name", className: "min-w-[180px]" },
  { key: "stage", label: "Stage" },
  { key: "value", label: "Value" },
  { key: "follow_up_date", label: "Follow Up" },
  {
    key: "last_activity",
    label: "Last Activity",
    className: "hidden xl:table-cell",
  },
  {
    key: "days_in_stage",
    label: "Days in Stage",
    className: "hidden lg:table-cell",
  },
];

const HEADER_CLASS =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground";

const COLUMN_COUNT = SORTABLE_COLUMNS.length + 1;

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: LeadsSortDirection;
}) {
  if (!active) {
    return <ArrowUpDown className="size-3 opacity-40" aria-hidden />;
  }
  return direction === "asc" ? (
    <ArrowUp className="size-3" aria-hidden />
  ) : (
    <ArrowDown className="size-3" aria-hidden />
  );
}

export function LeadsTable({
  leads,
  canAccessWinston,
  filters,
  onFiltersChange,
  onDelete,
  onLeadUpdate,
  onProjectCreated,
  onLeadStatusChange,
}: LeadsTableProps) {
  const [sortKey, setSortKey] = useState<LeadsSortKey>(DEFAULT_LEADS_SORT);
  const [sortDirection, setSortDirection] =
    useState<LeadsSortDirection>(DEFAULT_LEADS_SORT_DIRECTION);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedLeads = useMemo(
    () => sortLeads(leads, sortKey, sortDirection),
    [leads, sortKey, sortDirection]
  );

  const handleHeaderSort = (key: LeadsSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(
      key === "follow_up_date" || key === "name" || key === "stage"
        ? "asc"
        : "desc"
    );
  };

  const handleSortChange = (key: LeadsSortKey, direction: LeadsSortDirection) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const toggleExpanded = (leadId: string) => {
    setExpandedId((current) => (current === leadId ? null : leadId));
  };

  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No leads match your filters.
        </p>
        <button
          type="button"
          onClick={() => onFiltersChange({ search: "", stage: "all" })}
          className="mt-3 text-sm text-wisk-teal underline-offset-2 hover:underline"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <LeadsFiltersBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        showSort
      />

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border/60 md:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 border-b border-border/60 bg-muted/40 backdrop-blur-sm">
              <tr>
                {SORTABLE_COLUMNS.slice(0, 3).map((column) => (
                  <th
                    key={column.key}
                    className={cn(HEADER_CLASS, column.className)}
                  >
                    <button
                      type="button"
                      onClick={() => handleHeaderSort(column.key)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      {column.label}
                      <SortIcon
                        active={sortKey === column.key}
                        direction={sortDirection}
                      />
                    </button>
                  </th>
                ))}
                <th className={cn(HEADER_CLASS, "hidden lg:table-cell")}>
                  Source
                </th>
                {SORTABLE_COLUMNS.slice(3).map((column) => (
                  <th
                    key={column.key}
                    className={cn(HEADER_CLASS, column.className)}
                  >
                    <button
                      type="button"
                      onClick={() => handleHeaderSort(column.key)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      {column.label}
                      <SortIcon
                        active={sortKey === column.key}
                        direction={sortDirection}
                      />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedLeads.map((lead, index) => {
                const followUp = formatFollowUpDate(lead.follow_up_date);
                const isExpanded = expandedId === lead.id;
                const status = (lead.status as LeadStatus) ?? "new";

                return (
                  <Fragment key={lead.id}>
                    <tr
                      onClick={() => toggleExpanded(lead.id)}
                      className={cn(
                        "cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/30",
                        index % 2 === 0 ? "bg-background" : "bg-muted/10",
                        isExpanded && "bg-muted/20"
                      )}
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {lead.name}
                          </p>
                          {lead.email ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {lead.email}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <LeadInlineStatus
                          status={status}
                          onStatusChange={(nextStatus) => {
                            void onLeadStatusChange(lead, nextStatus, status);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 align-top tabular-nums text-foreground">
                        {formatLeadValue(lead.value)}
                      </td>
                      <td className="hidden px-4 py-3 align-top lg:table-cell">
                        <LeadSourceBadge source={lead.source} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        {followUp ? (
                          <span
                            className={cn(
                              "text-xs",
                              followUpCellClass(followUp.urgency)
                            )}
                          >
                            {followUp.isOverdue
                              ? `Overdue — ${followUp.label}`
                              : followUp.label}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "hidden px-4 py-3 align-top text-xs xl:table-cell",
                          lastActivityCellClass(lead.last_activity_at)
                        )}
                      >
                        {lead.last_activity_at
                          ? relativeTime(lead.last_activity_at)
                          : "No activity"}
                      </td>
                      <td
                        className={cn(
                          "hidden px-4 py-3 align-top text-xs lg:table-cell",
                          daysInStageCellClass(lead)
                        )}
                      >
                        {formatDaysInStage(lead)}
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="border-b border-border/40 bg-muted/10">
                        <td colSpan={COLUMN_COUNT} className="px-4 py-4">
                          <LeadExpandedDetail
                            lead={lead}
                            canAccessWinston={canAccessWinston}
                            onDelete={onDelete}
                            onLeadUpdate={onLeadUpdate}
                            onProjectCreated={onProjectCreated}
                            onStatusChange={(nextStatus) => {
                              void onLeadStatusChange(lead, nextStatus, status);
                            }}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile list */}
      <div className="space-y-2 md:hidden">
        {sortedLeads.map((lead) => {
          const followUp = formatFollowUpDate(lead.follow_up_date);
          const isExpanded = expandedId === lead.id;
          const status = (lead.status as LeadStatus) ?? "new";

          return (
            <div
              key={lead.id}
              className="overflow-hidden rounded-xl border border-border/60 bg-card/80"
            >
              <button
                type="button"
                onClick={() => toggleExpanded(lead.id)}
                className="w-full px-4 py-3 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {lead.name}
                  </p>
                  <LeadStatusBadge status={status} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium tabular-nums text-foreground">
                    {formatLeadValue(lead.value)}
                  </span>
                  {followUp ? (
                    <span
                      className={cn(
                        "text-xs",
                        followUpCellClass(followUp.urgency)
                      )}
                    >
                      {followUp.isOverdue
                        ? `Overdue — ${followUp.label}`
                        : followUp.label}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No follow-up</span>
                  )}
                </div>
                <div className="mt-1 flex justify-end">
                  <span
                    className={cn(
                      "text-[11px]",
                      lastActivityCellClass(lead.last_activity_at)
                    )}
                  >
                    {lead.last_activity_at
                      ? relativeTime(lead.last_activity_at)
                      : "No activity"}
                  </span>
                </div>
              </button>

              {isExpanded ? (
                <div className="border-t border-border/50 px-4 py-4">
                  <LeadExpandedDetail
                    lead={lead}
                    canAccessWinston={canAccessWinston}
                    onDelete={onDelete}
                    onLeadUpdate={onLeadUpdate}
                    onProjectCreated={onProjectCreated}
                    onStatusChange={(nextStatus) => {
                      void onLeadStatusChange(lead, nextStatus, status);
                    }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
