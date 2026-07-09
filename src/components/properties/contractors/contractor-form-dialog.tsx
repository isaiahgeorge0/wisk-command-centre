"use client";

import { useEffect, useState, useTransition } from "react";

import {
  createContractor,
  updateContractor,
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
import { Textarea } from "@/components/ui/textarea";
import type { Contractor, ContractorFormInput } from "@/lib/properties/types";

type ContractorFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractor?: Contractor | null;
  onSaved?: () => void;
};

function emptyForm(): ContractorFormInput {
  return {
    name: "",
    trade: "",
    email: "",
    phone: "",
    notes: "",
  };
}

function contractorToForm(contractor: Contractor): ContractorFormInput {
  return {
    name: contractor.name,
    trade: contractor.trade ?? "",
    email: contractor.email ?? "",
    phone: contractor.phone ?? "",
    notes: contractor.notes ?? "",
  };
}

export function ContractorFormDialog({
  open,
  onOpenChange,
  contractor,
  onSaved,
}: ContractorFormDialogProps) {
  const [values, setValues] = useState<ContractorFormInput>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setValues(contractor ? contractorToForm(contractor) : emptyForm());
      setError(null);
    }
  }, [open, contractor]);

  const handleSubmit = () => {
    startTransition(async () => {
      const result = contractor
        ? await updateContractor(contractor.id, values)
        : await createContractor(values);

      if (!result.success) {
        setError(result.error ?? "Could not save contractor.");
        return;
      }

      onOpenChange(false);
      onSaved?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {contractor ? "Edit contractor" : "Add contractor"}
          </DialogTitle>
          <DialogDescription>
            Save contact details for contractors you assign to maintenance jobs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="contractor-name">Name</Label>
            <Input
              id="contractor-name"
              value={values.name}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, name: e.target.value }))
              }
              className="mt-1 min-h-11"
            />
          </div>
          <div>
            <Label htmlFor="contractor-trade">Trade</Label>
            <Input
              id="contractor-trade"
              value={values.trade ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, trade: e.target.value }))
              }
              placeholder="e.g. Plumber"
              className="mt-1 min-h-11"
            />
          </div>
          <div>
            <Label htmlFor="contractor-email">Email</Label>
            <Input
              id="contractor-email"
              type="email"
              value={values.email ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, email: e.target.value }))
              }
              className="mt-1 min-h-11"
            />
          </div>
          <div>
            <Label htmlFor="contractor-phone">Phone</Label>
            <Input
              id="contractor-phone"
              value={values.phone ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="mt-1 min-h-11"
            />
          </div>
          <div>
            <Label htmlFor="contractor-notes">Notes</Label>
            <Textarea
              id="contractor-notes"
              value={values.notes ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
              className="mt-1 resize-none"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="min-h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !values.name.trim()}
            className="min-h-11 bg-wisk-ferrari text-white hover:bg-wisk-ferrari/90"
          >
            {isPending ? "Saving…" : contractor ? "Save changes" : "Add contractor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
