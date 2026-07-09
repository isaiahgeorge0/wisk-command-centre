"use client";

import { HardHat, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteContractor } from "@/app/(dashboard)/properties/actions";
import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { ContractorFormDialog } from "@/components/properties/contractors/contractor-form-dialog";
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
import { PROPERTIES_ACCENT } from "@/lib/properties/constants";
import { formatContractorDisplayName } from "@/lib/properties/contractor-display";
import type { Contractor } from "@/lib/properties/types";

type ContractorsPageClientProps = {
  contractors: Contractor[];
};

export function ContractorsPageClient({
  contractors,
}: ContractorsPageClientProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contractor | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteContractor(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          className="mb-0"
          title="Contractors"
          subtitle="Your contractor address book for maintenance assignments."
          icon={
            <HardHat className="size-6" style={{ color: PROPERTIES_ACCENT }} />
          }
        />
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="min-h-11 gap-2 bg-wisk-ferrari text-white hover:bg-wisk-ferrari/90"
        >
          <Plus className="size-4" />
          Add contractor
        </Button>
      </div>

      {contractors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-wisk-ferrari/20 bg-card/40 px-6 py-16 text-center">
          <HardHat className="mb-4 size-10 text-wisk-ferrari" />
          <h2 className="text-lg font-medium text-foreground">
            No contractors yet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Add your first contractor to assign them to maintenance jobs.
          </p>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="mt-6 min-h-11 gap-2 bg-wisk-ferrari text-white hover:bg-wisk-ferrari/90"
          >
            <Plus className="size-4" />
            Add contractor
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card/40">
          {contractors.map((contractor) => (
            <div
              key={contractor.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">
                    {formatContractorDisplayName(contractor.name)}
                  </p>
                  {contractor.trade ? (
                    <Badge variant="outline">{contractor.trade}</Badge>
                  ) : null}
                </div>
                <div className="text-sm text-muted-foreground">
                  {contractor.email ? <p>{contractor.email}</p> : null}
                  {contractor.phone ? <p>{contractor.phone}</p> : null}
                  <p className="text-xs">Active jobs: 0</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  onClick={() => {
                    setEditing(contractor);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 text-destructive"
                  onClick={() => setDeleteTarget(contractor)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ContractorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contractor={editing}
        onSaved={() => router.refresh()}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contractor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <strong>{formatContractorDisplayName(deleteTarget?.name)}</strong>{" "}
              from your address book.
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
    </PageTransition>
  );
}
