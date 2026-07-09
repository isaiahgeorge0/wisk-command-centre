"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  createMortgage,
  updateMortgage,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MORTGAGE_TYPES } from "@/lib/properties/constants";
import { getMortgageTypeDisplayName } from "@/lib/properties/display-names";
import type {
  MortgageType,
  PropertyMortgage,
  PropertyMortgageFormInput,
} from "@/lib/properties/types";

function emptyMortgageForm(propertyId: string): PropertyMortgageFormInput {
  return {
    property_id: propertyId,
    lender: "",
    account_reference: "",
    monthly_payment: 0,
    interest_rate: undefined,
    mortgage_type: "repayment",
    fixed_rate_end_date: "",
    mortgage_end_date: "",
    outstanding_balance: undefined,
    notes: "",
    alerts_enabled: true,
  };
}

function mortgageToFormInput(mortgage: PropertyMortgage): PropertyMortgageFormInput {
  return {
    property_id: mortgage.property_id,
    lender: mortgage.lender,
    account_reference: mortgage.account_reference ?? "",
    monthly_payment: mortgage.monthly_payment,
    interest_rate: mortgage.interest_rate ?? undefined,
    mortgage_type: mortgage.mortgage_type,
    fixed_rate_end_date: mortgage.fixed_rate_end_date ?? "",
    mortgage_end_date: mortgage.mortgage_end_date ?? "",
    outstanding_balance: mortgage.outstanding_balance ?? undefined,
    notes: mortgage.notes ?? "",
    alerts_enabled: mortgage.alerts_enabled,
  };
}

type PropertyMortgageFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  mortgage?: PropertyMortgage | null;
};

export function PropertyMortgageFormDialog({
  open,
  onOpenChange,
  propertyId,
  mortgage,
}: PropertyMortgageFormDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(mortgage);
  const [values, setValues] = useState<PropertyMortgageFormInput>(
    emptyMortgageForm(propertyId)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = isEditing ? `edit-mortgage-${mortgage?.id}` : "add-mortgage-form";

  useEffect(() => {
    if (!open) return;
    setValues(
      mortgage ? mortgageToFormInput(mortgage) : emptyMortgageForm(propertyId)
    );
    setError(null);
  }, [open, mortgage, propertyId]);

  const updateField = <K extends keyof PropertyMortgageFormInput>(
    key: K,
    value: PropertyMortgageFormInput[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = isEditing
        ? await updateMortgage(mortgage!.id, values)
        : await createMortgage(values);
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
          <DialogTitle>{isEditing ? "Edit mortgage" : "Add mortgage"}</DialogTitle>
          <DialogDescription>
            Track lender details, payments, and fixed rate end dates.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-lender`}>Lender *</Label>
            <Input
              id={`${formId}-lender`}
              value={values.lender}
              onChange={(e) => updateField("lender", e.target.value)}
              disabled={isPending}
              required
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-account`}>Account reference</Label>
            <Input
              id={`${formId}-account`}
              value={values.account_reference ?? ""}
              onChange={(e) => updateField("account_reference", e.target.value)}
              disabled={isPending}
              className="min-h-11"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-payment`}>Monthly payment *</Label>
              <Input
                id={`${formId}-payment`}
                type="number"
                min={0}
                step="0.01"
                value={values.monthly_payment}
                onChange={(e) =>
                  updateField("monthly_payment", Number(e.target.value))
                }
                disabled={isPending}
                required
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-rate`}>Interest rate (%)</Label>
              <Input
                id={`${formId}-rate`}
                type="number"
                min={0}
                step="0.01"
                value={values.interest_rate ?? ""}
                onChange={(e) =>
                  updateField(
                    "interest_rate",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                disabled={isPending}
                className="min-h-11"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Mortgage type</Label>
            <Select
              value={values.mortgage_type}
              onValueChange={(v) =>
                v && updateField("mortgage_type", v as MortgageType)
              }
              disabled={isPending}
            >
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue>
                  {getMortgageTypeDisplayName(values.mortgage_type)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MORTGAGE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getMortgageTypeDisplayName(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-fixed-end`}>Fixed rate end date</Label>
              <Input
                id={`${formId}-fixed-end`}
                type="date"
                value={values.fixed_rate_end_date ?? ""}
                onChange={(e) =>
                  updateField("fixed_rate_end_date", e.target.value)
                }
                disabled={isPending}
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-mortgage-end`}>Mortgage end date</Label>
              <Input
                id={`${formId}-mortgage-end`}
                type="date"
                value={values.mortgage_end_date ?? ""}
                onChange={(e) =>
                  updateField("mortgage_end_date", e.target.value)
                }
                disabled={isPending}
                className="min-h-11"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-balance`}>Outstanding balance</Label>
            <Input
              id={`${formId}-balance`}
              type="number"
              min={0}
              step="0.01"
              value={values.outstanding_balance ?? ""}
              onChange={(e) =>
                updateField(
                  "outstanding_balance",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              disabled={isPending}
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-notes`}>Notes</Label>
            <Textarea
              id={`${formId}-notes`}
              value={values.notes ?? ""}
              onChange={(e) => updateField("notes", e.target.value)}
              disabled={isPending}
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
            <div>
              <Label htmlFor={`${formId}-alerts`}>Reminder alerts</Label>
              <p className="text-xs text-muted-foreground">
                Email reminders before fixed rate ends
              </p>
            </div>
            <Switch
              id={`${formId}-alerts`}
              checked={values.alerts_enabled}
              onCheckedChange={(checked) =>
                updateField("alerts_enabled", checked)
              }
              disabled={isPending}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="min-h-11"
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isPending} className="min-h-11 bg-wisk-ferrari text-white hover:bg-wisk-ferrari/90">
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Add mortgage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
