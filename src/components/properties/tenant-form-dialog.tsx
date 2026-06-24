"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Bell } from "lucide-react";

import { createTenant, updateTenant } from "@/app/(dashboard)/properties/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { TENANT_STATUSES } from "@/lib/properties/constants";
import {
  getRentFrequencyDisplayName,
  getTenantStatusDisplayName,
} from "@/lib/properties/display-names";
import {
  EMPTY_TENANT_FORM,
  tenantToFormInput,
} from "@/lib/properties/tenant-form";
import type { Tenant, TenantFormInput } from "@/lib/properties/types";

type TenantFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  tenant?: Tenant | null;
};

export function TenantFormDialog({
  open,
  onOpenChange,
  propertyId,
  tenant,
}: TenantFormDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(tenant);
  const [values, setValues] = useState<TenantFormInput>(EMPTY_TENANT_FORM(propertyId));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = isEditing ? `edit-tenant-${tenant?.id}` : "add-tenant-form";

  useEffect(() => {
    if (!open) return;
    setValues(tenant ? tenantToFormInput(tenant) : EMPTY_TENANT_FORM(propertyId));
    setError(null);
  }, [open, tenant, propertyId]);

  const updateField = <K extends keyof TenantFormInput>(
    key: K,
    value: TenantFormInput[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = isEditing
        ? await updateTenant(tenant!.id, values)
        : await createTenant(values);
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
          <DialogTitle>{isEditing ? "Edit tenant" : "Add tenant"}</DialogTitle>
          <DialogDescription>
            Record tenant details, tenancy dates, and rent information.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-first`}>First name *</Label>
              <Input id={`${formId}-first`} value={values.first_name} onChange={(e) => updateField("first_name", e.target.value)} disabled={isPending} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-last`}>Last name *</Label>
              <Input id={`${formId}-last`} value={values.last_name} onChange={(e) => updateField("last_name", e.target.value)} disabled={isPending} required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-email`}>Email</Label>
              <Input id={`${formId}-email`} type="email" value={values.email ?? ""} onChange={(e) => updateField("email", e.target.value)} disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-phone`}>Phone</Label>
              <Input id={`${formId}-phone`} value={values.phone ?? ""} onChange={(e) => updateField("phone", e.target.value)} disabled={isPending} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-start`}>Tenancy start *</Label>
              <Input id={`${formId}-start`} type="date" value={values.tenancy_start} onChange={(e) => updateField("tenancy_start", e.target.value)} disabled={isPending} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-end`}>Tenancy end</Label>
              <Input id={`${formId}-end`} type="date" value={values.tenancy_end ?? ""} onChange={(e) => updateField("tenancy_end", e.target.value)} disabled={isPending} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-rent`}>Rent amount *</Label>
              <Input id={`${formId}-rent`} type="number" min={0} step="0.01" value={values.rent_amount} onChange={(e) => updateField("rent_amount", Number(e.target.value))} disabled={isPending} required />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={values.rent_frequency} onValueChange={(v) => v && updateField("rent_frequency", v as TenantFormInput["rent_frequency"])} disabled={isPending}>
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue>{getRentFrequencyDisplayName(values.rent_frequency)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{getRentFrequencyDisplayName("monthly")}</SelectItem>
                  <SelectItem value="weekly">{getRentFrequencyDisplayName("weekly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={values.status} onValueChange={(v) => v && updateField("status", v as TenantFormInput["status"])} disabled={isPending}>
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue>{getTenantStatusDisplayName(values.status)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TENANT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{getTenantStatusDisplayName(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-deposit`}>Deposit amount</Label>
            <Input id={`${formId}-deposit`} type="number" min={0} step="0.01" value={values.deposit_amount ?? ""} onChange={(e) => updateField("deposit_amount", e.target.value ? Number(e.target.value) : undefined)} disabled={isPending} />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <Checkbox checked={values.deposit_protected} onCheckedChange={(c) => updateField("deposit_protected", c === true)} disabled={isPending} />
            Deposit protected
          </label>

          <div className="space-y-4 border-t border-border/60 pt-4">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">Rent reminders</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-rent-due-day`}>
                Day of month rent is due (e.g. 1 for 1st of month)
              </Label>
              <Input
                id={`${formId}-rent-due-day`}
                type="number"
                min={1}
                max={28}
                value={values.rent_due_day ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  updateField(
                    "rent_due_day",
                    raw === "" ? null : Number(raw)
                  );
                }}
                disabled={isPending}
                placeholder="Not set"
              />
            </div>
            {values.rent_due_day != null ? (
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <Checkbox
                    checked={values.rent_reminder_enabled ?? true}
                    onCheckedChange={(c) =>
                      updateField("rent_reminder_enabled", c === true)
                    }
                    disabled={isPending}
                  />
                  Send rent reminder email
                </label>
                {values.rent_reminder_enabled !== false ? (
                  <div className="space-y-2">
                    <Label>Remind me</Label>
                    <Select
                      value={String(values.rent_reminder_days ?? 0)}
                      onValueChange={(v) =>
                        v && updateField("rent_reminder_days", Number(v))
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger className="min-h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">On the due date</SelectItem>
                        {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            {day} day{day === 1 ? "" : "s"} after
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-notes`}>Notes</Label>
            <Textarea id={`${formId}-notes`} value={values.notes ?? ""} onChange={(e) => updateField("notes", e.target.value)} disabled={isPending} rows={3} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="min-h-11">Cancel</Button>
          <Button type="submit" form={formId} disabled={isPending} className="min-h-11">{isPending ? "Saving…" : isEditing ? "Save changes" : "Add tenant"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
