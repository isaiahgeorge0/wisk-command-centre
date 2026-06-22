"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  createCustomInbox,
  createEmailRule,
  deleteCustomInbox,
  deleteEmailRule,
  updateCustomInbox,
} from "@/app/(dashboard)/email/actions";
import { useIsMobilePanel } from "@/components/calendar/use-is-mobile-panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EmailCategory } from "@/lib/email/categoriser";
import type { CustomInbox, EmailRule } from "@/lib/email/types";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import { cn } from "@/lib/utils";

const PRESET_COLOURS = [
  { label: "Purple", hex: "#7c3aed" },
  { label: "Teal", hex: "#14b8a6" },
  { label: "Blue", hex: "#3b82f6" },
  { label: "Amber", hex: "#f59e0b" },
  { label: "Coral", hex: "#f97316" },
  { label: "Green", hex: "#22c55e" },
  { label: "Rose", hex: "#f43f5e" },
  { label: "Slate", hex: "#64748b" },
] as const;

const DEFAULT_CATEGORIES: { id: EmailCategory; label: string }[] = [
  { id: "leads", label: "Leads" },
  { id: "clients", label: "Clients" },
  { id: "admin", label: "Admin" },
  { id: "newsletters", label: "Newsletters" },
  { id: "other", label: "Other" },
];

export type RulePrefill = {
  ruleType: "sender" | "domain";
  value: string;
};

type ManageInboxesPanelProps = {
  open: boolean;
  onClose: () => void;
  customInboxes: CustomInbox[];
  emailRules: EmailRule[];
  onCustomInboxesChange: (inboxes: CustomInbox[]) => void;
  onEmailRulesChange: (rules: EmailRule[]) => void;
  onApplyAlwaysRuleToExisting: (rule: EmailRule) => void;
  rulePrefill: RulePrefill | null;
  onRulePrefillConsumed: () => void;
};

type InboxFormState = {
  id: string | null;
  name: string;
  colour: string;
};

type RuleFormState = {
  ruleType: "sender" | "domain";
  value: string;
  targetKey: string;
  applyType: "always" | "once";
  applyToExisting: boolean;
};

function ColourDot({ colour, className }: { colour: string; className?: string }) {
  return (
    <span
      className={cn("size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: colour }}
      aria-hidden
    />
  );
}

function targetLabel(
  rule: EmailRule,
  customInboxes: CustomInbox[]
): string {
  if (rule.target_type === "default_category") {
    return (
      DEFAULT_CATEGORIES.find((category) => category.id === rule.target_id)
        ?.label ?? rule.target_id
    );
  }

  return (
    customInboxes.find((inbox) => inbox.id === rule.target_id)?.name ??
    "Custom inbox"
  );
}

function InboxForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: InboxFormState;
  onSave: (name: string, colour: string) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [colour, setColour] = useState(initial.colour);

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Inbox name"
        className="min-h-11"
      />
      <div className="flex flex-wrap gap-2">
        {PRESET_COLOURS.map((preset) => (
          <button
            key={preset.hex}
            type="button"
            title={preset.label}
            onClick={() => setColour(preset.hex)}
            className={cn(
              "flex size-11 items-center justify-center rounded-md border transition-colors md:size-9",
              colour === preset.hex
                ? "border-foreground ring-2 ring-foreground/20"
                : "border-border/60 hover:border-foreground/40"
            )}
          >
            <span
              className="size-5 rounded-full"
              style={{ backgroundColor: preset.hex }}
            />
          </button>
        ))}
      </div>
      <Input
        value={colour}
        onChange={(event) => setColour(event.target.value)}
        placeholder="#7c3aed"
        className="min-h-11 font-mono text-sm"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isSaving}
          onClick={() => void onSave(name, colour)}
        >
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function RuleForm({
  initial,
  customInboxes,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: RuleFormState;
  customInboxes: CustomInbox[];
  onSave: (form: RuleFormState) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState(initial);

  const targetOptions = [
    ...DEFAULT_CATEGORIES.map((category) => ({
      key: `category:${category.id}`,
      label: category.label,
      targetType: "default_category" as const,
      targetId: category.id,
    })),
    ...customInboxes.map((inbox) => ({
      key: `inbox:${inbox.id}`,
      label: inbox.name,
      targetType: "custom_inbox" as const,
      targetId: inbox.id,
    })),
  ];

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap gap-1">
        {(["sender", "domain"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setForm((current) => ({ ...current, ruleType: type }))}
            className={cn(
              "min-h-11 rounded-md px-3 text-xs font-medium transition-colors md:min-h-8",
              form.ruleType === type
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/70"
            )}
          >
            {type === "sender" ? "Sender" : "Domain"}
          </button>
        ))}
      </div>
      <Input
        value={form.value}
        onChange={(event) =>
          setForm((current) => ({ ...current, value: event.target.value }))
        }
        placeholder={
          form.ruleType === "sender"
            ? "john@example.com"
            : "@example.com"
        }
        className="min-h-11"
      />
      <Select
        value={form.targetKey}
        onValueChange={(value) => {
          if (!value) return;
          setForm((current) => ({ ...current, targetKey: value }));
        }}
      >
        <SelectTrigger className="min-h-11 w-full">
          <SelectValue placeholder="Apply to" />
        </SelectTrigger>
        <SelectContent>
          {targetOptions.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-1">
        {(["always", "once"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setForm((current) => ({ ...current, applyType: type }))}
            className={cn(
              "min-h-11 rounded-md px-3 text-xs font-medium transition-colors md:min-h-8",
              form.applyType === type
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/70"
            )}
          >
            {type === "always" ? "Always" : "One-off"}
          </button>
        ))}
      </div>
      {form.applyType === "always" ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.applyToExisting}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                applyToExisting: event.target.checked,
              }))
            }
            className="size-4 rounded border-border"
          />
          Apply to existing emails in this session
        </label>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isSaving || targetOptions.length === 0}
          onClick={() => void onSave(form)}
        >
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ManagePanelContent({
  customInboxes,
  emailRules,
  onCustomInboxesChange,
  onEmailRulesChange,
  onApplyAlwaysRuleToExisting,
  rulePrefill,
  onRulePrefillConsumed,
  onClose,
}: Omit<ManageInboxesPanelProps, "open">) {
  const [inboxForm, setInboxForm] = useState<InboxFormState | null>(null);
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [ruleFormInitial, setRuleFormInitial] = useState<RuleFormState | null>(
    null
  );
  const [deleteInboxId, setDeleteInboxId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rulePrefill) return;
    setRuleFormInitial({
      ruleType: rulePrefill.ruleType,
      value: rulePrefill.value,
      targetKey: "category:leads",
      applyType: "always",
      applyToExisting: false,
    });
    setRuleFormOpen(true);
    onRulePrefillConsumed();
  }, [onRulePrefillConsumed, rulePrefill]);

  const openNewRuleForm = () => {
    setRuleFormInitial({
      ruleType: "sender",
      value: "",
      targetKey: "category:leads",
      applyType: "always",
      applyToExisting: false,
    });
    setRuleFormOpen(true);
  };

  const handleSaveInbox = async (name: string, colour: string) => {
    setIsSaving(true);
    setError(null);

    const result = inboxForm?.id
      ? await updateCustomInbox(inboxForm.id, name, colour)
      : await createCustomInbox(name, colour);

    setIsSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    if (inboxForm?.id) {
      onCustomInboxesChange(
        customInboxes.map((inbox) =>
          inbox.id === inboxForm.id
            ? { ...inbox, name: name.trim(), colour }
            : inbox
        )
      );
    } else if ("data" in result && result.data) {
      onCustomInboxesChange([...customInboxes, result.data]);
    }

    setInboxForm(null);
  };

  const handleDeleteInbox = async (id: string) => {
    setIsSaving(true);
    setError(null);

    const result = await deleteCustomInbox(id);
    setIsSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onCustomInboxesChange(customInboxes.filter((inbox) => inbox.id !== id));
    onEmailRulesChange(
      emailRules.filter(
        (rule) => !(rule.target_type === "custom_inbox" && rule.target_id === id)
      )
    );
    setDeleteInboxId(null);
  };

  const handleSaveRule = async (form: RuleFormState) => {
    const [targetTypeRaw, targetId] = form.targetKey.split(":");
    const targetType =
      targetTypeRaw === "inbox" ? "custom_inbox" : "default_category";

    setIsSaving(true);
    setError(null);

    const result = await createEmailRule({
      ruleType: form.ruleType,
      value: form.value,
      targetType,
      targetId,
      applyType: form.applyType,
    });

    setIsSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    if (result.data) {
      onEmailRulesChange([result.data, ...emailRules]);
      if (form.applyType === "always" && form.applyToExisting) {
        onApplyAlwaysRuleToExisting(result.data);
      }
    }

    setRuleFormOpen(false);
    setRuleFormInitial(null);
  };

  const handleDeleteRule = async (id: string) => {
    setIsSaving(true);
    setError(null);

    const result = await deleteEmailRule(id);
    setIsSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onEmailRulesChange(emailRules.filter((rule) => rule.id !== id));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Manage inboxes</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Custom inboxes and sender rules
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close manage inboxes"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {error ? (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Custom inboxes
            </h3>
            {!inboxForm ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  setInboxForm({ id: null, name: "", colour: "#7c3aed" })
                }
              >
                <Plus className="size-3.5" aria-hidden />
                New inbox
              </Button>
            ) : null}
          </div>

          {inboxForm ? (
            <InboxForm
              key={inboxForm.id ?? "new"}
              initial={inboxForm}
              onSave={handleSaveInbox}
              onCancel={() => setInboxForm(null)}
              isSaving={isSaving}
            />
          ) : null}

          {customInboxes.length === 0 && !inboxForm ? (
            <p className="text-sm text-muted-foreground">No custom inboxes yet.</p>
          ) : (
            <ul className="space-y-2">
              {customInboxes.map((inbox) => (
                <li
                  key={inbox.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <ColourDot colour={inbox.colour} />
                    <span className="truncate text-sm font-medium">{inbox.name}</span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="min-h-11 min-w-11 md:min-h-8 md:min-w-8"
                      aria-label={`Edit ${inbox.name}`}
                      onClick={() =>
                        setInboxForm({
                          id: inbox.id,
                          name: inbox.name,
                          colour: inbox.colour,
                        })
                      }
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="min-h-11 min-w-11 text-destructive hover:text-destructive md:min-h-8 md:min-w-8"
                      aria-label={`Delete ${inbox.name}`}
                      onClick={() => setDeleteInboxId(inbox.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sender rules
            </h3>
            {!ruleFormOpen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={openNewRuleForm}
              >
                <Plus className="size-3.5" aria-hidden />
                Add rule
              </Button>
            ) : null}
          </div>

          {ruleFormOpen && ruleFormInitial ? (
            <RuleForm
              key={`${ruleFormInitial.value}-${ruleFormInitial.ruleType}`}
              initial={ruleFormInitial}
              customInboxes={customInboxes}
              onSave={handleSaveRule}
              onCancel={() => {
                setRuleFormOpen(false);
                setRuleFormInitial(null);
              }}
              isSaving={isSaving}
            />
          ) : null}

          {emailRules.length === 0 && !ruleFormOpen ? (
            <p className="text-sm text-muted-foreground">No sender rules yet.</p>
          ) : (
            <ul className="space-y-2">
              {emailRules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase">
                        {rule.rule_type}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase">
                        {rule.apply_type}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium">{rule.value}</p>
                    <p className="text-xs text-muted-foreground">
                      → {targetLabel(rule, customInboxes)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="min-h-11 min-w-11 shrink-0 text-destructive hover:text-destructive md:min-h-8 md:min-w-8"
                    aria-label="Delete rule"
                    onClick={() => void handleDeleteRule(rule.id)}
                    disabled={isSaving}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <AlertDialog
        open={deleteInboxId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteInboxId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete custom inbox?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the inbox and any rules that target it. Emails will
              no longer be sorted into this inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteInboxId) void handleDeleteInbox(deleteInboxId);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function ManageInboxesPanel({
  open,
  onClose,
  customInboxes,
  emailRules,
  onCustomInboxesChange,
  onEmailRulesChange,
  onApplyAlwaysRuleToExisting,
  rulePrefill,
  onRulePrefillConsumed,
}: ManageInboxesPanelProps) {
  const { reduced, transition } = useMotionSafe();
  const isMobile = useIsMobilePanel();

  useEffect(() => {
    if (!open || !isMobile) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isMobile]);

  if (!open) return null;

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          aria-label="Close manage inboxes"
          className="fixed inset-0 z-40 bg-black/10 supports-backdrop-filter:backdrop-blur-xs"
          onClick={onClose}
        />
        <motion.div
          initial={reduced ? false : { y: "100%" }}
          animate={{ y: 0 }}
          exit={reduced ? undefined : { y: "100%" }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth }
          }
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] min-h-[60vh] flex-col overflow-hidden rounded-t-2xl border-t border-border/60 bg-popover pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg"
        >
          <ManagePanelContent
            customInboxes={customInboxes}
            emailRules={emailRules}
            onCustomInboxesChange={onCustomInboxesChange}
            onEmailRulesChange={onEmailRulesChange}
            onApplyAlwaysRuleToExisting={onApplyAlwaysRuleToExisting}
            rulePrefill={rulePrefill}
            onRulePrefillConsumed={onRulePrefillConsumed}
            onClose={onClose}
          />
        </motion.div>
      </>
    );
  }

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        aria-label="Close manage inboxes"
        className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={transition}
        onClick={onClose}
      />
      <motion.aside
        initial={reduced ? false : { x: "100%" }}
        animate={{ x: 0 }}
        exit={reduced ? undefined : { x: "100%" }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth }
        }
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border/60 bg-card shadow-xl"
      >
        <ManagePanelContent
          customInboxes={customInboxes}
          emailRules={emailRules}
          onCustomInboxesChange={onCustomInboxesChange}
          onEmailRulesChange={onEmailRulesChange}
          onApplyAlwaysRuleToExisting={onApplyAlwaysRuleToExisting}
          rulePrefill={rulePrefill}
          onRulePrefillConsumed={onRulePrefillConsumed}
          onClose={onClose}
        />
      </motion.aside>
    </AnimatePresence>
  );
}

export function ManageInboxesButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground md:min-h-8"
      aria-label="Manage inboxes"
    >
      <Settings2 className="size-3.5" aria-hidden />
      <span className="hidden sm:inline">Manage</span>
    </button>
  );
}
