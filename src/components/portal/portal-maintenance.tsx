"use client";

import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { MaintenanceTriage } from "@/components/portal/maintenance-triage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPropertyDate } from "@/lib/properties/format";
import {
  getMaintenanceCategoryDisplayName,
  getMaintenancePriorityDisplayName,
  getMaintenanceStatusDisplayName,
} from "@/lib/properties/display-names";
import type { MaintenanceTicket } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type PortalMaintenanceProps = {
  tickets: MaintenanceTicket[];
};

function statusBadgeClass(status: MaintenanceTicket["status"]): string {
  switch (status) {
    case "new":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "in_progress":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "resolved":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    default:
      return "";
  }
}

export function PortalMaintenance({ tickets }: PortalMaintenanceProps) {
  const searchParams = useSearchParams();
  const [triageOpen, setTriageOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setTriageOpen(true);
    }
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-foreground">Maintenance</h1>
        <Button
          size="sm"
          className="min-h-10 gap-1.5 bg-amber-500 text-white hover:bg-amber-500/90"
          onClick={() => setTriageOpen(true)}
        >
          <Plus className="size-4" />
          New request
        </Button>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No maintenance requests yet.
          </p>
          <Button
            className="mt-4 min-h-11 bg-amber-500 text-white hover:bg-amber-500/90"
            onClick={() => setTriageOpen(true)}
          >
            Report an issue
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <article
              key={ticket.id}
              className="rounded-xl border border-border/60 bg-card/50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-medium text-foreground">{ticket.title}</h2>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={cn("font-medium", statusBadgeClass(ticket.status))}
                  >
                    {getMaintenanceStatusDisplayName(ticket.status)}
                  </Badge>
                  <Badge variant="outline">
                    {getMaintenancePriorityDisplayName(ticket.priority)}
                  </Badge>
                </div>
              </div>
              {ticket.description ? (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {ticket.description}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Reported {formatPropertyDate(ticket.reported_date)}</span>
                {ticket.category ? (
                  <>
                    <span>·</span>
                    <span>
                      {getMaintenanceCategoryDisplayName(ticket.category)}
                    </span>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <MaintenanceTriage
        open={triageOpen}
        onClose={() => setTriageOpen(false)}
      />
    </div>
  );
}
