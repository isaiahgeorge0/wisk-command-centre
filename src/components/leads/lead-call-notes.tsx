"use client";

import {
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { applyCallNotesResult } from "@/app/(dashboard)/leads/actions";
import { LEAD_STATUS_LABELS } from "@/lib/leads/constants";
import { formatLeadValue } from "@/lib/leads/format";
import type {
  CallNotesActions,
  CallNotesResult,
  CallNotesSentiment,
  Lead,
  LeadStatus,
} from "@/lib/leads/types";
import { LEAD_STATUSES } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

type CallNotesState = "idle" | "input" | "processing" | "review" | "applied";

const MAX_NOTES_LENGTH = 10_000;
const MIN_NOTES_LENGTH = 20;

type LeadCallNotesProps = {
  lead: Lead;
  canAccessWinston?: boolean;
  onNotesApplied: (updatedLead: Lead) => void;
  onActivityAdded?: () => void;
  variant?: "card" | "panel";
};

function SentimentBadge({ sentiment }: { sentiment: CallNotesSentiment }) {
  const config = {
    positive: {
      label: "Positive",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    neutral: {
      label: "Neutral",
      className: "border-border bg-muted text-muted-foreground",
    },
    negative: {
      label: "Negative",
      className: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    },
  }[sentiment];

  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border/50 bg-muted/10">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-xs font-medium text-foreground">{title}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open ? <div className="border-t border-border/40 px-3 py-2">{children}</div> : null}
    </div>
  );
}

function formatFollowUpLabel(dateStr: string): string {
  const date = dateStr.slice(0, 10);
  return new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function stageLabel(stage: string): string {
  if (LEAD_STATUSES.includes(stage as LeadStatus)) {
    return LEAD_STATUS_LABELS[stage as LeadStatus];
  }
  return stage;
}

export function LeadCallNotes({
  lead,
  canAccessWinston = true,
  onNotesApplied,
  onActivityAdded,
  variant = "card",
}: LeadCallNotesProps) {
  const isPanel = variant === "panel";
  const [state, setState] = useState<CallNotesState>(isPanel ? "input" : "idle");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CallNotesResult | null>(null);
  const [saveNotes, setSaveNotes] = useState(true);
  const [updateStage, setUpdateStage] = useState(true);
  const [updateValue, setUpdateValue] = useState(true);
  const [setFollowUp, setSetFollowUp] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isPanel) return;
    setState("input");
    setNotes("");
    setResult(null);
    setError(null);
  }, [lead.id, isPanel]);

  useEffect(() => {
    if (state !== "applied") return;
    const timeout = window.setTimeout(() => {
      setState(isPanel ? "input" : "idle");
      setNotes("");
      setResult(null);
      setError(null);
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [state, isPanel]);

  const resetToIdle = () => {
    if (isPanel) {
      setState("input");
      setNotes("");
      setResult(null);
      setError(null);
      return;
    }
    setState("idle");
    setNotes("");
    setResult(null);
    setError(null);
  };

  const handleAnalyse = async () => {
    const trimmed = notes.trim();
    if (trimmed.length < MIN_NOTES_LENGTH) {
      setError(`Notes must be at least ${MIN_NOTES_LENGTH} characters`);
      return;
    }

    setError(null);
    setState("processing");

    try {
      const response = await fetch("/api/winston/process-call-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, notes: trimmed }),
      });

      const data = (await response.json()) as {
        result?: CallNotesResult;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not process call notes");
      }

      if (!data.result) {
        throw new Error("No result returned from Winston");
      }

      setResult(data.result);
      setSaveNotes(true);
      setUpdateStage(Boolean(data.result.suggestedStage));
      setUpdateValue(data.result.suggestedValue != null);
      setSetFollowUp(Boolean(data.result.followUpDate));
      setSelectedTasks(data.result.taskSuggestions);
      setState("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("input");
    }
  };

  const handleApply = () => {
    if (!result) return;

    const actions: CallNotesActions = {
      saveNotes,
      updateStage,
      updateValue,
      setFollowUp,
      createTasks: selectedTasks,
    };

    startTransition(async () => {
      const applyResult = await applyCallNotesResult(lead.id, result, actions);
      if (!applyResult.success) {
        setError(applyResult.error);
        return;
      }

      if (applyResult.data) {
        onNotesApplied(applyResult.data);
      }
      onActivityAdded?.();
      setState("applied");
    });
  };

  const toggleTask = (task: string) => {
    setSelectedTasks((prev) =>
      prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
    );
  };

  if (!canAccessWinston && !isPanel) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 px-3 py-2.5 text-center">
        <p className="text-xs text-muted-foreground">
          Process call notes with Winston — available on{" "}
          <Link
            href="/upgrade"
            className="font-medium text-wisk-purple underline-offset-2 hover:underline"
          >
            WISK AI
          </Link>
        </p>
      </div>
    );
  }

  if (state === "idle" && !isPanel) {
    return (
      <button
        type="button"
        onClick={() => setState("input")}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-wisk-purple/25 bg-gradient-to-r from-wisk-purple/5 to-wisk-teal/5 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-wisk-purple/40 hover:from-wisk-purple/10 hover:to-wisk-teal/10"
      >
        <Sparkles className="size-3.5 text-wisk-purple" aria-hidden />
        Process call notes with Winston
      </button>
    );
  }

  if (state === "input") {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
        <h3 className="text-xs font-medium text-foreground">
          Paste your call notes or transcript
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))}
          placeholder="Paste your call transcript, voice memo transcription, or typed notes from the call…"
          className="min-h-[120px] max-h-[300px] w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-wisk-teal/40"
        />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Winston will extract key details, next steps, and suggested actions.</span>
          <span className="tabular-nums">
            {notes.length.toLocaleString()} / {MAX_NOTES_LENGTH.toLocaleString()}
          </span>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={resetToIdle}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAnalyse}
            disabled={notes.trim().length < MIN_NOTES_LENGTH}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-wisk-purple to-wisk-teal px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className="size-3" aria-hidden />
            Analyse with Winston
          </button>
        </div>
      </div>
    );
  }

  if (state === "processing") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-6 text-center">
        <Sparkles className="size-5 animate-pulse text-wisk-purple" aria-hidden />
        <p className="text-xs text-muted-foreground">Winston is reading your notes…</p>
      </div>
    );
  }

  if (state === "applied") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-wisk-teal/30 bg-wisk-teal/5 px-3 py-5 text-center">
        <CheckCircle2 className="size-5 text-wisk-teal" aria-hidden />
        <p className="text-xs font-medium text-foreground">
          Winston&apos;s notes applied successfully.
        </p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
      <div className="rounded-lg border border-border/50 bg-background/80 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground">Summary</span>
          <SentimentBadge sentiment={result.sentiment} />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{result.summary}</p>
      </div>

      <div className="space-y-2">
        {result.keyDetails.length > 0 ? (
          <CollapsibleSection title="Key details">
            <ul className="space-y-1">
              {result.keyDetails.map((detail) => (
                <li
                  key={detail}
                  className="flex gap-2 text-xs text-muted-foreground before:mt-1.5 before:size-1 before:shrink-0 before:rounded-full before:bg-muted-foreground/40"
                >
                  {detail}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        ) : null}

        {result.objections.length > 0 ? (
          <CollapsibleSection title="Objections">
            <ul className="space-y-1">
              {result.objections.map((objection) => (
                <li
                  key={objection}
                  className="flex gap-2 text-xs text-muted-foreground before:mt-1.5 before:size-1 before:shrink-0 before:rounded-full before:bg-orange-400"
                >
                  {objection}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        ) : null}

        {result.nextSteps.length > 0 ? (
          <CollapsibleSection title="Next steps">
            <ul className="space-y-1">
              {result.nextSteps.map((step) => (
                <li key={step} className="flex gap-2 text-xs text-muted-foreground">
                  <Check className="mt-0.5 size-3 shrink-0 text-wisk-teal" aria-hidden />
                  {step}
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        ) : null}
      </div>

      <div className="space-y-2 rounded-lg border border-border/50 bg-background/60 p-3">
        <p className="text-xs font-medium text-foreground">Suggested actions</p>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={saveNotes}
            onChange={(e) => setSaveNotes(e.target.checked)}
            className="rounded border-border"
          />
          Save summary to lead notes
        </label>
        {result.suggestedStage ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={updateStage}
              onChange={(e) => setUpdateStage(e.target.checked)}
              className="rounded border-border"
            />
            Move to {stageLabel(result.suggestedStage)}
          </label>
        ) : null}
        {result.suggestedValue != null ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={updateValue}
              onChange={(e) => setUpdateValue(e.target.checked)}
              className="rounded border-border"
            />
            Update value to {formatLeadValue(result.suggestedValue)}
          </label>
        ) : null}
        {result.followUpDate ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={setFollowUp}
              onChange={(e) => setSetFollowUp(e.target.checked)}
              className="rounded border-border"
            />
            Set follow-up for {formatFollowUpLabel(result.followUpDate)}
          </label>
        ) : null}
      </div>

      {result.taskSuggestions.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-border/50 bg-background/60 p-3">
          <p className="text-xs font-medium text-foreground">Task suggestions</p>
          {result.taskSuggestions.map((task) => (
            <label
              key={task}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              <input
                type="checkbox"
                checked={selectedTasks.includes(task)}
                onChange={() => toggleTask(task)}
                className="mt-0.5 rounded border-border"
              />
              <span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  Create as task
                </span>
                <br />
                {task}
              </span>
            </label>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={resetToIdle}
          disabled={isPending}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-wisk-purple to-wisk-teal px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : null}
          Apply selected
        </button>
      </div>
    </div>
  );
}
