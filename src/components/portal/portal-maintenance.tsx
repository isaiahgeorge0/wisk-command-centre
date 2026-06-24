"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Plus, Wrench } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { MaintenanceTriage } from "@/components/portal/maintenance-triage";
import { PortalPage } from "@/components/portal/portal-page";
import { formatPropertyDate } from "@/lib/properties/format";
import {
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

function statusDotClass(status: MaintenanceTicket["status"]): string {
  switch (status) {
    case "new":
      return "bg-[var(--portal-amber)]";
    case "in_progress":
      return "bg-sky-500";
    case "resolved":
      return "bg-[var(--portal-success)]";
    default:
      return "bg-[var(--portal-muted)]";
  }
}

export function PortalMaintenance({ tickets }: PortalMaintenanceProps) {
  const searchParams = useSearchParams();
  const [triageOpen, setTriageOpen] = useState(false);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setTriageOpen(true);
    }
  }, [searchParams]);

  return (
    <PortalPage>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--portal-text)]">
            Maintenance
          </h1>
          <button
            type="button"
            onClick={() => setTriageOpen(true)}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-[var(--portal-amber)] px-4 text-sm font-semibold text-white shadow-[var(--portal-shadow)]"
          >
            <Plus className="size-4" />
            New
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--portal-amber)]/30 bg-[var(--portal-card)] px-6 py-14 text-center shadow-[var(--portal-shadow)]">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--portal-amber-light)]">
              <Wrench className="size-7 text-[var(--portal-amber)]" />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-[var(--portal-text)]">
              No maintenance requests yet
            </h2>
            <p className="mt-2 text-sm text-[var(--portal-muted)]">
              Report an issue and your landlord will be notified.
            </p>
            <button
              type="button"
              onClick={() => setTriageOpen(true)}
              className="mt-6 min-h-14 w-full rounded-xl bg-[var(--portal-amber)] text-sm font-semibold text-white"
            >
              Report an issue
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket, index) => (
              <motion.article
                key={ticket.id}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: reduced ? 0 : index * 0.05 }}
                className="relative rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-5 shadow-[var(--portal-shadow)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                      statusBadgeClass(ticket.status)
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          statusDotClass(ticket.status)
                        )}
                      />
                      {getMaintenanceStatusDisplayName(ticket.status)}
                    </span>
                  </span>
                  <span className="rounded-full bg-[var(--portal-amber-light)] px-2.5 py-1 text-xs font-medium text-[var(--portal-amber)]">
                    {getMaintenancePriorityDisplayName(ticket.priority)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-[var(--portal-text)]">
                      {ticket.title}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--portal-muted)]">
                      Reported {formatPropertyDate(ticket.reported_date)}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-[var(--portal-muted)]" />
                </div>
              </motion.article>
            ))}
          </div>
        )}

        <MaintenanceTriage
          open={triageOpen}
          onClose={() => setTriageOpen(false)}
        />
      </div>
    </PortalPage>
  );
}
