"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  createCertificate,
  updateCertificate,
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
import { CERTIFICATE_TYPES } from "@/lib/properties/constants";
import { getCertificateTypeDisplayName } from "@/lib/properties/display-names";
import type {
  PropertyCertificate,
  PropertyCertificateFormInput,
} from "@/lib/properties/types";

function emptyCertificateForm(
  propertyId: string
): PropertyCertificateFormInput {
  return {
    property_id: propertyId,
    certificate_type: "gas_safety",
    issue_date: "",
    expiry_date: "",
    notes: "",
  };
}

function certificateToFormInput(
  certificate: PropertyCertificate
): PropertyCertificateFormInput {
  return {
    property_id: certificate.property_id,
    certificate_type: certificate.certificate_type,
    issue_date: certificate.issue_date ?? "",
    expiry_date: certificate.expiry_date ?? "",
    notes: certificate.notes ?? "",
  };
}

type CertificateFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  certificate?: PropertyCertificate | null;
};

export function CertificateFormDialog({
  open,
  onOpenChange,
  propertyId,
  certificate,
}: CertificateFormDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(certificate);
  const [values, setValues] = useState<PropertyCertificateFormInput>(
    emptyCertificateForm(propertyId)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = isEditing
    ? `edit-certificate-${certificate?.id}`
    : "add-certificate-form";

  useEffect(() => {
    if (!open) return;
    setValues(
      certificate
        ? certificateToFormInput(certificate)
        : emptyCertificateForm(propertyId)
    );
    setError(null);
  }, [open, certificate, propertyId]);

  const updateField = <K extends keyof PropertyCertificateFormInput>(
    key: K,
    value: PropertyCertificateFormInput[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = isEditing
        ? await updateCertificate(certificate!.id, values)
        : await createCertificate(values);
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
            {isEditing ? "Edit certificate" : "Add certificate"}
          </DialogTitle>
          <DialogDescription>
            Track compliance certificates and expiry dates.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Certificate type *</Label>
            <Select
              value={values.certificate_type}
              onValueChange={(v) =>
                v &&
                updateField(
                  "certificate_type",
                  v as PropertyCertificateFormInput["certificate_type"]
                )
              }
              disabled={isPending}
            >
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue>
                  {getCertificateTypeDisplayName(values.certificate_type)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CERTIFICATE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getCertificateTypeDisplayName(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-issue`}>Issue date</Label>
              <Input
                id={`${formId}-issue`}
                type="date"
                value={values.issue_date ?? ""}
                onChange={(e) => updateField("issue_date", e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-expiry`}>Expiry date</Label>
              <Input
                id={`${formId}-expiry`}
                type="date"
                value={values.expiry_date ?? ""}
                onChange={(e) => updateField("expiry_date", e.target.value)}
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
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="min-h-11"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={isPending}
            className="min-h-11"
          >
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Add certificate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
