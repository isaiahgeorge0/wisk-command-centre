"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { submitPortalMaintenanceRequest } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
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
  getMaintenanceCategoryDisplayName,
  getMaintenancePriorityDisplayName,
} from "@/lib/properties/display-names";
import type {
  MaintenanceCategory,
  MaintenancePriority,
} from "@/lib/properties/types";

const CATEGORIES: MaintenanceCategory[] = [
  "plumbing",
  "electrical",
  "heating",
  "structural",
  "appliance",
  "other",
];

const PRIORITIES: MaintenancePriority[] = [
  "low",
  "medium",
  "high",
  "emergency",
];

type Step = "describe" | "troubleshoot" | "confirm";

type MaintenanceTriageProps = {
  open: boolean;
  onClose: () => void;
};

export function MaintenanceTriage({ open, onClose }: MaintenanceTriageProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("describe");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MaintenanceCategory>("other");
  const [priority, setPriority] = useState<MaintenancePriority>("medium");
  const [steps, setSteps] = useState<string[]>([]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [winstonAttempted, setWinstonAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setStep("describe");
    setDescription("");
    setCategory("other");
    setPriority("medium");
    setSteps([]);
    setIsEmergency(false);
    setWinstonAttempted(false);
    setError(null);
    onClose();
  };

  const titleFromDescription = () => {
    const firstLine = description.trim().split("\n")[0]?.trim() ?? "Maintenance request";
    return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
  };

  const runTriage = async () => {
    setLoading(true);
    setError(null);
    setWinstonAttempted(true);

    try {
      const response = await fetch("/api/portal/winston-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue: description, category }),
      });
      const data = (await response.json()) as {
        steps?: string[];
        isEmergency?: boolean;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Winston could not help right now.");
        setStep("confirm");
        return;
      }

      setSteps(data.steps ?? []);
      setIsEmergency(data.isEmergency === true);
      setStep("troubleshoot");
    } catch {
      setError("Winston could not help right now.");
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const result = await submitPortalMaintenanceRequest({
      title: titleFromDescription(),
      description: description.trim(),
      category,
      priority: isEmergency ? "emergency" : priority,
      winstonAttempted,
      winstonSteps: steps.length > 0 ? steps : undefined,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    reset();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-background sm:rounded-2xl">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">
            {step === "describe"
              ? "Describe the issue"
              : step === "troubleshoot"
                ? "Try these steps"
                : "Confirm request"}
          </h2>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {step === "describe" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="issue-description">Describe the problem</Label>
                <Textarea
                  id="issue-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Tell us what's wrong…"
                  className="min-h-28"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => v && setCategory(v as MaintenanceCategory)}
                >
                  <SelectTrigger className="min-h-11 w-full">
                    <SelectValue>
                      {getMaintenanceCategoryDisplayName(category)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {getMaintenanceCategoryDisplayName(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button
                type="button"
                className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => {
                  setWinstonAttempted(false);
                  setStep("confirm");
                }}
              >
                Skip to report directly
              </button>
            </>
          ) : null}

          {step === "troubleshoot" ? (
            <>
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <div className="space-y-2 text-sm text-foreground">
                  {isEmergency ? (
                    <p className="font-medium text-destructive">
                      This may be an emergency. Contact emergency services and your
                      landlord immediately if you are in danger.
                    </p>
                  ) : null}
                  <ol className="list-decimal space-y-2 pl-4 text-muted-foreground">
                    {steps.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ol>
                </div>
              </div>
              <button
                type="button"
                className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setStep("confirm")}
              >
                Skip Winston — report directly
              </button>
            </>
          ) : null}

          {step === "confirm" ? (
            <>
              <div className="rounded-lg border border-border/60 bg-card/40 p-3 text-sm">
                <p className="font-medium text-foreground">{titleFromDescription()}</p>
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                  {description}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Category: {getMaintenanceCategoryDisplayName(category)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => v && setPriority(v as MaintenancePriority)}
                >
                  <SelectTrigger className="min-h-11 w-full">
                    <SelectValue>
                      {getMaintenancePriorityDisplayName(priority)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {getMaintenancePriorityDisplayName(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-border/60 p-4">
          {step === "describe" ? (
            <>
              <Button
                className="min-h-11 bg-amber-500 text-white hover:bg-amber-500/90"
                disabled={!description.trim() || loading}
                onClick={() => void runTriage()}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Asking Winston…
                  </>
                ) : (
                  "Continue with Winston"
                )}
              </Button>
              <Button variant="outline" className="min-h-11" onClick={reset}>
                Cancel
              </Button>
            </>
          ) : null}

          {step === "troubleshoot" ? (
            <>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  reset();
                  router.refresh();
                }}
              >
                This solved it — close request
              </Button>
              <Button
                className="min-h-11 bg-amber-500 text-white hover:bg-amber-500/90"
                onClick={() => setStep("confirm")}
              >
                Still not resolved — report to landlord
              </Button>
            </>
          ) : null}

          {step === "confirm" ? (
            <>
              <Button
                className="min-h-11 bg-amber-500 text-white hover:bg-amber-500/90"
                disabled={submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "Submitting…" : "Submit request"}
              </Button>
              <Button variant="outline" className="min-h-11" onClick={reset}>
                Cancel
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
