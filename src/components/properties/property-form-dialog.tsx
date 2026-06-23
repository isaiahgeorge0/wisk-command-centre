"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  createProperty,
  updateProperty,
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
import { PROPERTY_STATUSES, PROPERTY_TYPES } from "@/lib/properties/constants";
import {
  getPropertyStatusDisplayName,
  getPropertyTypeDisplayName,
} from "@/lib/properties/display-names";
import { EMPTY_PROPERTY_FORM, propertyToFormInput } from "@/lib/properties/form";
import type { Property, PropertyFormInput } from "@/lib/properties/types";

type PropertyFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property | null;
  onSaved?: (property: Property) => void;
};

export function PropertyFormDialog({
  open,
  onOpenChange,
  property,
  onSaved,
}: PropertyFormDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(property);
  const [values, setValues] = useState<PropertyFormInput>(EMPTY_PROPERTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = isEditing ? `edit-property-${property?.id}` : "add-property-form";

  useEffect(() => {
    if (!open) {
      setValues(EMPTY_PROPERTY_FORM);
      setError(null);
      return;
    }
    setValues(property ? propertyToFormInput(property) : EMPTY_PROPERTY_FORM);
    setError(null);
  }, [open, property]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValues(EMPTY_PROPERTY_FORM);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const updateField = <K extends keyof PropertyFormInput>(
    key: K,
    value: PropertyFormInput[K]
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = isEditing
        ? await updateProperty(property!.id, values)
        : await createProperty(values);

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (result.data) {
        onSaved?.(result.data);
      }
      handleOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit property" : "Add property"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update property details. Required fields are marked with *."
              : "Add a new property to your portfolio. Required fields are marked with *."}
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-name`}>Name *</Label>
            <Input
              id={`${formId}-name`}
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-address1`}>Address line 1 *</Label>
            <Input
              id={`${formId}-address1`}
              value={values.address_line1}
              onChange={(e) => updateField("address_line1", e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-address2`}>Address line 2</Label>
            <Input
              id={`${formId}-address2`}
              value={values.address_line2 ?? ""}
              onChange={(e) => updateField("address_line2", e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-city`}>City *</Label>
              <Input
                id={`${formId}-city`}
                value={values.city}
                onChange={(e) => updateField("city", e.target.value)}
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-postcode`}>Postcode *</Label>
              <Input
                id={`${formId}-postcode`}
                value={values.postcode}
                onChange={(e) => updateField("postcode", e.target.value)}
                disabled={isPending}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Property type *</Label>
              <Select
                value={values.property_type}
                onValueChange={(value) =>
                  updateField("property_type", value as PropertyFormInput["property_type"])
                }
                disabled={isPending}
              >
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue>
                    {getPropertyTypeDisplayName(values.property_type)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getPropertyTypeDisplayName(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select
                value={values.status}
                onValueChange={(value) =>
                  updateField("status", value as PropertyFormInput["status"])
                }
                disabled={isPending}
              >
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue>
                    {getPropertyStatusDisplayName(values.status)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getPropertyStatusDisplayName(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-bedrooms`}>Bedrooms</Label>
              <Input
                id={`${formId}-bedrooms`}
                type="number"
                min={0}
                value={values.bedrooms ?? ""}
                onChange={(e) =>
                  updateField(
                    "bedrooms",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-bathrooms`}>Bathrooms</Label>
              <Input
                id={`${formId}-bathrooms`}
                type="number"
                min={0}
                value={values.bathrooms ?? ""}
                onChange={(e) =>
                  updateField(
                    "bathrooms",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-rent`}>Monthly rent</Label>
              <Input
                id={`${formId}-rent`}
                type="number"
                min={0}
                step="0.01"
                value={values.monthly_rent ?? ""}
                onChange={(e) =>
                  updateField(
                    "monthly_rent",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-purchase`}>Purchase price</Label>
              <Input
                id={`${formId}-purchase`}
                type="number"
                min={0}
                step="0.01"
                value={values.purchase_price ?? ""}
                onChange={(e) =>
                  updateField(
                    "purchase_price",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-value`}>Current value</Label>
              <Input
                id={`${formId}-value`}
                type="number"
                min={0}
                step="0.01"
                value={values.current_value ?? ""}
                onChange={(e) =>
                  updateField(
                    "current_value",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                disabled={isPending}
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

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
            className="min-h-11"
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isPending} className="min-h-11">
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Add property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
