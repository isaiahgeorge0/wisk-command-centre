"use client";

import { ArrowRight, Calendar, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";

import {
  deleteLead,
  setLeadFollowUp,
  updateLeadStatus,
} from "@/app/(dashboard)/leads/actions";
import {
  LEAD_STATUS_LABELS,
  PIPELINE_STATUSES,
} from "@/lib/leads/constants";
import type { Lead, LeadStatus } from "@/lib/leads/types";

type LeadsBulkActionBarProps = {
  selectedIds: Set<string>;
  leads: Lead[];
  onClear: () => void;
  onLeadUpdate: (lead: Lead) => void;
  onLeadDelete: (lead: Lead) => void;
};

export function LeadsBulkActionBar({
  selectedIds,
  leads,
  onClear,
  onLeadUpdate,
  onLeadDelete,
}: LeadsBulkActionBarProps) {
  const [isPending, startTransition] = useTransition();
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);

  if (selectedIds.size === 0) return null;

  const selectedLeads = leads.filter((lead) => selectedIds.has(lead.id));

  const handleBulkStageUpdate = (status: LeadStatus) => {
    startTransition(async () => {
      for (const lead of selectedLeads) {
        const result = await updateLeadStatus(lead.id, status);
        if (result.success && result.data) {
          onLeadUpdate(result.data);
        }
      }
      setShowStageMenu(false);
      onClear();
    });
  };

  const handleBulkFollowUp = (date: string) => {
    if (!date) return;

    startTransition(async () => {
      for (const lead of selectedLeads) {
        const result = await setLeadFollowUp(lead.id, date);
        if (result.success) {
          onLeadUpdate({ ...lead, follow_up_date: date });
        }
      }
      setShowFollowUp(false);
      onClear();
    });
  };

  const handleBulkDelete = () => {
    if (!window.confirm(`Delete ${selectedIds.size} leads?`)) return;

    startTransition(async () => {
      for (const lead of selectedLeads) {
        const result = await deleteLead(lead.id);
        if (result.success) onLeadDelete(lead);
      }
      onClear();
    });
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-2xl border border-wisk-section-leads/30 bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-md">
        <span className="whitespace-nowrap text-sm font-semibold text-wisk-section-leads">
          {selectedIds.size} selected
        </span>

        <div className="mx-2 h-4 w-px bg-border/60" />

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowStageMenu((visible) => !visible);
              setShowFollowUp(false);
            }}
            disabled={isPending}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-wisk-section-leads/30 hover:text-foreground disabled:opacity-50"
          >
            <ArrowRight className="size-3" />
            Change stage
          </button>
          {showStageMenu ? (
            <div className="absolute bottom-full left-0 z-10 mb-2 min-w-[140px] rounded-xl border border-border/60 bg-popover p-1 shadow-xl">
              {PIPELINE_STATUSES.filter(
                (status) => status !== "won" && status !== "lost"
              ).map((status) => (
                <button
                  type="button"
                  key={status}
                  onClick={() => handleBulkStageUpdate(status)}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-muted/40"
                >
                  {LEAD_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowFollowUp((visible) => !visible);
              setShowStageMenu(false);
            }}
            disabled={isPending}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-wisk-section-leads/30 hover:text-foreground disabled:opacity-50"
          >
            <Calendar className="size-3" />
            Follow-up
          </button>
          {showFollowUp ? (
            <div className="absolute bottom-full left-0 z-10 mb-2 rounded-xl border border-border/60 bg-popover p-3 shadow-xl">
              <input
                type="date"
                onChange={(event) => handleBulkFollowUp(event.target.value)}
                className="bg-transparent text-xs text-foreground outline-none"
              />
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleBulkDelete}
          disabled={isPending}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/10 disabled:opacity-50"
        >
          <Trash2 className="size-3" />
          Delete
        </button>

        <div className="mx-2 h-4 w-px bg-border/60" />

        <button
          type="button"
          onClick={onClear}
          className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/40"
          aria-label="Clear lead selection"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
