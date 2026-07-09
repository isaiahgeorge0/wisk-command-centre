"use client";

import { Pencil, Plus, Trash2, UserPlus, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteTenant,
  inviteTenantToPortal,
  revokeTenantPortalAccess,
} from "@/app/(dashboard)/properties/actions";
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
import { cn } from "@/lib/utils";

type PropertyTenantsTabProps = {
  propertyId: string;
  tenants: Tenant[];
};

function getPortalStatus(tenant: Tenant): {
  label: string;
  className: string;
} {
  if (tenant.portal_user_id) {
    return {
      label: "Portal active",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  if (tenant.portal_enabled) {
    return {
      label: "Awaiting setup",
      className:
        "border-amber-500/30 bg-wisk-ferrari/10 text-amber-700 dark:text-amber-300",
    };
  }

  return {
    label: "Not invited",
    className: "border-border bg-muted text-muted-foreground",
  };
}

export function PropertyTenantsTab({
  propertyId,
  tenants,
}: PropertyTenantsTabProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Tenant | null>(null);
  const [portalMessage, setPortalMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteTenant(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  const handleInvite = (tenant: Tenant) => {
    setPortalMessage(null);
    startTransition(async () => {
      const result = await inviteTenantToPortal(tenant.id);
      if (result.success) {
        setPortalMessage(result.data?.message ?? "Invite sent.");
      } else {
        setPortalMessage(result.error);
      }
      router.refresh();
    });
  };

  const handleRevoke = () => {
    if (!revokeTarget) return;
    startTransition(async () => {
      const result = await revokeTenantPortalAccess(revokeTarget.id);
      setRevokeTarget(null);
      if (!result.success) {
        setPortalMessage(result.error);
      } else {
        setPortalMessage("Portal access revoked.");
      }
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
      {portalMessage ? (
        <p className="rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-sm text-muted-foreground">
          {portalMessage}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button
          onClick={() => { setEditingTenant(null); setFormOpen(true); }}
          className="min-h-11 gap-2 bg-wisk-ferrari text-white hover:bg-wisk-ferrari/90"
        >
          <Plus className="size-4" />
          Add tenant
        </Button>
      </div>

      <div className="space-y-3">
        {tenants.map((tenant) => {
          const portalStatus = getPortalStatus(tenant);
          const canInvite = !tenant.portal_enabled && Boolean(tenant.email?.trim());
          const canRevoke = Boolean(tenant.portal_user_id);

          return (
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
                  <Badge variant="outline" className={cn("font-medium", portalStatus.className)}>
                    {portalStatus.label}
                  </Badge>
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
                  {tenant.rent_due_day != null ? (
                    <p>
                      Rent due: {tenant.rent_due_day}
                      {tenant.rent_due_day === 1
                        ? "st"
                        : tenant.rent_due_day === 2
                          ? "nd"
                          : tenant.rent_due_day === 3
                            ? "rd"
                            : "th"}{" "}
                      of month
                      {tenant.rent_reminder_enabled
                        ? ` · reminders ${tenant.rent_reminder_days === 0 ? "on due date" : `${tenant.rent_reminder_days} day${tenant.rent_reminder_days === 1 ? "" : "s"} after`}`
                        : " · reminders off"}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canInvite ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 gap-1.5"
                    disabled={isPending}
                    onClick={() => handleInvite(tenant)}
                  >
                    <UserPlus className="size-4" />
                    Invite to portal
                  </Button>
                ) : null}
                {canRevoke ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 gap-1.5 text-destructive hover:text-destructive"
                    disabled={isPending}
                    onClick={() => setRevokeTarget(tenant)}
                  >
                    <UserX className="size-4" />
                    Revoke access
                  </Button>
                ) : null}
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
          );
        })}
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

      <AlertDialog open={Boolean(revokeTarget)} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke portal access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove portal access for{" "}
              <strong>{revokeTarget ? getTenantFullName(revokeTarget) : ""}</strong>{" "}
              and delete their login account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} className="min-h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleRevoke} disabled={isPending} className="min-h-11">
              {isPending ? "Revoking…" : "Revoke access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-wisk-ferrari/20 bg-card/40 px-6 py-16 text-center">
      <h2 className="text-lg font-medium text-foreground">No tenants yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Add your first tenant to track tenancy details and rent.
      </p>
      <Button onClick={onAdd} className="mt-6 min-h-11 gap-2 bg-wisk-ferrari text-white hover:bg-wisk-ferrari/90">
        <Plus className="size-4" />
        Add tenant
      </Button>
    </div>
  );
}
