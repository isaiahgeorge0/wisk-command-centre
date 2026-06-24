"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  createComparable,
  updateComparable,
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
import type {
  ComparableType,
  PropertyComparable,
  PropertyComparableFormInput,
} from "@/lib/properties/types";

function emptyComparableForm(propertyId: string): PropertyComparableFormInput {
  return {
    property_id: propertyId,
    address: "",
    comparable_type: "rental",
    price: 0,
    date: "",
    source: "",
    bedrooms: undefined,
    property_type: "",
    notes: "",
  };
}

function comparableToFormInput(
  comparable: PropertyComparable
): PropertyComparableFormInput {
  return {
    property_id: comparable.property_id,
    address: comparable.address,
    comparable_type: comparable.comparable_type,
    price: comparable.price,
    date: comparable.date ?? "",
    source: comparable.source ?? "",
    bedrooms: comparable.bedrooms ?? undefined,
    property_type: comparable.property_type ?? "",
    notes: comparable.notes ?? "",
  };
}

type PropertyComparableFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  comparable?: PropertyComparable | null;
};

export function PropertyComparableFormDialog({
  open,
  onOpenChange,
  propertyId,
  comparable,
}: PropertyComparableFormDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(comparable);
  const [values, setValues] = useState<PropertyComparableFormInput>(
    emptyComparableForm(propertyId)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = isEditing
    ? `edit-comparable-${comparable?.id}`
    : "add-comparable-form";

  useEffect(() => {
    if (!open) return;
    setValues(
      comparable
        ? comparableToFormInput(comparable)
        : emptyComparableForm(propertyId)
    );
    setError(null);
  }, [open, comparable, propertyId]);

  const updateField = <K extends keyof PropertyComparableFormInput>(
    key: K,
    value: PropertyComparableFormInput[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = isEditing
        ? await updateComparable(comparable!.id, values)
        : await createComparable(values);
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
            {isEditing ? "Edit comparable" : "Add comparable"}
          </DialogTitle>
          <DialogDescription>
            Add a rental or sale comparable from Rightmove, Zoopla, or a local
            agent.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-address`}>Address *</Label>
            <Input
              id={`${formId}-address`}
              value={values.address}
              onChange={(e) => updateField("address", e.target.value)}
              disabled={isPending}
              required
              className="min-h-11"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={values.comparable_type}
                onValueChange={(v) =>
                  v && updateField("comparable_type", v as ComparableType)
                }
                disabled={isPending}
              >
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rental">Rental</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-price`}>Price *</Label>
              <Input
                id={`${formId}-price`}
                type="number"
                min={0}
                step="0.01"
                value={values.price}
                onChange={(e) =>
                  updateField("price", Number(e.target.value))
                }
                disabled={isPending}
                required
                className="min-h-11"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-date`}>Date</Label>
              <Input
                id={`${formId}-date`}
                type="date"
                value={values.date ?? ""}
                onChange={(e) => updateField("date", e.target.value)}
                disabled={isPending}
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-source`}>Source</Label>
              <Input
                id={`${formId}-source`}
                value={values.source ?? ""}
                onChange={(e) => updateField("source", e.target.value)}
                disabled={isPending}
                placeholder="Rightmove, Zoopla, Agent"
                className="min-h-11"
              />
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
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-ptype`}>Property type</Label>
              <Input
                id={`${formId}-ptype`}
                value={values.property_type ?? ""}
                onChange={(e) => updateField("property_type", e.target.value)}
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
          <Button type="submit" form={formId} disabled={isPending} className="min-h-11">
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Add comparable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
