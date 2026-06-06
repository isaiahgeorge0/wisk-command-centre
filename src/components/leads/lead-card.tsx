"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { updateLead } from "@/app/(dashboard)/leads/actions";
import { ConvertLeadDialog } from "@/components/leads/convert-lead-dialog";
import { ExpandableSection } from "@/components/motion/expandable-section";
import { LeadForm } from "@/components/leads/lead-form";
import { LeadSourceBadge } from "@/components/leads/lead-source-badge";
import { LeadStatusMenu } from "@/components/leads/lead-status-menu";
import { LeadWonCelebrationTrigger } from "@/components/leads/lead-won-celebration";
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
  onStatusChange?: (status: LeadStatus) => void;
  isDragOverlay?: boolean;
  className?: string;
};

export function LeadCard({
  lead,
  onDelete,
  onLeadUpdate,
  onStatusChange,
  isDragOverlay = false,
  className,
}: LeadCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<LeadFormInput>(leadToFormInput(lead));
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [convertOpen, setConvertOpen] = useState(false);
  const formId = `edit-lead-${lead.id}`;
  const status = (lead.status as LeadStatus) ?? "new";
  const prevStatusRef = useRef(status);

  useEffect(() => {
    if (status === "won" && prevStatusRef.current !== "won") {
      setCelebrate(true);
    }
    prevStatusRef.current = status;
  }, [status]);

  const handleLeadUpdated = useCallback(
    (updated: Lead, previousStatus: LeadStatus) => {
      onLeadUpdate(updated);
      if (updated.status === "won" && previousStatus !== "won") {
        setCelebrate(true);
      }
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
      const previousStatus = lead.status as LeadStatus;
      const result = await updateLead(lead.id, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data) {
        handleLeadUpdated(result.data, previousStatus);
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
      <Card className="border-border/70 border-wisk-purple/25 bg-card/90 shadow-sm">
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
    <>
    <Card
      className={cn(
        "relative border-border/70 bg-card/80 shadow-sm transition-colors hover:bg-card",
        isDragOverlay && "shadow-md",
        !isDragOverlay && "cursor-pointer",
        LEAD_CARD_STATUS_CLASS[status] ?? LEAD_CARD_STATUS_CLASS.new,
        className
      )}
      onClick={isDragOverlay ? undefined : handleCardClick}
    >
      <LeadWonCelebrationTrigger
        celebrate={celebrate}
        onComplete={() => setCelebrate(false)}
      />

      <CardHeader className="gap-2 px-4 pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              "min-w-0 flex-1 truncate text-sm font-semibold text-foreground",
              status === "lost" && "text-muted-foreground"
            )}
          >
            {lead.name}
          </h3>
          <LeadSourceBadge source={lead.source} />
        </div>
      </CardHeader>

      <CardContent className="space-y-2 px-4 pb-4 text-sm">
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

        <ExpandableSection
          open={expanded}
          className="space-y-3 border-t border-border/50 pt-3"
        >
          <div onClick={(e) => e.stopPropagation()} className="space-y-3">
            {lead.email ? (
              <p className="text-xs text-muted-foreground">
                Email:{" "}
                <span className="text-foreground">{lead.email}</span>
              </p>
            ) : null}
            {lead.phone ? (
              <p className="text-xs text-muted-foreground">
                Phone:{" "}
                <span className="text-foreground">{lead.phone}</span>
              </p>
            ) : null}
            {lead.notes?.trim() ? (
              <p className="whitespace-pre-wrap text-xs text-foreground">
                {lead.notes}
              </p>
            ) : null}
            <LeadStatusMenu
              currentStatus={status}
              onStatusChange={(nextStatus) => onStatusChange?.(nextStatus)}
              disabled={isPending}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setExpanded(true);
                  setEditing(true);
                }}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setConvertOpen(true);
                }}
              >
                Convert to project
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onDelete(lead)}
              >
                Delete
              </Button>
            </div>
          </div>
        </ExpandableSection>

        {!expanded ? (
          <p className="text-xs text-muted-foreground">Click to expand</p>
        ) : null}
      </CardContent>
    </Card>

    <ConvertLeadDialog
      lead={lead}
      open={convertOpen}
      onOpenChange={setConvertOpen}
      onConverted={(leadId) => {
        setConvertOpen(false);
        onLeadUpdate({ ...lead, status: "won" });
        router.refresh();
      }}
    />
    </>
  );
}
