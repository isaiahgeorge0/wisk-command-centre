"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createLead } from "@/app/(dashboard)/leads/actions";
import { LeadForm } from "@/components/leads/lead-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EMPTY_LEAD_FORM } from "@/lib/leads/form";
import type { LeadFormInput } from "@/lib/leads/types";

type LeadFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LeadFormDialog({ open, onOpenChange }: LeadFormDialogProps) {
  const router = useRouter();
  const [values, setValues] = useState<LeadFormInput>(EMPTY_LEAD_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = "add-lead-form";

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValues(EMPTY_LEAD_FORM);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createLead(values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
          <DialogDescription>
            Capture a new enquiry and track it through your pipeline.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit}>
          <LeadForm
            formId={formId}
            values={values}
            onChange={setValues}
            disabled={isPending}
          />
          {error ? (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isPending}>
            {isPending ? "Saving…" : "Add lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
