"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateLead } from "@/app/(dashboard)/leads/actions";
import { ConvertLeadDialog } from "@/components/leads/convert-lead-dialog";
import { LeadActivityTab } from "@/components/leads/lead-activity-tab";
import { LeadForm } from "@/components/leads/lead-form";
import { LeadStatusMenu } from "@/components/leads/lead-status-menu";
import { Button } from "@/components/ui/button";
import { leadToFormInput } from "@/lib/leads/form";
import type { Lead, LeadFormInput, LeadStatus } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

type ExpandedTab = "details" | "activity";

type LeadExpandedDetailProps = {
  lead: Lead;
  onDelete: (lead: Lead) => void;
  onLeadUpdate: (lead: Lead) => void;
  onProjectCreated?: (projectId: string) => void;
  onStatusChange?: (status: LeadStatus) => void;
  className?: string;
};

export function LeadExpandedDetail({
  lead,
  onDelete,
  onLeadUpdate,
  onProjectCreated,
  onStatusChange,
  className,
}: LeadExpandedDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ExpandedTab>("details");
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<LeadFormInput>(leadToFormInput(lead));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [convertOpen, setConvertOpen] = useState(false);
  const [localFollowUpDate, setLocalFollowUpDate] = useState<string | null>(
    lead.follow_up_date ?? null
  );
  const formId = `edit-lead-${lead.id}`;
  const status = (lead.status as LeadStatus) ?? "new";

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
        onLeadUpdate(result.data);
      }
      setEditing(false);
      router.refresh();
    });
  };

  if (editing) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-sm font-medium text-muted-foreground">Editing lead</p>
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
        <div className="flex gap-2">
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
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-3", className)}>
        <div className="flex gap-0.5 rounded-lg bg-muted/40 p-0.5">
          {(["details", "activity"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 rounded-md py-1 text-xs font-medium capitalize transition-colors",
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "activity" ? (
                <span className="flex items-center justify-center gap-1">
                  Activity
                  {localFollowUpDate &&
                  localFollowUpDate < new Date().toISOString().slice(0, 10) ? (
                    <span className="size-1.5 shrink-0 rounded-full bg-orange-500" />
                  ) : null}
                </span>
              ) : (
                "Details"
              )}
            </button>
          ))}
        </div>

        {activeTab === "details" ? (
          <div className="space-y-3">
            {lead.email ? (
              <p className="text-xs text-muted-foreground">
                Email:{" "}
                <a
                  href={`mailto:${lead.email}`}
                  className="text-sm text-wisk-teal hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {lead.email}
                </a>
              </p>
            ) : null}
            {lead.phone ? (
              <p className="text-xs text-muted-foreground">
                Phone: <span className="text-foreground">{lead.phone}</span>
              </p>
            ) : null}
            {localFollowUpDate ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                Follow up:{" "}
                <span
                  className={cn(
                    "font-medium",
                    localFollowUpDate < new Date().toISOString().slice(0, 10)
                      ? "text-orange-500"
                      : "text-foreground"
                  )}
                >
                  {new Date(localFollowUpDate + "T12:00:00").toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "short" }
                  )}
                </span>
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
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConvertOpen(true)}
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
        ) : null}

        {activeTab === "activity" ? (
          <LeadActivityTab
            lead={lead}
            onFollowUpChange={(date) => setLocalFollowUpDate(date)}
          />
        ) : null}
      </div>

      <ConvertLeadDialog
        lead={lead}
        open={convertOpen}
        onOpenChange={setConvertOpen}
        onConverted={(_leadId, projectId) => {
          setConvertOpen(false);
          onLeadUpdate({ ...lead, status: "won" });
          onProjectCreated?.(projectId);
          router.refresh();
        }}
      />
    </>
  );
}
