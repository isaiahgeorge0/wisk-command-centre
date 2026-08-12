"use client";

import { FolderTree, Loader2, Lock, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { WinstonProposalReview } from "@/components/winston/winston-proposal-review";
import type { Note } from "@/lib/notes/types";
import type {
  WinstonProposal,
  WinstonProposalCommitResult,
} from "@/lib/winston/proposal";

type NoteProjectProposalPanelProps = {
  note: Note;
  open: boolean;
  canAccessWinston: boolean;
  onClose: () => void;
  onCommitted: (result: WinstonProposalCommitResult) => void;
};

type GenerateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; message: string }
  | { status: "ready"; proposal: WinstonProposal; summary: string | null };

function PanelHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-wisk-section-winston text-wisk-section-winston-fg">
          <FolderTree className="size-3.5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Close proposal panel"
        onClick={onClose}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

function Teaser({ onClose }: { onClose: () => void }) {
  return (
    <>
      <PanelHeader
        title="Find projects & tasks"
        subtitle="Winston can draft projects and tasks from this note"
        onClose={onClose}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-wisk-section-winston/15">
          <Lock className="size-5 text-wisk-section-winston" aria-hidden />
        </div>
        <p className="text-sm font-medium text-foreground">
          This Winston action needs WISK AI
        </p>
        <Link
          href="/settings?tab=billing"
          className="inline-flex h-7 items-center justify-center rounded-lg bg-wisk-section-winston px-2.5 text-[0.8rem] font-medium text-wisk-section-winston-fg transition-opacity hover:opacity-90"
        >
          View plans
        </Link>
      </div>
    </>
  );
}

export function NoteProjectProposalPanel({
  note,
  open,
  canAccessWinston,
  onClose,
  onCommitted,
}: NoteProjectProposalPanelProps) {
  const [state, setState] = useState<GenerateState>({ status: "idle" });

  const generate = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch(
        `/api/winston/notes/${note.id}/propose-projects`,
        { method: "POST" }
      );
      const data = (await response.json()) as
        | {
            found?: boolean;
            message?: string | null;
            proposal?: WinstonProposal;
            error?: string;
          }
        | undefined;

      if (!response.ok) {
        setState({
          status: "error",
          message: data?.error ?? "Could not generate proposal",
        });
        return;
      }

      if (!data?.found || !data.proposal) {
        setState({
          status: "empty",
          message: data?.message ?? "Nothing actionable found in this note.",
        });
        return;
      }

      setState({
        status: "ready",
        proposal: data.proposal,
        summary: data.message ?? null,
      });
    } catch {
      setState({
        status: "error",
        message: "Could not reach Winston. Please try again.",
      });
    }
  }, [note.id]);

  useEffect(() => {
    if (!open || !canAccessWinston) return;
    void generate();
  }, [open, canAccessWinston, generate]);

  if (!open) return null;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-t border-border/60 bg-card/90 md:w-[420px] md:shrink-0 md:border-l md:border-t-0">
      {!canAccessWinston ? (
        <Teaser onClose={onClose} />
      ) : (
        <>
          <PanelHeader
            title="Find projects & tasks"
            subtitle="One-shot extraction from this note"
            onClose={onClose}
          />
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {state.status === "loading" ? (
              <div className="flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Winston is reading this note…
              </div>
            ) : null}

            {state.status === "error" ? (
              <div className="space-y-3 py-10 text-center">
                <p className="text-xs text-destructive">{state.message}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void generate()}
                  className="gap-1.5"
                >
                  <RefreshCw className="size-3.5" aria-hidden />
                  Try again
                </Button>
              </div>
            ) : null}

            {state.status === "empty" ? (
              <div className="space-y-3 py-10 text-center">
                <p className="text-sm font-medium text-foreground">
                  Nothing actionable found
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {state.message}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void generate()}
                  className="gap-1.5"
                >
                  <RefreshCw className="size-3.5" aria-hidden />
                  Scan again
                </Button>
              </div>
            ) : null}

            {state.status === "ready" ? (
              <div className="space-y-3">
                {state.summary ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {state.summary}
                  </p>
                ) : null}
                <WinstonProposalReview
                  proposal={state.proposal}
                  allowedEntityTypes={["project", "task"]}
                  title="Review projects & tasks"
                  commitLabel="Create selected items"
                  onCancel={onClose}
                  onCommitted={onCommitted}
                />
              </div>
            ) : null}
          </div>
        </>
      )}
    </aside>
  );
}
