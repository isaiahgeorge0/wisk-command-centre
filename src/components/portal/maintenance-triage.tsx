"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { submitPortalMaintenanceRequest } from "@/app/portal/actions";
import { Textarea } from "@/components/ui/textarea";
import {
  getMaintenanceCategoryDisplayName,
  getMaintenancePriorityDisplayName,
} from "@/lib/properties/display-names";
import type {
  MaintenanceCategory,
  MaintenancePriority,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

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
  const reduced = useReducedMotion() ?? false;
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
    const firstLine =
      description.trim().split("\n")[0]?.trim() ?? "Maintenance request";
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
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--portal-border)] bg-[var(--portal-bg)] sm:rounded-2xl">
        <div className="border-b border-[var(--portal-border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--portal-text)]">
            {step === "describe"
              ? "Describe the issue"
              : step === "troubleshoot"
                ? "Here's what to try"
                : "Confirm request"}
          </h2>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {step === "describe" ? (
            <>
              <Textarea
                id="issue-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="What's the problem?"
                className="min-h-32 resize-none rounded-2xl border-[var(--portal-border)] bg-[var(--portal-card)] px-4 py-4 text-base text-[var(--portal-text)] placeholder:text-[var(--portal-muted)]"
              />
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--portal-text)]">
                  Category
                </p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {CATEGORIES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={cn(
                        "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        category === item
                          ? "border-[var(--portal-amber)] bg-[var(--portal-amber)] text-white"
                          : "border-[var(--portal-border)] bg-[var(--portal-card)] text-[var(--portal-muted)]"
                      )}
                    >
                      {getMaintenanceCategoryDisplayName(item)}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="text-sm text-[var(--portal-muted)] underline-offset-2 hover:underline"
                onClick={() => {
                  setWinstonAttempted(false);
                  setStep("confirm");
                }}
              >
                Skip Winston — report directly
              </button>
            </>
          ) : null}

          {step === "troubleshoot" ? (
            <>
              <div className="flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-[var(--portal-amber-light)]">
                  <Sparkles className="size-6 text-[var(--portal-amber)]" />
                </div>
                <p className="mt-4 text-base font-semibold text-[var(--portal-text)]">
                  Here&apos;s what to try:
                </p>
              </div>
              {isEmergency ? (
                <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-[var(--portal-error)]">
                  This may be an emergency. Contact emergency services and your
                  landlord immediately if you are in danger.
                </p>
              ) : null}
              <div className="space-y-3">
                {steps.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      delay: reduced ? 0 : index * 0.05,
                    }}
                    className="flex gap-3 rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-4 shadow-[var(--portal-shadow)]"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--portal-amber)] text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-[var(--portal-text)]">
                      {item}
                    </p>
                  </motion.div>
                ))}
              </div>
              <button
                type="button"
                className="text-sm text-[var(--portal-muted)] underline-offset-2 hover:underline"
                onClick={() => setStep("confirm")}
              >
                Skip Winston — report directly
              </button>
            </>
          ) : null}

          {step === "confirm" ? (
            <>
              <div className="rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-4 shadow-[var(--portal-shadow)]">
                <p className="font-semibold text-[var(--portal-text)]">
                  {titleFromDescription()}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--portal-muted)]">
                  {description}
                </p>
                <p className="mt-3 text-xs text-[var(--portal-muted)]">
                  Category: {getMaintenanceCategoryDisplayName(category)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--portal-text)]">
                  Priority
                </p>
                <div className="-mx-1 flex flex-wrap gap-2 px-1">
                  {PRIORITIES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPriority(item)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        priority === item
                          ? "border-[var(--portal-amber)] bg-[var(--portal-amber)] text-white"
                          : "border-[var(--portal-border)] bg-[var(--portal-card)] text-[var(--portal-muted)]"
                      )}
                    >
                      {getMaintenancePriorityDisplayName(item)}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-sm text-[var(--portal-muted)]">
                Your landlord will be notified immediately.
              </p>
            </>
          ) : null}

          {error ? (
            <p className="text-sm text-[var(--portal-error)]">{error}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--portal-border)] px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {step === "describe" ? (
            <>
              <button
                type="button"
                disabled={!description.trim() || loading}
                onClick={() => void runTriage()}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[var(--portal-amber)] text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Asking Winston…
                  </>
                ) : (
                  "Continue"
                )}
              </button>
              <button
                type="button"
                onClick={reset}
                className="min-h-12 text-sm font-medium text-[var(--portal-muted)]"
              >
                Cancel
              </button>
            </>
          ) : null}

          {step === "troubleshoot" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  reset();
                  router.refresh();
                }}
                className="min-h-14 w-full rounded-xl border border-[var(--portal-border)] bg-[var(--portal-card)] text-sm font-semibold text-[var(--portal-text)]"
              >
                This solved it
              </button>
              <button
                type="button"
                onClick={() => setStep("confirm")}
                className="min-h-14 w-full rounded-xl bg-[var(--portal-amber)] text-sm font-semibold text-white"
              >
                Still not resolved
              </button>
            </>
          ) : null}

          {step === "confirm" ? (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className="min-h-14 w-full rounded-xl bg-[var(--portal-amber)] text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit to landlord"}
              </button>
              <button
                type="button"
                onClick={reset}
                className="min-h-12 text-sm font-medium text-[var(--portal-muted)]"
              >
                Cancel
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
