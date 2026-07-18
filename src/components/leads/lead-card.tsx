"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { updateLead } from "@/app/(dashboard)/leads/actions";
import { ExpandableSection } from "@/components/motion/expandable-section";
import { LeadExpandedDetail } from "@/components/leads/lead-expanded-detail";
import { LeadForm } from "@/components/leads/lead-form";
import { LeadQuickActions } from "@/components/leads/lead-quick-actions";
import { LeadScoreBadge } from "@/components/leads/lead-score-badge";
import { LeadSourceBadge } from "@/components/leads/lead-source-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { LEAD_CARD_STATUS_CLASS } from "@/lib/leads/constants";
import { daysSinceCreated, formatLeadValue } from "@/lib/leads/format";
import { leadToFormInput } from "@/lib/leads/form";
import type { Lead, LeadFormInput, LeadStatus } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

type LeadCardProps = {
  lead: Lead;
  onDelete: (lead: Lead) => void;
  onLeadUpdate: (lead: Lead) => void;
  onProjectCreated?: (projectId: string) => void;
  onStatusChange?: (status: LeadStatus) => void;
  isDragOverlay?: boolean;
  bulkMode?: boolean;
  selectedIds?: Set<string>;
  toggleSelect?: (id: string) => void;
  className?: string;
};

export function LeadCard({
  lead,
  onDelete,
  onLeadUpdate,
  onProjectCreated,
  onStatusChange,
  isDragOverlay = false,
  bulkMode = false,
  selectedIds,
  toggleSelect,
  className,
}: LeadCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<LeadFormInput>(leadToFormInput(lead));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = `edit-lead-${lead.id}`;
  const status = (lead.status as LeadStatus) ?? "new";
  const STATUS_STRIP_COLOUR: Record<string, string> = {
    new: "#2dd4bf",
    contacted: "#aca0ff",
    qualified: "#f59e0b",
    proposal_sent: "#ff5d00",
    won: "#10b981",
  };

  const handleLeadUpdated = useCallback(
    (updated: Lead) => {
      onLeadUpdate(updated);
    },
    [onLeadUpdate]
  );

  const cancelEdit = () => {
    setValues(leadToFormInput(lead));
    setError(null);
    setEditing(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateLead(lead.id, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data) {
        handleLeadUpdated(result.data);
      }
      setEditing(false);
      router.refresh();
    });
  };

  const handleCardClick = () => {
    if (editing) return;
    setExpanded((prev) => !prev);
  };

  if (editing) {
    return (
      <Card className="border-border/70 border-wisk-section-leads/25 bg-card/90 shadow-sm">
        <CardHeader className="gap-2 px-4 pb-2 pt-4">
          <p className="text-sm font-medium text-muted-foreground">Editing lead</p>
        </CardHeader>
        <CardContent className="px-4">
          <form id={formId} onSubmit={handleSave}>
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
        </CardContent>
        <CardFooter className="gap-2 border-t border-border/60 px-4 pb-4 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cancelEdit}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} size="sm" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "group/lead relative overflow-hidden bg-card/60 transition-all duration-200 hover:bg-card/80",
        isDragOverlay && "rotate-1 shadow-lg",
        !isDragOverlay && "cursor-pointer hover:shadow-sm",
        LEAD_CARD_STATUS_CLASS[status] ?? LEAD_CARD_STATUS_CLASS.new,
        className
      )}
      onClick={isDragOverlay ? undefined : handleCardClick}
    >
      {status !== "lost" ? (
        <div
          className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
          style={{
            background: STATUS_STRIP_COLOUR[status] ?? "#aca0ff",
            opacity: 0.6,
          }}
        />
      ) : null}

      {bulkMode ? (
        <div
          className="absolute right-3 top-3 z-10"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selectedIds?.has(lead.id) ?? false}
            onChange={() => toggleSelect?.(lead.id)}
            className="size-4 rounded accent-wisk-section-leads"
            aria-label={`Select ${lead.name}`}
          />
        </div>
      ) : null}

      <CardHeader
        className={cn(
          "gap-2 pb-2 pl-5 pr-4 pt-4",
          bulkMode && "pr-10"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              "min-w-0 flex-1 truncate text-sm font-semibold text-foreground",
              status === "lost" && "text-muted-foreground"
            )}
          >
            {lead.name}
          </h3>
          <div className="flex items-center gap-2">
            <LeadScoreBadge lead={lead} size="sm" />
            <LeadSourceBadge source={lead.source} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pb-4 pl-5 pr-4 text-sm">
        <p
          className={cn(
            "line-clamp-2 text-muted-foreground",
            status === "lost" && "text-muted-foreground/80"
          )}
        >
          {lead.service_interest}
        </p>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium tabular-nums text-foreground">
            {formatLeadValue(lead.value)}
          </span>
          <span className="text-muted-foreground">
            {daysSinceCreated(lead.created_at)}
          </span>
        </div>

        {!expanded && status !== "won" && status !== "lost" ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <LeadQuickActions lead={lead} onLeadUpdate={onLeadUpdate} />
            <p className="text-xs text-wisk-section-leads/60 transition-colors group-hover/lead:text-wisk-section-leads/80">
              Tap card to expand →
            </p>
          </div>
        ) : null}

        <ExpandableSection
          open={expanded}
          className="space-y-0 border-t border-border/50 pt-3"
        >
          <div onClick={(e) => e.stopPropagation()}>
            <LeadExpandedDetail
              lead={lead}
              onDelete={onDelete}
              onLeadUpdate={onLeadUpdate}
              onProjectCreated={onProjectCreated}
              onStatusChange={onStatusChange}
            />
          </div>
        </ExpandableSection>

        {!expanded && (status === "won" || status === "lost") ? (
          <p className="text-xs text-wisk-section-leads/60 transition-colors group-hover/lead:text-wisk-section-leads/80">
            Tap to expand →
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
