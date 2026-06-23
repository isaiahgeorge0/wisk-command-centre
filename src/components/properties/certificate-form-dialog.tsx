"use client";

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import {
  createCertificate,
  linkDocumentToCertificate,
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
import {
  calculateExpiryDate,
  getCertificateDuration,
} from "@/lib/properties/certificate-utils";
import { CERTIFICATE_TYPES } from "@/lib/properties/constants";
import {
  getCertificateTypeDisplayName,
  getPropertyDocumentTypeDisplayName,
} from "@/lib/properties/display-names";
import type {
  CertificateType,
  PropertyCertificate,
  PropertyCertificateFormInput,
  PropertyDocument,
  PropertyType,
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
  propertyType: PropertyType;
  documents: PropertyDocument[];
  certificate?: PropertyCertificate | null;
};

export function CertificateFormDialog({
  open,
  onOpenChange,
  propertyId,
  propertyType,
  documents,
  certificate,
}: CertificateFormDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(certificate);
  const [values, setValues] = useState<PropertyCertificateFormInput>(
    emptyCertificateForm(propertyId)
  );
  const [linkedDocumentId, setLinkedDocumentId] = useState<string | null>(null);
  const [initialLinkedDocumentId, setInitialLinkedDocumentId] = useState<
    string | null
  >(null);
  const [autoPopulatedExpiry, setAutoPopulatedExpiry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = isEditing
    ? `edit-certificate-${certificate?.id}`
    : "add-certificate-form";

  const activeDuration = useMemo(
    () => getCertificateDuration(values.certificate_type, propertyType),
    [values.certificate_type, propertyType]
  );

  const selectedDocument = useMemo(
    () => documents.find((d) => d.id === linkedDocumentId),
    [documents, linkedDocumentId]
  );

  const applyAutoExpiry = useCallback(
    (
      certificateType: CertificateType,
      issueDate: string | undefined,
      setValuesFn: typeof setValues
    ) => {
      const duration = getCertificateDuration(certificateType, propertyType);
      if (!duration || !issueDate?.trim()) {
        setAutoPopulatedExpiry(false);
        return;
      }
      const expiry = calculateExpiryDate(issueDate, duration.years);
      setValuesFn((prev) => ({ ...prev, expiry_date: expiry }));
      setAutoPopulatedExpiry(true);
    },
    [propertyType]
  );

  useEffect(() => {
    if (!open) return;

    if (certificate) {
      setValues(certificateToFormInput(certificate));
      const linked = documents.find((d) => d.certificate_id === certificate.id);
      setLinkedDocumentId(linked?.id ?? null);
      setInitialLinkedDocumentId(linked?.id ?? null);
    } else {
      setValues(emptyCertificateForm(propertyId));
      setLinkedDocumentId(null);
      setInitialLinkedDocumentId(null);
    }
    setAutoPopulatedExpiry(false);
    setError(null);
  }, [open, certificate, propertyId, documents, applyAutoExpiry]);

  const updateField = <K extends keyof PropertyCertificateFormInput>(
    key: K,
    value: PropertyCertificateFormInput[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleCertificateTypeChange = (type: CertificateType) => {
    updateField("certificate_type", type);
    applyAutoExpiry(type, values.issue_date, setValues);
  };

  const handleIssueDateChange = (issueDate: string) => {
    updateField("issue_date", issueDate);
    applyAutoExpiry(values.certificate_type, issueDate, setValues);
  };

  const handleExpiryDateChange = (expiryDate: string) => {
    setAutoPopulatedExpiry(false);
    updateField("expiry_date", expiryDate);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      if (
        isEditing &&
        initialLinkedDocumentId &&
        initialLinkedDocumentId !== linkedDocumentId
      ) {
        await linkDocumentToCertificate(initialLinkedDocumentId, null);
      }

      let documentArg: string | null | undefined = undefined;
      if (linkedDocumentId) {
        documentArg = linkedDocumentId;
      } else if (isEditing && initialLinkedDocumentId) {
        documentArg = null;
      }

      const result = isEditing
        ? await updateCertificate(certificate!.id, values, documentArg)
        : await createCertificate(values, linkedDocumentId ?? undefined);

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
                v && handleCertificateTypeChange(v as CertificateType)
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
            {activeDuration?.note ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <Info
                  className="mt-0.5 size-4 shrink-0 text-amber-500"
                  aria-hidden
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {activeDuration.note}
                </p>
              </div>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-issue`}>Issue date</Label>
              <Input
                id={`${formId}-issue`}
                type="date"
                value={values.issue_date ?? ""}
                onChange={(e) => handleIssueDateChange(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-expiry`}>Expiry date</Label>
              <Input
                id={`${formId}-expiry`}
                type="date"
                value={values.expiry_date ?? ""}
                onChange={(e) => handleExpiryDateChange(e.target.value)}
                disabled={isPending}
              />
              {autoPopulatedExpiry && activeDuration ? (
                <p className="text-xs text-muted-foreground">
                  Auto-calculated based on standard{" "}
                  {getCertificateTypeDisplayName(values.certificate_type)}{" "}
                  duration ({activeDuration.years}{" "}
                  {activeDuration.years === 1 ? "year" : "years"})
                </p>
              ) : null}
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

          {documents.length > 0 ? (
            <div className="space-y-2">
              <Label>Link to document</Label>
              <Select
                value={linkedDocumentId ?? "none"}
                onValueChange={(v) =>
                  setLinkedDocumentId(v === "none" ? null : v)
                }
                disabled={isPending}
              >
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue placeholder="None">
                    {selectedDocument
                      ? `${selectedDocument.name} (${getPropertyDocumentTypeDisplayName(selectedDocument.document_type)})`
                      : "None"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {documents.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.name} (
                      {getPropertyDocumentTypeDisplayName(doc.document_type)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Optionally link an uploaded document to this certificate.
              </p>
            </div>
          ) : null}

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
