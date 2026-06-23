"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  createRentPayment,
  updateRentPayment,
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
import { RENT_PAYMENT_STATUSES } from "@/lib/properties/constants";
import { getRentPaymentStatusDisplayName } from "@/lib/properties/display-names";
import type {
  RentPayment,
  RentPaymentFormInput,
  Tenant,
} from "@/lib/properties/types";
import { getTenantFullName } from "@/lib/properties/tenant-form";

function emptyRentPaymentForm(
  propertyId: string,
  tenantId?: string
): RentPaymentFormInput {
  return {
    property_id: propertyId,
    tenant_id: tenantId ?? "",
    amount: 0,
    due_date: new Date().toISOString().slice(0, 10),
    status: "pending",
    payment_method: "",
    notes: "",
  };
}

function paymentToFormInput(payment: RentPayment): RentPaymentFormInput {
  return {
    property_id: payment.property_id,
    tenant_id: payment.tenant_id,
    amount: payment.amount,
    due_date: payment.due_date,
    paid_date: payment.paid_date ?? "",
    status: payment.status,
    payment_method: payment.payment_method ?? "",
    notes: payment.notes ?? "",
  };
}

type RentPaymentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenants: Tenant[];
  payment?: RentPayment | null;
};

export function RentPaymentFormDialog({
  open,
  onOpenChange,
  propertyId,
  tenants,
  payment,
}: RentPaymentFormDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(payment);
  const [values, setValues] = useState<RentPaymentFormInput>(
    emptyRentPaymentForm(propertyId, tenants[0]?.id)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = isEditing ? `edit-payment-${payment?.id}` : "add-payment-form";

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === values.tenant_id),
    [tenants, values.tenant_id]
  );

  useEffect(() => {
    if (!open) return;
    setValues(
      payment
        ? paymentToFormInput(payment)
        : emptyRentPaymentForm(propertyId, tenants[0]?.id)
    );
    setError(null);
  }, [open, payment, propertyId, tenants]);

  const updateField = <K extends keyof RentPaymentFormInput>(
    key: K,
    value: RentPaymentFormInput[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = isEditing
        ? await updateRentPayment(payment!.id, values)
        : await createRentPayment(values);
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit payment" : "Add rent payment"}</DialogTitle>
          <DialogDescription>Record rent due, received, and payment status.</DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tenant *</Label>
            <Select
              value={values.tenant_id}
              onValueChange={(v) => v && updateField("tenant_id", v)}
              disabled={isPending || tenants.length === 0}
            >
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue placeholder="Select tenant">
                  {selectedTenant ? getTenantFullName(selectedTenant) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{getTenantFullName(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-amount`}>Amount *</Label>
              <Input id={`${formId}-amount`} type="number" min={0} step="0.01" value={values.amount} onChange={(e) => updateField("amount", Number(e.target.value))} disabled={isPending} required />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={values.status} onValueChange={(v) => v && updateField("status", v as RentPaymentFormInput["status"])} disabled={isPending}>
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue>{getRentPaymentStatusDisplayName(values.status)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {RENT_PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{getRentPaymentStatusDisplayName(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-due`}>Due date *</Label>
              <Input id={`${formId}-due`} type="date" value={values.due_date} onChange={(e) => updateField("due_date", e.target.value)} disabled={isPending} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-paid`}>Paid date</Label>
              <Input id={`${formId}-paid`} type="date" value={values.paid_date ?? ""} onChange={(e) => updateField("paid_date", e.target.value)} disabled={isPending} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-method`}>Payment method</Label>
            <Input id={`${formId}-method`} value={values.payment_method ?? ""} onChange={(e) => updateField("payment_method", e.target.value)} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-notes`}>Notes</Label>
            <Textarea id={`${formId}-notes`} value={values.notes ?? ""} onChange={(e) => updateField("notes", e.target.value)} disabled={isPending} rows={3} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="min-h-11">Cancel</Button>
          <Button type="submit" form={formId} disabled={isPending || !values.tenant_id} className="min-h-11">{isPending ? "Saving…" : isEditing ? "Save changes" : "Add payment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
