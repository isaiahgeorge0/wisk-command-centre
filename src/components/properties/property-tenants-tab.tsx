"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteTenant } from "@/app/(dashboard)/properties/actions";
import { TenantFormDialog } from "@/components/properties/tenant-form-dialog";
import { TenantStatusBadge } from "@/components/properties/tenant-status-badge";
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
  formatPropertyDate,
  formatRentFrequency,
} from "@/lib/properties/format";
import { getTenantFullName } from "@/lib/properties/tenant-form";
import type { Tenant } from "@/lib/properties/types";

type PropertyTenantsTabProps = {
  propertyId: string;
  tenants: Tenant[];
};

export function PropertyTenantsTab({
  propertyId,
  tenants,
}: PropertyTenantsTabProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteTenant(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  if (tenants.length === 0) {
    return (
      <>
        <EmptyState onAdd={() => { setEditingTenant(null); setFormOpen(true); }} />
        <TenantFormDialog open={formOpen} onOpenChange={setFormOpen} propertyId={propertyId} tenant={editingTenant} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => { setEditingTenant(null); setFormOpen(true); }}
          className="min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90"
        >
          <Plus className="size-4" />
          Add tenant
        </Button>
      </div>

      <div className="space-y-3">
        {tenants.map((tenant) => (
          <div
            key={tenant.id}
            className="rounded-xl border border-border/60 bg-card/40 p-4"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {getTenantFullName(tenant)}
                  </h3>
                  <TenantStatusBadge status={tenant.status} />
                  {tenant.deposit_protected ? (
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                      Deposit protected
                    </Badge>
                  ) : null}
                </div>
                <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                  <p>{tenant.email ?? "No email"}</p>
                  <p>{tenant.phone ?? "No phone"}</p>
                  <p>
                    {formatPropertyDate(tenant.tenancy_start)}
                    {tenant.tenancy_end
                      ? ` → ${formatPropertyDate(tenant.tenancy_end)}`
                      : " → ongoing"}
                  </p>
                  <p>{formatRentFrequency(tenant.rent_amount, tenant.rent_frequency)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 gap-1.5"
                  onClick={() => { setEditingTenant(tenant); setFormOpen(true); }}
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(tenant)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <TenantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        propertyId={propertyId}
        tenant={editingTenant}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <strong>{deleteTarget ? getTenantFullName(deleteTarget) : ""}</strong>.
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
      <h2 className="text-lg font-medium text-foreground">No tenants yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Add your first tenant to track tenancy details and rent.
      </p>
      <Button onClick={onAdd} className="mt-6 min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90">
        <Plus className="size-4" />
        Add tenant
      </Button>
    </div>
  );
}
