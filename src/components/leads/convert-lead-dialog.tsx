"use client";

import { useState } from "react";

import { convertLeadToProject } from "@/app/(dashboard)/leads/actions";
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
import { formatLeadValue } from "@/lib/leads/format";
import type { Lead } from "@/lib/leads/types";

type ConvertLeadDialogProps = {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted: (leadId: string) => void;
};

export function ConvertLeadDialog({
  lead,
  open,
  onOpenChange,
  onConverted,
}: ConvertLeadDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!lead) return null;

  const handleConvert = async () => {
    setError(null);
    setIsPending(true);

    const result = await convertLeadToProject(lead.id);

    setIsPending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onConverted(lead.id);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convert to project</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a new project and mark this lead as won.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-lg border border-border/60 bg-card/60 p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs text-muted-foreground">Project name</span>
              <span className="text-sm text-foreground">{lead.service_interest}</span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs text-muted-foreground">Client</span>
              <span className="text-sm text-foreground">{lead.name}</span>
            </div>
            {lead.value != null ? (
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs text-muted-foreground">Value</span>
                <span className="text-sm text-foreground">
                  {formatLeadValue(lead.value)}
                </span>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs text-muted-foreground">Status</span>
              <span className="text-sm text-foreground">Active</span>
            </div>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConvert} disabled={isPending}>
            {isPending ? "Converting…" : "Convert to project"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
