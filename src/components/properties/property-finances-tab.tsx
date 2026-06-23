"use client";

import { CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteRentPayment,
  updateRentPayment,
} from "@/app/(dashboard)/properties/actions";
import { RentPaymentFormDialog } from "@/components/properties/rent-payment-form-dialog";
import { RentPaymentStatusBadge } from "@/components/properties/rent-payment-status-badge";
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
import { Button } from "@/components/ui/button";
import {
  formatPropertyCurrency,
  formatPropertyDate,
} from "@/lib/properties/format";
import { buildPropertyFinanceStats } from "@/lib/properties/selectors";
import type { RentPaymentWithDetails, Tenant } from "@/lib/properties/types";

type PropertyFinancesTabProps = {
  propertyId: string;
  payments: RentPaymentWithDetails[];
  tenants: Tenant[];
};

export function PropertyFinancesTab({
  propertyId,
  payments,
  tenants,
}: PropertyFinancesTabProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RentPaymentWithDetails | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RentPaymentWithDetails | null>(null);
  const [isPending, startTransition] = useTransition();
  const stats = buildPropertyFinanceStats(payments);

  const handleMarkPaid = (payment: RentPaymentWithDetails) => {
    startTransition(async () => {
      await updateRentPayment(payment.id, {
        status: "paid",
        paid_date: new Date().toISOString().slice(0, 10),
      });
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteRentPayment(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  if (payments.length === 0 && tenants.length === 0) {
    return (
      <>
        <EmptyState onAdd={() => { setEditingPayment(null); setFormOpen(true); }} />
        <RentPaymentFormDialog open={formOpen} onOpenChange={setFormOpen} propertyId={propertyId} tenants={tenants} payment={editingPayment} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Expected this month" value={formatPropertyCurrency(stats.expectedThisMonth)} />
        <StatTile label="Received this month" value={formatPropertyCurrency(stats.receivedThisMonth)} />
        <StatTile label="Outstanding" value={formatPropertyCurrency(stats.outstanding)} />
        <StatTile label="Total received" value={formatPropertyCurrency(stats.totalReceivedAllTime)} />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => { setEditingPayment(null); setFormOpen(true); }}
          disabled={tenants.length === 0}
          className="min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90"
        >
          <Plus className="size-4" />
          Add payment
        </Button>
      </div>

      {payments.length === 0 ? (
        <EmptyState onAdd={() => { setEditingPayment(null); setFormOpen(true); }} />
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <div key={payment.id} className="rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{payment.tenant_name}</p>
                    <RentPaymentStatusBadge status={payment.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Due {formatPropertyDate(payment.due_date)} · {formatPropertyCurrency(payment.amount)}
                    {payment.paid_date ? ` · Paid ${formatPropertyDate(payment.paid_date)}` : ""}
                    {payment.payment_method ? ` · ${payment.payment_method}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(payment.status === "pending" || payment.status === "late") ? (
                    <Button variant="outline" size="sm" className="min-h-11 gap-1.5" onClick={() => handleMarkPaid(payment)} disabled={isPending}>
                      <CheckCircle2 className="size-4" />
                      Mark paid
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" className="min-h-11" onClick={() => { setEditingPayment(payment); setFormOpen(true); }}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-11 text-destructive" onClick={() => setDeleteTarget(payment)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <RentPaymentFormDialog open={formOpen} onOpenChange={setFormOpen} propertyId={propertyId} tenants={tenants} payment={editingPayment} />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this rent payment record.
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

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-500/15 bg-card/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-16 text-center">
      <h2 className="text-lg font-medium text-foreground">No rent payments recorded</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Add a payment to start tracking rent collection.
      </p>
      <Button onClick={onAdd} className="mt-6 min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90">
        <Plus className="size-4" />
        Add payment
      </Button>
    </div>
  );
}
