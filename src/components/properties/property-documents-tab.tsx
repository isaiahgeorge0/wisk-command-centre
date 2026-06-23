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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPropertyDocumentTypeDisplayName,
  PROPERTY_DOCUMENT_TYPE_LABELS,
  type PropertyDocumentType,
} from "@/lib/properties/display-names";
import {
  formatFileSize,
  formatPropertyDate,
} from "@/lib/properties/format";
import type { PropertyDocument } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

const DOCUMENT_TYPES = Object.keys(
  PROPERTY_DOCUMENT_TYPE_LABELS
) as PropertyDocumentType[];

const ACCEPTED_TYPES =
  "application/pdf,image/jpeg,image/png,image/webp,image/heic";

type PropertyDocumentsTabProps = {
  propertyId: string;
  documents: PropertyDocument[];
};

export function PropertyDocumentsTab({
  propertyId,
  documents,
}: PropertyDocumentsTabProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<PropertyDocumentType>("other");
  const [documentName, setDocumentName] = useState("");
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
        name
      );
      setUploading(false);
      if (!result.success) {
        setUploadError(result.error);
        return;
      }
      setDocumentName("");
      router.refresh();
    },
    [documentName, documentType, propertyId, router]
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
          className="mt-4 flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-6 text-center transition-colors hover:bg-muted/40 disabled:opacity-50"
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
          <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            {uploadError}
          </p>
        ) : null}
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
  disabled,
}: {
  doc: PropertyDocument;
  onView: () => void;
  onDelete: () => void;
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
            <span>{formatFileSize(doc.file_size)}</span>
            <span>·</span>
            <span>{formatPropertyDate(doc.created_at)}</span>
          </div>
        </div>
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
  );
}
