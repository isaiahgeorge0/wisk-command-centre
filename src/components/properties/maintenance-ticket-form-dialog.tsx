"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  createMaintenanceTicket,
  updateMaintenanceTicket,
} from "@/app/(dashboard)/properties/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
} from "@/lib/properties/constants";
import {
  getMaintenanceCategoryDisplayName,
  getMaintenancePriorityDisplayName,
  getMaintenanceStatusDisplayName,
} from "@/lib/properties/display-names";
import { getTenantFullName } from "@/lib/properties/tenant-form";
import type {
  MaintenanceTicket,
  MaintenanceTicketFormInput,
  PropertyWithStats,
  Tenant,
} from "@/lib/properties/types";

function emptyMaintenanceForm(
  propertyId: string
): MaintenanceTicketFormInput {
  return {
    property_id: propertyId,
    title: "",
    description: "",
    status: "new",
    priority: "medium",
    reported_date: new Date().toISOString().slice(0, 10),
    notes: "",
  };
}

function ticketToFormInput(ticket: MaintenanceTicket): MaintenanceTicketFormInput {
  return {
    property_id: ticket.property_id,
    tenant_id: ticket.tenant_id ?? undefined,
    title: ticket.title,
    description: ticket.description ?? "",
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category ?? undefined,
    assigned_to: ticket.assigned_to ?? "",
    estimated_cost: ticket.estimated_cost ?? undefined,
    actual_cost: ticket.actual_cost ?? undefined,
    reported_date: ticket.reported_date,
    resolved_date: ticket.resolved_date ?? "",
    notes: ticket.notes ?? "",
  };
}

type MaintenanceTicketFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  properties?: PropertyWithStats[];
  tenants?: Tenant[];
  ticket?: MaintenanceTicket | null;
};

export function MaintenanceTicketFormDialog({
  open,
  onOpenChange,
  propertyId,
  properties,
  tenants = [],
  ticket,
}: MaintenanceTicketFormDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(ticket);
  const [values, setValues] = useState<MaintenanceTicketFormInput>(
    emptyMaintenanceForm(propertyId)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = isEditing ? `edit-ticket-${ticket?.id}` : "add-ticket-form";

  const selectedProperty = useMemo(
    () => properties?.find((p) => p.id === values.property_id),
    [properties, values.property_id]
  );

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === values.tenant_id),
    [tenants, values.tenant_id]
  );

  useEffect(() => {
    if (!open) return;
    setValues(ticket ? ticketToFormInput(ticket) : emptyMaintenanceForm(propertyId));
    setError(null);
  }, [open, ticket, propertyId]);

  const updateField = <K extends keyof MaintenanceTicketFormInput>(
    key: K,
    value: MaintenanceTicketFormInput[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = isEditing
        ? await updateMaintenanceTicket(ticket!.id, values)
        : await createMaintenanceTicket(values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEditing ? "Edit ticket" : "Add maintenance ticket"}</DialogTitle>
          <DialogDescription>Track repairs, contractors, and costs.</DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-0.5 py-1"
        >
          {properties && properties.length > 0 ? (
            <div className="space-y-2">
              <Label>Property *</Label>
              <Select
                value={values.property_id}
                onValueChange={(v) => v && updateField("property_id", v)}
                disabled={isPending || isEditing}
              >
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue placeholder="Select property">
                    {selectedProperty?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor={`${formId}-title`}>Title *</Label>
            <Input id={`${formId}-title`} value={values.title} onChange={(e) => updateField("title", e.target.value)} disabled={isPending} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-desc`}>Description</Label>
            <Textarea id={`${formId}-desc`} value={values.description ?? ""} onChange={(e) => updateField("description", e.target.value)} disabled={isPending} rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={values.status} onValueChange={(v) => v && updateField("status", v as MaintenanceTicketFormInput["status"])} disabled={isPending}>
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue>{getMaintenanceStatusDisplayName(values.status)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {getMaintenanceStatusDisplayName(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={values.priority} onValueChange={(v) => v && updateField("priority", v as MaintenanceTicketFormInput["priority"])} disabled={isPending}>
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue>{getMaintenancePriorityDisplayName(values.priority)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {getMaintenancePriorityDisplayName(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={values.category ?? ""} onValueChange={(v) => updateField("category", v ? (v as MaintenanceTicketFormInput["category"]) : undefined)} disabled={isPending}>
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue placeholder="Select category">
                    {values.category
                      ? getMaintenanceCategoryDisplayName(values.category)
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {getMaintenanceCategoryDisplayName(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tenants.length > 0 ? (
              <div className="space-y-2">
                <Label>Tenant</Label>
                <Select value={values.tenant_id ?? ""} onValueChange={(v) => updateField("tenant_id", v || undefined)} disabled={isPending}>
                  <SelectTrigger className="min-h-11 w-full">
                    <SelectValue placeholder="Optional">
                      {selectedTenant ? getTenantFullName(selectedTenant) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {getTenantFullName(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-reported`}>Reported date *</Label>
              <Input id={`${formId}-reported`} type="date" value={values.reported_date} onChange={(e) => updateField("reported_date", e.target.value)} disabled={isPending} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-resolved`}>Resolved date</Label>
              <Input id={`${formId}-resolved`} type="date" value={values.resolved_date ?? ""} onChange={(e) => updateField("resolved_date", e.target.value)} disabled={isPending} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-assigned`}>Assigned to</Label>
            <Input id={`${formId}-assigned`} value={values.assigned_to ?? ""} onChange={(e) => updateField("assigned_to", e.target.value)} disabled={isPending} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-est`}>Estimated cost</Label>
              <Input id={`${formId}-est`} type="number" min={0} step="0.01" value={values.estimated_cost ?? ""} onChange={(e) => updateField("estimated_cost", e.target.value ? Number(e.target.value) : undefined)} disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-actual`}>Actual cost</Label>
              <Input id={`${formId}-actual`} type="number" min={0} step="0.01" value={values.actual_cost ?? ""} onChange={(e) => updateField("actual_cost", e.target.value ? Number(e.target.value) : undefined)} disabled={isPending} />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>
        <DialogFooter className="shrink-0 border-t border-border/50 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="min-h-11">Cancel</Button>
          <Button type="submit" form={formId} disabled={isPending} className="min-h-11">{isPending ? "Saving…" : isEditing ? "Save changes" : "Add ticket"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
