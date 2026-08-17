"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { commitWinstonProposal } from "@/lib/winston/commit-proposal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CONTENT_PLATFORMS,
  CONTENT_STATUSES,
  CONTENT_TYPES,
} from "@/lib/content/types";
import { PROJECT_STATUSES } from "@/lib/projects/types";
import { TASK_PRIORITIES } from "@/lib/tasks/types";
import {
  asString,
  asStringArray,
  countCreatedProposalItems,
  createdTempIdsFromResult,
  createManualProposalItem,
  summarizeSelectedItems,
  WINSTON_PROPOSAL_ENTITY_LABELS,
  WINSTON_PROPOSAL_ENTITY_TYPES,
  type WinstonProposal,
  type WinstonProposalCommitResult,
  type WinstonProposalEntityType,
  type WinstonProposalItem,
} from "@/lib/winston/proposal";
import { cn } from "@/lib/utils";

type WinstonProposalReviewProps = {
  proposal: WinstonProposal;
  /**
   * Types the user can add manually. Defaults to every proposal type so a
   * mixed conversation can add a missing task/post without being locked to
   * whatever Winston happened to emit first.
   */
  allowedEntityTypes?: WinstonProposalEntityType[];
  title?: string;
  commitLabel?: string;
  onCancel: () => void;
  onCommitted: (result: WinstonProposalCommitResult) => void;
};

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <Input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 text-sm"
    />
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function updateField(
  item: WinstonProposalItem,
  key: string,
  value: unknown
): WinstonProposalItem {
  return {
    ...item,
    fields: {
      ...item.fields,
      [key]: value,
    },
  };
}

function ItemFields({
  item,
  projectOptions,
  onChange,
}: {
  item: WinstonProposalItem;
  projectOptions: { tempId: string; name: string }[];
  onChange: (next: WinstonProposalItem) => void;
}) {
  const set = (key: string, value: unknown) =>
    onChange(updateField(item, key, value));

  switch (item.entityType) {
    case "project":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldRow label="Project name">
              <TextField
                value={asString(item.fields.project_name)}
                onChange={(v) => set("project_name", v)}
                placeholder="Name"
              />
            </FieldRow>
          </div>
          <FieldRow label="Type">
            <TextField
              value={asString(item.fields.service_type)}
              onChange={(v) => set("service_type", v)}
              placeholder="e.g. Web, Retainer"
            />
          </FieldRow>
          <FieldRow label="Status">
            <SelectField
              value={asString(item.fields.status, "active")}
              onChange={(v) => set("status", v)}
              options={PROJECT_STATUSES.map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1),
              }))}
            />
          </FieldRow>
          <FieldRow label="Deadline">
            <TextField
              type="date"
              value={asString(item.fields.deadline)}
              onChange={(v) => set("deadline", v)}
            />
          </FieldRow>
          <FieldRow label="Client">
            <TextField
              value={asString(item.fields.client_name)}
              onChange={(v) => set("client_name", v)}
              placeholder="Optional"
            />
          </FieldRow>
        </div>
      );
    case "task":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldRow label="Title">
              <TextField
                value={asString(item.fields.title)}
                onChange={(v) => set("title", v)}
                placeholder="Task title"
              />
            </FieldRow>
          </div>
          <FieldRow label="Priority">
            <SelectField
              value={asString(item.fields.priority, "medium")}
              onChange={(v) => set("priority", v)}
              options={TASK_PRIORITIES.map((p) => ({
                value: p,
                label: p.charAt(0).toUpperCase() + p.slice(1),
              }))}
            />
          </FieldRow>
          <FieldRow label="Due date">
            <TextField
              type="date"
              value={asString(item.fields.due_date)}
              onChange={(v) => set("due_date", v)}
            />
          </FieldRow>
          <div className="sm:col-span-2">
            <FieldRow label="Project (from this proposal)">
              <SelectField
                value={asString(item.fields.projectRef)}
                onChange={(v) => set("projectRef", v)}
                options={[
                  { value: "", label: "No project / use existing ID below" },
                  ...projectOptions.map((p) => ({
                    value: p.tempId,
                    label: p.name || "Untitled project",
                  })),
                ]}
              />
            </FieldRow>
          </div>
          {!asString(item.fields.projectRef) ? (
            <div className="sm:col-span-2">
              <FieldRow label="Existing project ID (optional)">
                <TextField
                  value={asString(item.fields.projectId)}
                  onChange={(v) => set("projectId", v)}
                  placeholder="UUID of an existing project"
                />
              </FieldRow>
            </div>
          ) : null}
        </div>
      );
    case "calendar_event":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldRow label="Title">
              <TextField
                value={asString(item.fields.title)}
                onChange={(v) => set("title", v)}
                placeholder="Event title"
              />
            </FieldRow>
          </div>
          <FieldRow label="Date">
            <TextField
              type="date"
              value={asString(item.fields.date)}
              onChange={(v) => set("date", v)}
            />
          </FieldRow>
          <FieldRow label="End date">
            <TextField
              type="date"
              value={asString(item.fields.end_date)}
              onChange={(v) => set("end_date", v)}
            />
          </FieldRow>
          <FieldRow label="Type">
            <SelectField
              value={asString(item.fields.event_type, "lifestyle")}
              onChange={(v) => set("event_type", v)}
              options={[
                { value: "lifestyle", label: "Lifestyle" },
                { value: "other", label: "Other" },
              ]}
            />
          </FieldRow>
        </div>
      );
    case "content_post": {
      const platforms = asStringArray(item.fields.platforms);
      const primary = platforms[0] ?? "TikTok";
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldRow label="Title">
              <TextField
                value={asString(item.fields.title)}
                onChange={(v) => set("title", v)}
                placeholder="Content title"
              />
            </FieldRow>
          </div>
          <FieldRow label="Platform">
            <SelectField
              value={primary}
              onChange={(v) => set("platforms", [v])}
              options={CONTENT_PLATFORMS.map((p) => ({
                value: p,
                label: p,
              }))}
            />
          </FieldRow>
          <FieldRow label="Type">
            <SelectField
              value={asString(item.fields.content_type, "Video")}
              onChange={(v) => set("content_type", v)}
              options={CONTENT_TYPES.map((t) => ({
                value: t,
                label: t,
              }))}
            />
          </FieldRow>
          <FieldRow label="Status">
            <SelectField
              value={asString(item.fields.status, "idea")}
              onChange={(v) => set("status", v)}
              options={CONTENT_STATUSES.map((s) => ({
                value: s,
                label: s.replace(/_/g, " "),
              }))}
            />
          </FieldRow>
          <FieldRow label="Scheduled date">
            <TextField
              type="date"
              value={asString(item.fields.scheduled_date)}
              onChange={(v) => set("scheduled_date", v)}
            />
          </FieldRow>
        </div>
      );
    }
    case "idea":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldRow label="Title">
              <TextField
                value={asString(item.fields.title)}
                onChange={(v) => set("title", v)}
                placeholder="Idea title"
              />
            </FieldRow>
          </div>
          <div className="sm:col-span-2">
            <FieldRow label="Description">
              <TextField
                value={asString(item.fields.description)}
                onChange={(v) => set("description", v)}
                placeholder="Optional"
              />
            </FieldRow>
          </div>
          <FieldRow label="Category">
            <TextField
              value={asString(item.fields.category, "Calendar")}
              onChange={(v) => set("category", v)}
            />
          </FieldRow>
          <FieldRow label="Status">
            <SelectField
              value={asString(item.fields.status, "awaiting-date")}
              onChange={(v) => set("status", v)}
              options={[
                { value: "awaiting-date", label: "Awaiting a date" },
                { value: "new", label: "New" },
                { value: "exploring", label: "Exploring" },
                { value: "parked", label: "Parked" },
              ]}
            />
          </FieldRow>
        </div>
      );
  }
}

function ProposalItemCard({
  item,
  projectOptions,
  onChange,
  onRemove,
}: {
  item: WinstonProposalItem;
  projectOptions: { tempId: string; name: string }[];
  onChange: (next: WinstonProposalItem) => void;
  onRemove: () => void;
}) {
  const label = WINSTON_PROPOSAL_ENTITY_LABELS[item.entityType];
  const reasoning = item.reasoning.trim() || "No reason provided";

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/60 p-3 space-y-3 transition-opacity",
        !item.selected && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={item.selected}
          onCheckedChange={(checked) =>
            onChange({ ...item, selected: checked === true })
          }
          aria-label={`Include ${label}`}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${label}`}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <ItemFields
            item={item}
            projectOptions={projectOptions}
            onChange={onChange}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground/80">Why: </span>
            {reasoning}
          </p>
        </div>
      </div>
    </div>
  );
}

export function WinstonProposalReview({
  proposal,
  allowedEntityTypes,
  title = "Review Winston’s proposals",
  commitLabel = "Create selected",
  onCancel,
  onCommitted,
}: WinstonProposalReviewProps) {
  const [items, setItems] = useState<WinstonProposalItem[]>(() =>
    proposal.items.map((item) => ({
      ...item,
      fields: { ...item.fields },
    }))
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [addType, setAddType] = useState<WinstonProposalEntityType | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(
      proposal.items.map((item) => ({
        ...item,
        fields: { ...item.fields },
      }))
    );
    setErrors([]);
    // Reset only when a new proposal is handed in — not on every items identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- proposalId is the stable key
  }, [proposal.proposalId]);

  const addableTypes = useMemo(() => {
    if (allowedEntityTypes && allowedEntityTypes.length > 0) {
      return allowedEntityTypes;
    }
    return [...WINSTON_PROPOSAL_ENTITY_TYPES];
  }, [allowedEntityTypes]);

  useEffect(() => {
    if (!addType || addableTypes.includes(addType)) return;
    setAddType(addableTypes[0] ?? null);
  }, [addType, addableTypes]);

  const projectOptions = useMemo(
    () =>
      items
        .filter((i) => i.entityType === "project")
        .map((i) => ({
          tempId: i.tempId,
          name: asString(i.fields.project_name),
        })),
    [items]
  );

  const summary = summarizeSelectedItems(items);
  const selectedCount = items.filter((i) => i.selected).length;

  function handleAdd() {
    const type = addType ?? addableTypes[0];
    if (!type) return;
    setItems((prev) => [...prev, createManualProposalItem(type)]);
  }

  function handleCommit() {
    setErrors([]);
    startTransition(async () => {
      const result = await commitWinstonProposal(items, {
        source: { sourceType: proposal.sourceType, sourceId: proposal.sourceId },
      });
      if (!result.success) {
        setErrors([result.error]);
        return;
      }
      if (!result.data) {
        setErrors(["Nothing was created"]);
        return;
      }

      const createdCount = countCreatedProposalItems(result.data);
      const createdTempIds = createdTempIdsFromResult(result.data);
      if (createdTempIds.size > 0) {
        setItems((prev) => prev.filter((item) => !createdTempIds.has(item.tempId)));
      }

      if (result.data.errors.length > 0) {
        setErrors(result.data.errors);
        if (createdCount === 0) return;
      }

      onCommitted(result.data);
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border/60 bg-card/80">
      <div className="shrink-0 space-y-1 border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">
          Edit, deselect, or remove items — nothing is created until you
          confirm.
        </p>
        <p className="text-xs font-medium tabular-nums text-foreground/80">
          {summary}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {items.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No items yet. Add one below.
          </p>
        ) : (
          items.map((item) => (
            <ProposalItemCard
              key={item.tempId}
              item={item}
              projectOptions={projectOptions}
              onChange={(next) =>
                setItems((prev) =>
                  prev.map((i) => (i.tempId === next.tempId ? next : i))
                )
              }
              onRemove={() =>
                setItems((prev) => prev.filter((i) => i.tempId !== item.tempId))
              }
            />
          ))
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-border/60 px-4 py-3">
        {addableTypes.length > 0 ? (
          <div className="flex flex-wrap items-end gap-2">
            {addableTypes.length > 1 ? (
              <div className="min-w-[140px] flex-1 space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Add item
                </Label>
                <SelectField
                  value={addType ?? addableTypes[0]!}
                  onChange={(v) =>
                    setAddType(v as WinstonProposalEntityType)
                  }
                  options={addableTypes.map((t) => ({
                    value: t,
                    label: WINSTON_PROPOSAL_ENTITY_LABELS[t],
                  }))}
                />
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="gap-1.5"
            >
              <Plus className="size-3.5" aria-hidden />
              Add{" "}
              {WINSTON_PROPOSAL_ENTITY_LABELS[
                addType ?? addableTypes[0]!
              ].toLowerCase()}
            </Button>
          </div>
        ) : null}

        {errors.length > 0 ? (
          <ul className="space-y-1 text-xs text-destructive">
            {errors.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleCommit}
            disabled={isPending || selectedCount === 0}
            className="gap-1.5 bg-wisk-section-winston text-wisk-section-winston-fg hover:opacity-90"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : null}
            {commitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
