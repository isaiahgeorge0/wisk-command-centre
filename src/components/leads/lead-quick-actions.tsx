"use client";

import { ArrowRight, Calendar, MessageSquare } from "lucide-react";
import { useState, useTransition } from "react";

import {
  addLeadActivity,
  setLeadFollowUp,
  updateLeadStatus,
} from "@/app/(dashboard)/leads/actions";
import { PIPELINE_STATUSES } from "@/lib/leads/constants";
import type { Lead, LeadStatus } from "@/lib/leads/types";

type LeadQuickActionsProps = {
  lead: Lead;
  onLeadUpdate: (lead: Lead) => void;
};

export function LeadQuickActions({
  lead,
  onLeadUpdate,
}: LeadQuickActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");

  const currentIndex = PIPELINE_STATUSES.indexOf(lead.status as LeadStatus);
  const nextStatus =
    currentIndex >= 0
      ? (PIPELINE_STATUSES[currentIndex + 1] as LeadStatus | undefined)
      : undefined;
  const canAdvance =
    Boolean(nextStatus) && nextStatus !== "won" && nextStatus !== "lost";

  const handleAdvanceStage = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!nextStatus) return;

    startTransition(async () => {
      const result = await updateLeadStatus(lead.id, nextStatus);
      if (result.success && result.data) {
        onLeadUpdate(result.data);
      }
    });
  };

  const handleFollowUpChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    event.stopPropagation();
    const date = event.target.value;
    if (!date) return;

    startTransition(async () => {
      const result = await setLeadFollowUp(lead.id, date);
      if (result.success) {
        onLeadUpdate({ ...lead, follow_up_date: date });
        setShowFollowUp(false);
      }
    });
  };

  const handleAddNote = () => {
    const content = note.trim();
    if (!content) return;

    startTransition(async () => {
      const result = await addLeadActivity(lead.id, {
        activity_type: "note",
        title: "Quick note",
        content,
      });
      if (result.success) {
        onLeadUpdate({
          ...lead,
          last_activity_at: new Date().toISOString(),
        } as Lead);
        setNote("");
        setShowNote(false);
      }
    });
  };

  return (
    <div
      className="flex items-center gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      {canAdvance ? (
        <button
          type="button"
          onClick={handleAdvanceStage}
          disabled={isPending}
          title={`Move to ${nextStatus}`}
          className="flex items-center gap-1 rounded-lg border border-border/60 bg-card/80 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-all hover:border-wisk-section-leads/30 hover:text-wisk-section-leads disabled:opacity-50"
        >
          <ArrowRight className="size-3" />
          {nextStatus?.replace("_", " ")}
        </button>
      ) : null}

      <div className="relative">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setShowFollowUp((visible) => !visible);
            setShowNote(false);
          }}
          title="Set follow-up"
          aria-label="Set follow-up"
          className="flex size-7 items-center justify-center rounded-lg border border-border/60 bg-card/80 text-muted-foreground transition-all hover:border-wisk-section-leads/30 hover:text-wisk-section-leads"
        >
          <Calendar className="size-3" />
        </button>
        {showFollowUp ? (
          <div className="absolute bottom-full right-0 z-20 mb-1 rounded-lg border border-border/60 bg-popover p-2 shadow-lg">
            <input
              type="date"
              defaultValue={lead.follow_up_date ?? ""}
              onChange={handleFollowUpChange}
              onClick={(event) => event.stopPropagation()}
              className="bg-transparent text-xs text-foreground outline-none"
            />
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setShowNote((visible) => !visible);
            setShowFollowUp(false);
          }}
          title="Log note"
          aria-label="Log note"
          className="flex size-7 items-center justify-center rounded-lg border border-border/60 bg-card/80 text-muted-foreground transition-all hover:border-wisk-section-leads/30 hover:text-wisk-section-leads"
        >
          <MessageSquare className="size-3" />
        </button>
        {showNote ? (
          <div className="absolute bottom-full left-0 z-20 mb-1 w-52 rounded-lg border border-border/60 bg-popover p-2 shadow-lg">
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              placeholder="Add a quick note…"
              rows={2}
              className="w-full resize-none bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={handleAddNote}
              disabled={isPending || !note.trim()}
              className="mt-1 w-full rounded-md bg-wisk-section-leads px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
            >
              Save note
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
