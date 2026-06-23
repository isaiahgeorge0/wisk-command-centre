"use client";

import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteCertificate } from "@/app/(dashboard)/properties/actions";
import { CertificateFormDialog } from "@/components/properties/certificate-form-dialog";
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
import { Button } from "@/components/ui/button";
import {
  CERTIFICATE_TYPE_LABELS,
} from "@/lib/properties/constants";
import {
  daysUntilDate,
  formatPropertyDate,
} from "@/lib/properties/format";
import type { PropertyCertificate } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type PropertyCertificatesTabProps = {
  propertyId: string;
  certificates: PropertyCertificate[];
};

export function PropertyCertificatesTab({
  propertyId,
  certificates,
}: PropertyCertificatesTabProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] =
    useState<PropertyCertificate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PropertyCertificate | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const warningCertificates = useMemo(
    () =>
      certificates.filter((cert) => {
        const days = daysUntilDate(cert.expiry_date);
        return days != null && days <= 30;
      }),
    [certificates]
  );

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteCertificate(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {warningCertificates.length > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-500" />
          <div>
            <p className="font-medium text-rose-700 dark:text-rose-300">
              Certificate attention required
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {warningCertificates.length} certificate
              {warningCertificates.length === 1 ? "" : "s"} expired or expiring
              within 30 days.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditingCertificate(null);
            setFormOpen(true);
          }}
          className="min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90"
        >
          <Plus className="size-4" />
          Add certificate
        </Button>
      </div>

      {certificates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-16 text-center">
          <h2 className="text-lg font-medium text-foreground">
            No certificates added
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Track gas safety, EPC, EICR, and other compliance certificates.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {certificates.map((certificate) => {
            const days = daysUntilDate(certificate.expiry_date);
            const expiryClass =
              days == null
                ? "text-muted-foreground"
                : days < 0 || days <= 30
                  ? "text-rose-600 dark:text-rose-400"
                  : days <= 90
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400";

            return (
              <div
                key={certificate.id}
                className="rounded-xl border border-border/60 bg-card/40 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {CERTIFICATE_TYPE_LABELS[certificate.certificate_type]}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Issued {formatPropertyDate(certificate.issue_date)} ·
                      Expires {formatPropertyDate(certificate.expiry_date)}
                    </p>
                    <p className={cn("text-sm font-medium", expiryClass)}>
                      {days == null
                        ? "No expiry date"
                        : days < 0
                          ? `Expired ${Math.abs(days)} days ago`
                          : `${days} days until expiry`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                      onClick={() => {
                        setEditingCertificate(certificate);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 text-destructive"
                      onClick={() => setDeleteTarget(certificate)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CertificateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        propertyId={propertyId}
        certificate={editingCertificate}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this certificate record.
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
