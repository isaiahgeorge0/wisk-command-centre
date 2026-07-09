"use client";

import { ChevronDown, HardHat, Plus, Wrench } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { MaintenancePriorityBadge } from "@/components/properties/maintenance-priority-badge";
import { MaintenanceTenantReportedBadge } from "@/components/properties/maintenance-tenant-reported-badge";
import { MaintenanceTicketFormDialog } from "@/components/properties/maintenance-ticket-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  PROPERTIES_ACCENT,
} from "@/lib/properties/constants";
import { formatContractorDisplayName } from "@/lib/properties/contractor-display";
import {
  getMaintenanceCategoryDisplayName,
  getMaintenancePriorityDisplayName,
  getMaintenanceStatusDisplayName,
} from "@/lib/properties/display-names";
import { formatPropertyDate } from "@/lib/properties/format";
import { buildMaintenancePortfolioStats } from "@/lib/properties/selectors";
import type {
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceTicketWithPropertyAndJobSheet,
  PropertyWithStats,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type MaintenancePageClientProps = {
  tickets: MaintenanceTicketWithPropertyAndJobSheet[];
  properties: PropertyWithStats[];
};

export function MaintenancePageClient({
  tickets,
  properties,
}: MaintenancePageClientProps) {
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | "all">(
    "all"
  );
  const [priorityFilter, setPriorityFilter] = useState<
    MaintenancePriority | "all"
  >("all");
  const [formOpen, setFormOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    resolved: true,
  });

  const stats = useMemo(() => buildMaintenancePortfolioStats(tickets), [tickets]);

  const filtered = useMemo(() => {
    return tickets.filter((ticket) => {
      if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
      if (priorityFilter !== "all" && ticket.priority !== priorityFilter) {
        return false;
      }
      return true;
    });
  }, [tickets, statusFilter, priorityFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, MaintenanceTicketWithPropertyAndJobSheet[]> = {
      new: [],
      in_progress: [],
      resolved: [],
    };
    for (const ticket of filtered) {
      groups[ticket.status]?.push(ticket);
    }
    return groups;
  }, [filtered]);

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          className="mb-0"
          title="Maintenance"
          subtitle="Track tickets, contractors, and repair costs."
          icon={<Wrench className="size-6" style={{ color: PROPERTIES_ACCENT }} />}
        />
        <Button
          onClick={() => setFormOpen(true)}
          disabled={properties.length === 0}
          className="min-h-11 gap-2 bg-wisk-ferrari text-white hover:bg-wisk-ferrari/90"
        >
          <Plus className="size-4" />
          Add ticket
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Total open" value={String(stats.totalOpen)} />
        <StatTile
          label="Emergency / High"
          value={String(stats.urgentCount)}
        />
        <StatTile
          label="Resolved this month"
          value={String(stats.resolvedThisMonth)}
        />
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            v && setStatusFilter(v as MaintenanceStatus | "all")
          }
        >
          <SelectTrigger className="min-h-11 w-full sm:w-[180px]">
            <SelectValue>
              {statusFilter === "all"
                ? "All statuses"
                : getMaintenanceStatusDisplayName(statusFilter)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {MAINTENANCE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {getMaintenanceStatusDisplayName(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={(v) =>
            v && setPriorityFilter(v as MaintenancePriority | "all")
          }
        >
          <SelectTrigger className="min-h-11 w-full sm:w-[180px]">
            <SelectValue>
              {priorityFilter === "all"
                ? "All priorities"
                : getMaintenancePriorityDisplayName(priorityFilter)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {MAINTENANCE_PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {getMaintenancePriorityDisplayName(priority)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-wisk-ferrari/20 bg-card/40 px-6 py-16 text-center">
          <h2 className="text-lg font-medium text-foreground">
            No maintenance tickets
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a ticket to start tracking repairs.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {MAINTENANCE_STATUSES.map((status) => {
            const items = grouped[status];
            if (items.length === 0) return null;
            const isCollapsed = collapsed[status] ?? false;
            return (
              <section
                key={status}
                className="rounded-xl border border-border/60 bg-card/40"
              >
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left"
                  onClick={() =>
                    setCollapsed((prev) => ({ ...prev, [status]: !isCollapsed }))
                  }
                >
                  <span className="font-medium text-foreground">
                    {getMaintenanceStatusDisplayName(status)} ({items.length})
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      !isCollapsed && "rotate-180"
                    )}
                  />
                </button>
                {!isCollapsed ? (
                  <div className="divide-y divide-border/50 border-t border-border/50">
                    {items.map((ticket) => {
                      const jobSheet = ticket.job_sheets?.[0] ?? null;
                      const latestUpdate =
                        jobSheet?.job_sheet_updates?.sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime()
                        )[0] ?? null;

                      return (
                        <Link
                          key={ticket.id}
                          href={`/properties/${ticket.property_id}?tab=maintenance`}
                          className="block space-y-2 p-4 transition-colors hover:bg-muted/30"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">
                              {ticket.title}
                            </p>
                            <MaintenancePriorityBadge priority={ticket.priority} />
                            {ticket.reported_by_tenant ? (
                              <MaintenanceTenantReportedBadge />
                            ) : null}
                            {ticket.category ? (
                              <Badge variant="outline">
                                {getMaintenanceCategoryDisplayName(ticket.category)}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {ticket.property_name} · Reported{" "}
                            {formatPropertyDate(ticket.reported_date)}
                            {ticket.assigned_to
                              ? ` · ${ticket.assigned_to}`
                              : ""}
                          </p>

                          {jobSheet ? (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              {jobSheet.contractors?.name ? (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <HardHat className="size-3" />
                                  {formatContractorDisplayName(
                                    jobSheet.contractors.name
                                  )}
                                  {" · "}
                                  <span
                                    className={cn(
                                      "font-medium",
                                      jobSheet.status === "in_progress"
                                        ? "text-amber-600 dark:text-amber-400"
                                        : jobSheet.status === "completed"
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : "text-muted-foreground"
                                    )}
                                  >
                                    {jobSheet.status === "sent"
                                      ? "Sent"
                                      : jobSheet.status === "viewed"
                                        ? "Viewed"
                                        : jobSheet.status === "in_progress"
                                          ? "In progress"
                                          : jobSheet.status === "completed"
                                            ? "Completed"
                                            : "Sent"}
                                  </span>
                                </span>
                              ) : null}
                              {jobSheet.planned_visit_date ? (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    Visit:
                                  </span>{" "}
                                  {formatPropertyDate(jobSheet.planned_visit_date)}
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                          {latestUpdate ? (
                            <p className="truncate rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">
                                Latest update:
                              </span>{" "}
                              {latestUpdate.content}
                            </p>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <MaintenanceTicketFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        propertyId={properties[0]?.id ?? ""}
        properties={properties}
      />
    </PageTransition>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-wisk-ferrari/15 bg-card/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
