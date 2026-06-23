"use client";

import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  deleteMaintenanceTicket,
  updateMaintenanceTicket,
} from "@/app/(dashboard)/properties/actions";
import { MaintenancePriorityBadge } from "@/components/properties/maintenance-priority-badge";
import { MaintenanceTicketFormDialog } from "@/components/properties/maintenance-ticket-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_LABELS,
} from "@/lib/properties/constants";
import {
  formatPropertyCurrency,
  formatPropertyDate,
} from "@/lib/properties/format";
import type {
  MaintenanceTicket,
  MaintenanceTicketFormInput,
  Tenant,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type PropertyMaintenanceTabProps = {
  propertyId: string;
  tickets: MaintenanceTicket[];
  tenants: Tenant[];
};

export function PropertyMaintenanceTab({
  propertyId,
  tickets,
  tenants,
}: PropertyMaintenanceTabProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<MaintenanceTicket | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceTicket | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    resolved: true,
  });
  const [isPending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const groups: Record<string, MaintenanceTicket[]> = {
      new: [],
      in_progress: [],
      resolved: [],
    };
    for (const ticket of tickets) {
      groups[ticket.status]?.push(ticket);
    }
    return groups;
  }, [tickets]);

  const handleStatusChange = (ticket: MaintenanceTicket, status: string) => {
    if (!status || status === ticket.status) return;
    const input: MaintenanceTicketFormInput = {
      property_id: ticket.property_id,
      tenant_id: ticket.tenant_id ?? undefined,
      title: ticket.title,
      description: ticket.description ?? "",
      status: status as MaintenanceTicketFormInput["status"],
      priority: ticket.priority,
      category: ticket.category ?? undefined,
      assigned_to: ticket.assigned_to ?? "",
      estimated_cost: ticket.estimated_cost ?? undefined,
      actual_cost: ticket.actual_cost ?? undefined,
      reported_date: ticket.reported_date,
      resolved_date: ticket.resolved_date ?? "",
      notes: ticket.notes ?? "",
    };
    startTransition(async () => {
      await updateMaintenanceTicket(ticket.id, input);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteMaintenanceTicket(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  if (tickets.length === 0) {
    return (
      <>
        <EmptyState onAdd={() => { setEditingTicket(null); setFormOpen(true); }} />
        <MaintenanceTicketFormDialog open={formOpen} onOpenChange={setFormOpen} propertyId={propertyId} tenants={tenants} ticket={editingTicket} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingTicket(null); setFormOpen(true); }} className="min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90">
          <Plus className="size-4" />
          Add ticket
        </Button>
      </div>

      {MAINTENANCE_STATUSES.map((status) => {
        const items = grouped[status];
        if (items.length === 0) return null;
        const isCollapsed = collapsed[status] ?? false;
        return (
          <section key={status} className="rounded-xl border border-border/60 bg-card/40">
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setCollapsed((prev) => ({ ...prev, [status]: !isCollapsed }))}
            >
              <span className="font-medium text-foreground">
                {MAINTENANCE_STATUS_LABELS[status]} ({items.length})
              </span>
              <ChevronDown className={cn("size-4 transition-transform", !isCollapsed && "rotate-180")} />
            </button>
            {!isCollapsed ? (
              <div className="divide-y divide-border/50 border-t border-border/50">
                {items.map((ticket) => (
                  <div key={ticket.id} className="space-y-3 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-foreground">{ticket.title}</h3>
                          <MaintenancePriorityBadge priority={ticket.priority} />
                          {ticket.category ? (
                            <Badge variant="outline">{MAINTENANCE_CATEGORY_LABELS[ticket.category]}</Badge>
                          ) : null}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>Reported {formatPropertyDate(ticket.reported_date)}</p>
                          {ticket.assigned_to ? <p>Assigned to {ticket.assigned_to}</p> : null}
                          <p>
                            Cost: {formatPropertyCurrency(ticket.actual_cost ?? ticket.estimated_cost)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Select value={ticket.status} onValueChange={(v) => handleStatusChange(ticket, v ?? ticket.status)} disabled={isPending}>
                          <SelectTrigger className="min-h-11 w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MAINTENANCE_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{MAINTENANCE_STATUS_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" className="min-h-11" onClick={() => { setEditingTicket(ticket); setFormOpen(true); }}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="min-h-11 text-destructive" onClick={() => setDeleteTarget(ticket)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}

      <MaintenanceTicketFormDialog open={formOpen} onOpenChange={setFormOpen} propertyId={propertyId} tenants={tenants} ticket={editingTicket} />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.title}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} className="min-h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isPending} className="min-h-11">
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-16 text-center">
      <h2 className="text-lg font-medium text-foreground">No maintenance tickets</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Log repairs and track progress from report to resolution.
      </p>
      <Button onClick={onAdd} className="mt-6 min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90">
        <Plus className="size-4" />
        Add ticket
      </Button>
    </div>
  );
}
