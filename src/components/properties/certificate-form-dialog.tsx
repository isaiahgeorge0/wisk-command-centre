"use client";

import { Info, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  createCertificate,
  getDocumentUrl,
  linkDocumentToCertificate,
  updateCertificate,
  uploadPropertyDocument,
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
import { formatFileSize } from "@/lib/properties/format";
import type {
  CertificateType,
  PropertyCertificate,
  PropertyCertificateFormInput,
  PropertyDocument,
  PropertyType,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

const ACCEPTED_TYPES =
  "application/pdf,image/jpeg,image/png,image/webp,image/heic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

function buildCertificateDocumentName(
  certificateType: CertificateType,
  propertyName: string
): string {
  return `${getCertificateTypeDisplayName(certificateType)} Certificate — ${propertyName}`;
}

function validateSelectedFile(file: File): string | null {
  if (
    !ACCEPTED_FILE_TYPES.includes(
      file.type as (typeof ACCEPTED_FILE_TYPES)[number]
    )
  ) {
    return "Invalid file type. Allowed: PDF, JPEG, PNG, WebP, HEIC";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File exceeds 10MB limit";
  }
  return null;
}

type CertificateFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyName: string;
  propertyType: PropertyType;
  documents: PropertyDocument[];
  certificate?: PropertyCertificate | null;
};

export function CertificateFormDialog({
  open,
  onOpenChange,
  propertyId,
  propertyName,
  propertyType,
  documents,
  certificate,
}: CertificateFormDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(certificate);
  const [values, setValues] = useState<PropertyCertificateFormInput>(
    emptyCertificateForm(propertyId)
  );
  const [linkedDocumentId, setLinkedDocumentId] = useState<string | null>(null);
  const [initialLinkedDocumentId, setInitialLinkedDocumentId] = useState<
    string | null
  >(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showReplaceUpload, setShowReplaceUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [autoPopulatedExpiry, setAutoPopulatedExpiry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formId = isEditing
    ? `edit-certificate-${certificate?.id}`
    : "add-certificate-form";

  const activeDuration = useMemo(
    () => getCertificateDuration(values.certificate_type, propertyType),
    [values.certificate_type, propertyType]
  );

  const linkedCertificateDocuments = useMemo(
    () =>
      certificate
        ? documents.filter((d) => d.certificate_id === certificate.id)
        : [],
    [certificate, documents]
  );

  const primaryLinkedDocument = linkedCertificateDocuments[0] ?? null;

  const selectedDocument = useMemo(
    () => documents.find((d) => d.id === linkedDocumentId),
    [documents, linkedDocumentId]
  );

  const showUploadArea =
    !primaryLinkedDocument || showReplaceUpload || Boolean(selectedFile);

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
    setSelectedFile(null);
    setFileError(null);
    setShowReplaceUpload(false);
    setDragOver(false);
    setAutoPopulatedExpiry(false);
    setError(null);
    setUploadWarning(null);
    setIsUploading(false);
  }, [open, certificate, propertyId, documents]);

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

  const handleFileChosen = (file: File | undefined) => {
    if (!file) return;
    const validationError = validateSelectedFile(file);
    if (validationError) {
      setFileError(validationError);
      setSelectedFile(null);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
    setUploadWarning(null);
  };

  const handleViewDocument = async (doc: PropertyDocument) => {
    const url = await getDocumentUrl(doc.file_path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploadWarning(null);

    startTransition(async () => {
      if (
        isEditing &&
        initialLinkedDocumentId &&
        initialLinkedDocumentId !== linkedDocumentId &&
        !selectedFile
      ) {
        await linkDocumentToCertificate(initialLinkedDocumentId, null);
      }

      let documentArg: string | null | undefined = undefined;
      if (!selectedFile) {
        if (linkedDocumentId) {
          documentArg = linkedDocumentId;
        } else if (isEditing && initialLinkedDocumentId) {
          documentArg = null;
        }
      }

      const result = isEditing
        ? await updateCertificate(certificate!.id, values, documentArg)
        : await createCertificate(
            values,
            selectedFile ? undefined : linkedDocumentId ?? undefined
          );

      if (!result.success) {
        setError(result.error);
        return;
      }

      const certificateId = result.data!.id;

      if (selectedFile) {
        setIsUploading(true);
        const uploadResult = await uploadPropertyDocument(
          propertyId,
          selectedFile,
          "certificate",
          buildCertificateDocumentName(values.certificate_type, propertyName),
          certificateId
        );
        setIsUploading(false);

        if (!uploadResult.success) {
          setUploadWarning(
            "Certificate saved but document upload failed. You can upload it from the Documents tab."
          );
          router.refresh();
          return;
        }
      }

      onOpenChange(false);
      router.refresh();
    });
  };

  const isBusy = isPending || isUploading;
  const submitLabel = isUploading
    ? "Uploading…"
    : isPending
      ? "Saving…"
      : isEditing
        ? "Save changes"
        : "Add certificate";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {isEditing ? "Edit certificate" : "Add certificate"}
          </DialogTitle>
          <DialogDescription>
            Track compliance certificates and expiry dates.
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-0.5 py-1"
        >
          <div className="space-y-2">
            <Label>Certificate type *</Label>
            <Select
              value={values.certificate_type}
              onValueChange={(v) =>
                v && handleCertificateTypeChange(v as CertificateType)
              }
              disabled={isBusy}
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
                disabled={isBusy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-expiry`}>Expiry date</Label>
              <Input
                id={`${formId}-expiry`}
                type="date"
                value={values.expiry_date ?? ""}
                onChange={(e) => handleExpiryDateChange(e.target.value)}
                disabled={isBusy}
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
              disabled={isBusy}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                Certificate document{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload the certificate PDF or image
              </p>
            </div>

            {primaryLinkedDocument && !showReplaceUpload && !selectedFile ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  onClick={() => void handleViewDocument(primaryLinkedDocument)}
                  disabled={isBusy}
                >
                  View document
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  onClick={() => setShowReplaceUpload(true)}
                  disabled={isBusy}
                >
                  Replace document
                </Button>
              </div>
            ) : null}

            {showUploadArea ? (
              <div className="space-y-3">
                {selectedFile ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-9 shrink-0 gap-1.5"
                      onClick={() => {
                        setSelectedFile(null);
                        setFileError(null);
                        if (primaryLinkedDocument) {
                          setShowReplaceUpload(false);
                        }
                      }}
                      disabled={isBusy}
                    >
                      <X className="size-4" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_TYPES}
                      className="hidden"
                      onChange={(e) => {
                        handleFileChosen(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isBusy}
                      onDragOver={(ev) => {
                        ev.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(ev) => {
                        ev.preventDefault();
                        setDragOver(false);
                        handleFileChosen(ev.dataTransfer.files?.[0]);
                      }}
                      className={cn(
                        "flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors disabled:opacity-50",
                        dragOver
                          ? "border-amber-500 bg-amber-500/5"
                          : "border-border/60 bg-muted/20 hover:bg-muted/40"
                      )}
                    >
                      <Upload className="size-6 text-amber-500" />
                      <span className="text-sm font-medium text-foreground">
                        Drag and drop or click to select
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PDF, JPEG, PNG, WebP, HEIC · Max 10MB
                      </span>
                    </button>
                  </>
                )}
                {fileError ? (
                  <p className="text-sm text-destructive">{fileError}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          {documents.length > 0 && !selectedFile ? (
            <div className="space-y-2">
              <Label>Link to document</Label>
              <Select
                value={linkedDocumentId ?? "none"}
                onValueChange={(v) =>
                  setLinkedDocumentId(v === "none" ? null : v)
                }
                disabled={isBusy}
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
                Optionally link an existing uploaded document to this
                certificate.
              </p>
            </div>
          ) : null}

          {uploadWarning ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              {uploadWarning}
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>
        <DialogFooter className="shrink-0 border-t border-border/50 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
            className="min-h-11"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={isBusy}
            className="min-h-11"
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
