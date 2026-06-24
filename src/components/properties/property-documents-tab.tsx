"use client";

import {
  AlertTriangle,
  FileImage,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deletePropertyDocument,
  getDocumentUrl,
  toggleDocumentTenantSharing,
  uploadPropertyDocument,
} from "@/app/(dashboard)/properties/actions";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCertificateTypeDisplayName,
  getPropertyDocumentTypeDisplayName,
  PROPERTY_DOCUMENT_TYPE_LABELS,
  type PropertyDocumentType,
} from "@/lib/properties/display-names";
import {
  formatFileSize,
  formatPropertyDate,
} from "@/lib/properties/format";
import type { PropertyCertificate, PropertyDocument } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

const DOCUMENT_TYPES = Object.keys(
  PROPERTY_DOCUMENT_TYPE_LABELS
) as PropertyDocumentType[];

const ACCEPTED_TYPES =
  "application/pdf,image/jpeg,image/png,image/webp,image/heic";

type PropertyDocumentsTabProps = {
  propertyId: string;
  documents: PropertyDocument[];
  certificates: PropertyCertificate[];
  onNavigateToCertificates?: () => void;
};

export function PropertyDocumentsTab({
  propertyId,
  documents,
  certificates,
  onNavigateToCertificates,
}: PropertyDocumentsTabProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<PropertyDocumentType>("other");
  const [documentName, setDocumentName] = useState("");
  const [linkedCertificateId, setLinkedCertificateId] = useState<string | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<PropertyDocument | null>(
    null
  );
  const [dragOver, setDragOver] = useState(false);

  const grouped = useMemo(() => {
    const groups = new Map<PropertyDocumentType | "other", PropertyDocument[]>();
    for (const doc of documents) {
      const type = (doc.document_type ?? "other") as PropertyDocumentType;
      const list = groups.get(type) ?? [];
      list.push(doc);
      groups.set(type, list);
    }
    return DOCUMENT_TYPES.filter((type) => groups.has(type)).map((type) => ({
      type,
      items: groups.get(type) ?? [],
    }));
  }, [documents]);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploadError(null);
      setUploading(true);
      const name = documentName.trim() || file.name.replace(/\.[^.]+$/, "");
      const result = await uploadPropertyDocument(
        propertyId,
        file,
        documentType,
        name,
        linkedCertificateId ?? undefined
      );
      setUploading(false);
      if (!result.success) {
        setUploadError(result.error);
        return;
      }
      setDocumentName("");
      setLinkedCertificateId(null);
      router.refresh();
    },
    [documentName, documentType, linkedCertificateId, propertyId, router]
  );

  const onFileSelected = (files: FileList | null) => {
    const file = files?.[0];
    if (file) {
      startTransition(() => {
        void handleUpload(file);
      });
    }
  };

  const handleView = async (doc: PropertyDocument) => {
    const url = await getDocumentUrl(doc.file_path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deletePropertyDocument(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  const handleShareToggle = (documentId: string, shared: boolean) => {
    startTransition(async () => {
      await toggleDocumentTenantSharing(documentId, shared);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "rounded-xl border border-dashed p-6 transition-colors",
          dragOver
            ? "border-amber-500 bg-amber-500/5"
            : "border-amber-500/30 bg-card/40"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onFileSelected(e.dataTransfer.files);
        }}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="doc-name">Document name</Label>
              <Input
                id="doc-name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g. Tenancy agreement 2026"
                className="min-h-11"
                disabled={uploading || isPending}
              />
            </div>
            <div className="space-y-2 sm:w-[200px]">
              <Label>Type</Label>
              <Select
                value={documentType}
                onValueChange={(v) => v && setDocumentType(v as PropertyDocumentType)}
                disabled={uploading || isPending}
              >
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue>
                    {getPropertyDocumentTypeDisplayName(documentType)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getPropertyDocumentTypeDisplayName(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {certificates.length > 0 ? (
            <div className="space-y-2">
              <Label>Link to certificate</Label>
              <Select
                value={linkedCertificateId ?? "none"}
                onValueChange={(v) =>
                  setLinkedCertificateId(v === "none" ? null : v)
                }
                disabled={uploading || isPending}
              >
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue placeholder="None">
                    {linkedCertificateId
                      ? (() => {
                          const cert = certificates.find(
                            (c) => c.id === linkedCertificateId
                          );
                          return cert
                            ? `${getCertificateTypeDisplayName(cert.certificate_type)} — expires ${formatPropertyDate(cert.expiry_date)}`
                            : "None";
                        })()
                      : "None"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {certificates.map((cert) => (
                    <SelectItem key={cert.id} value={cert.id}>
                      {getCertificateTypeDisplayName(cert.certificate_type)} —
                      expires {formatPropertyDate(cert.expiry_date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => onFileSelected(e.target.files)}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isPending}
            className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-6 text-center transition-colors hover:bg-muted/40 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="size-6 animate-spin text-amber-500" />
                <span className="text-sm text-muted-foreground">Uploading…</span>
              </>
            ) : (
              <>
                <Upload className="size-6 text-amber-500" />
                <span className="text-sm font-medium text-foreground">
                  Drag and drop or click to upload
                </span>
                <span className="text-xs text-muted-foreground">
                  PDF, JPEG, PNG, WebP, HEIC · Max 10MB
                </span>
              </>
            )}
          </button>

          {uploadError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {uploadError}
            </p>
          ) : null}
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-16 text-center">
          <FileText className="mb-4 size-10 text-amber-500" />
          <h2 className="text-lg font-medium text-foreground">
            No documents uploaded yet
          </h2>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ type, items }) => (
            <section key={type}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {getPropertyDocumentTypeDisplayName(type)}
              </h3>
              <div className="space-y-3">
                {items.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onView={() => void handleView(doc)}
                    onDelete={() => setDeleteTarget(doc)}
                    onShareToggle={(shared) =>
                      handleShareToggle(doc.id, shared)
                    }
                    onNavigateToCertificates={onNavigateToCertificates}
                    disabled={isPending}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &ldquo;{deleteTarget?.name}&rdquo;
              from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} className="min-h-11">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="min-h-11"
            >
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DocumentRow({
  doc,
  onView,
  onDelete,
  onShareToggle,
  onNavigateToCertificates,
  disabled,
}: {
  doc: PropertyDocument;
  onView: () => void;
  onDelete: () => void;
  onShareToggle: (shared: boolean) => void;
  onNavigateToCertificates?: () => void;
  disabled: boolean;
}) {
  const isPdf = doc.file_type === "application/pdf";
  const Icon = isPdf ? FileText : FileImage;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
          <Icon className="size-5 text-amber-500" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{doc.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {doc.document_type ? (
              <Badge variant="outline">
                {getPropertyDocumentTypeDisplayName(doc.document_type)}
              </Badge>
            ) : null}
            {doc.certificate_id && doc.certificate_type ? (
              <button
                type="button"
                onClick={onNavigateToCertificates}
                title={`Linked to ${getCertificateTypeDisplayName(doc.certificate_type)}${doc.certificate_expiry ? ` — expires ${formatPropertyDate(doc.certificate_expiry)}` : ""}`}
                className="inline-flex"
              >
                <Badge
                  variant="outline"
                  className="border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
                >
                  {getCertificateTypeDisplayName(doc.certificate_type)}
                </Badge>
              </button>
            ) : null}
            {doc.shared_with_tenant ? (
              <Badge
                variant="outline"
                className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
              >
                Shared with tenant
              </Badge>
            ) : null}
            <span>{formatFileSize(doc.file_size)}</span>
            <span>·</span>
            <span>{formatPropertyDate(doc.created_at)}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:items-end">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
          <Switch
            id={`share-${doc.id}`}
            checked={doc.shared_with_tenant}
            onCheckedChange={onShareToggle}
            disabled={disabled}
            aria-label="Share with tenant"
          />
          <Label htmlFor={`share-${doc.id}`} className="text-xs font-normal">
            Share with tenant
          </Label>
        </div>
        <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={onView}
          disabled={disabled}
        >
          Download / View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 text-destructive"
          onClick={onDelete}
          disabled={disabled}
        >
          <Trash2 className="size-4" />
        </Button>
        </div>
      </div>
    </div>
  );
}
