"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  createInsurance,
  updateInsurance,
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
import { INSURANCE_TYPES } from "@/lib/properties/constants";
import { getInsuranceTypeDisplayName } from "@/lib/properties/display-names";
import type {
  InsuranceType,
  PropertyInsurance,
  PropertyInsuranceFormInput,
} from "@/lib/properties/types";

function emptyInsuranceForm(propertyId: string): PropertyInsuranceFormInput {
  return {
    property_id: propertyId,
    insurer: "",
    policy_number: "",
    insurance_type: "combined",
    annual_premium: undefined,
    renewal_date: "",
    start_date: "",
    notes: "",
    alerts_enabled: true,
  };
}

function insuranceToFormInput(
  insurance: PropertyInsurance
): PropertyInsuranceFormInput {
  return {
    property_id: insurance.property_id,
    insurer: insurance.insurer,
    policy_number: insurance.policy_number ?? "",
    insurance_type: insurance.insurance_type,
    annual_premium: insurance.annual_premium ?? undefined,
    renewal_date: insurance.renewal_date ?? "",
    start_date: insurance.start_date ?? "",
    notes: insurance.notes ?? "",
    alerts_enabled: insurance.alerts_enabled,
  };
}

type PropertyInsuranceFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  insurance?: PropertyInsurance | null;
};

export function PropertyInsuranceFormDialog({
  open,
  onOpenChange,
  propertyId,
  insurance,
}: PropertyInsuranceFormDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(insurance);
  const [values, setValues] = useState<PropertyInsuranceFormInput>(
    emptyInsuranceForm(propertyId)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = isEditing
    ? `edit-insurance-${insurance?.id}`
    : "add-insurance-form";

  useEffect(() => {
    if (!open) return;
    setValues(
      insurance
        ? insuranceToFormInput(insurance)
        : emptyInsuranceForm(propertyId)
    );
    setError(null);
  }, [open, insurance, propertyId]);

  const updateField = <K extends keyof PropertyInsuranceFormInput>(
    key: K,
    value: PropertyInsuranceFormInput[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = isEditing
        ? await updateInsurance(insurance!.id, values)
        : await createInsurance(values);
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
          <DialogTitle>
            {isEditing ? "Edit insurance" : "Add insurance"}
          </DialogTitle>
          <DialogDescription>
            Track insurer details, premiums, and renewal dates.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-insurer`}>Insurer *</Label>
            <Input
              id={`${formId}-insurer`}
              value={values.insurer}
              onChange={(e) => updateField("insurer", e.target.value)}
              disabled={isPending}
              required
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-policy`}>Policy number</Label>
            <Input
              id={`${formId}-policy`}
              value={values.policy_number ?? ""}
              onChange={(e) => updateField("policy_number", e.target.value)}
              disabled={isPending}
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label>Insurance type</Label>
            <Select
              value={values.insurance_type}
              onValueChange={(v) =>
                v && updateField("insurance_type", v as InsuranceType)
              }
              disabled={isPending}
            >
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue>
                  {getInsuranceTypeDisplayName(values.insurance_type)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {INSURANCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getInsuranceTypeDisplayName(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-premium`}>Annual premium</Label>
            <Input
              id={`${formId}-premium`}
              type="number"
              min={0}
              step="0.01"
              value={values.annual_premium ?? ""}
              onChange={(e) =>
                updateField(
                  "annual_premium",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              disabled={isPending}
              className="min-h-11"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-renewal`}>Renewal date</Label>
              <Input
                id={`${formId}-renewal`}
                type="date"
                value={values.renewal_date ?? ""}
                onChange={(e) => updateField("renewal_date", e.target.value)}
                disabled={isPending}
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-start`}>Start date</Label>
              <Input
                id={`${formId}-start`}
                type="date"
                value={values.start_date ?? ""}
                onChange={(e) => updateField("start_date", e.target.value)}
                disabled={isPending}
                className="min-h-11"
              />
            </div>
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
                Email reminders before renewal date
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
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Add insurance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
