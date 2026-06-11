"use client";

import { useEffect, useState, useTransition } from "react";

import { convertLeadToProject } from "@/app/(dashboard)/leads/actions";
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
import type { Lead } from "@/lib/leads/types";

type ConvertLeadDialogProps = {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted: (leadId: string, projectId: string) => void;
};

function leadValueToInput(value: number | null): string {
  return value != null ? String(value) : "";
}

export function ConvertLeadDialog({
  lead,
  open,
  onOpenChange,
  onConverted,
}: ConvertLeadDialogProps) {
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [firstTask, setFirstTask] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !lead) return;
    setName(lead.name);
    setDeadline("");
    setFirstTask("");
    setValue(leadValueToInput(lead.value));
    setError(null);
  }, [open, lead]);

  if (!lead) return null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isPending) {
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleConvert = (skipExtras: boolean) => {
    setError(null);

    startTransition(async () => {
      const result = await convertLeadToProject(lead.id, {
        name: name.trim(),
        ...(skipExtras
          ? {
              value: lead.value != null ? String(lead.value) : undefined,
            }
          : {
              deadline: deadline || undefined,
              value: value || undefined,
              first_task: firstTask || undefined,
            }),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onConverted(lead.id, result.data!.projectId);
      handleOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convert to Project</DialogTitle>
          <DialogDescription>
            Add a few details to give this project a strong foundation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="convert-project-name">Project name</Label>
            <Input
              id="convert-project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="convert-deadline">Deadline</Label>
            <Input
              id="convert-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="convert-first-task">First task</Label>
            <Input
              id="convert-first-task"
              value={firstTask}
              onChange={(e) => setFirstTask(e.target.value)}
              placeholder="What's the first thing to do?"
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="convert-value">Project value (£)</Label>
            <Input
              id="convert-value"
              type="number"
              min={0}
              step={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isPending}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={isPending || !name.trim()}
            onClick={() => handleConvert(true)}
          >
            Skip &amp; Convert
          </Button>
          <Button
            type="button"
            disabled={isPending || !name.trim()}
            onClick={() => handleConvert(false)}
            className="bg-gradient-to-r from-wisk-purple to-wisk-teal text-white hover:opacity-90"
          >
            {isPending ? "Converting…" : "Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
