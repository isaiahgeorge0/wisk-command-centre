"use client";

import {
  ArrowRight,
  CalendarDays,
  FileText,
  Loader2,
  Mail,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import {
  addLeadActivity,
  deleteLeadActivity,
  getLeadActivities,
  setLeadFollowUp,
} from "@/app/(dashboard)/leads/actions";
import type {
  Lead,
  LeadActivity,
  LeadActivityType,
} from "@/lib/leads/types";
import { cn } from "@/lib/utils";

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// ─── Activity icon ─────────────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: LeadActivityType }) {
  const props = { className: "size-3.5 shrink-0", "aria-hidden": true };
  switch (type) {
    case "call":
      return <Phone {...props} className={cn(props.className, "text-blue-500")} />;
    case "email":
      return <Mail {...props} className={cn(props.className, "text-wisk-section-leads")} />;
    case "meeting":
      return <Users {...props} className={cn(props.className, "text-wisk-section-leads")} />;
    case "stage_change":
      return <ArrowRight {...props} className={cn(props.className, "text-amber-500")} />;
    case "follow_up_set":
      return <CalendarDays {...props} className={cn(props.className, "text-wisk-section-leads")} />;
    case "ai_notes":
      return <Sparkles {...props} className={cn(props.className, "text-wisk-section-leads")} />;
    default:
      return <FileText {...props} className={cn(props.className, "text-muted-foreground")} />;
  }
}

// ─── Inline log form ──────────────────────────────────────────────────────────

const LOG_TYPES: { type: LeadActivityType; label: string }[] = [
  { type: "note", label: "Note" },
  { type: "call", label: "Call" },
  { type: "email", label: "Email" },
  { type: "meeting", label: "Meeting" },
];

type LogFormProps = {
  leadId: string;
  onSaved: (activity: LeadActivity) => void;
  onCancel: () => void;
};

function LogActivityForm({ leadId, onSaved, onCancel }: LogFormProps) {
  const [activityType, setActivityType] = useState<LeadActivityType>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addLeadActivity(leadId, {
        activity_type: activityType,
        title: title.trim(),
        content: content.trim() || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data) onSaved(result.data);
    });
  };

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
      {/* Type selector */}
      <div className="flex gap-1 flex-wrap">
        {LOG_TYPES.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setActivityType(type)}
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              activityType === type
                ? "bg-wisk-section-leads/15 text-wisk-section-leads border border-wisk-section-leads/30"
                : "border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <ActivityIcon type={type} />
            {label}
          </button>
        ))}
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={
          activityType === "call"
            ? "e.g. Called to discuss proposal"
            : activityType === "email"
            ? "e.g. Sent follow-up email"
            : activityType === "meeting"
            ? "e.g. Discovery call"
            : "e.g. Note about this lead"
        }
        className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-wisk-section-leads/40"
      />

      {/* Content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="w-full resize-none rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-wisk-section-leads/40"
      />

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !title.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-wisk-section-leads px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : null}
          Save
        </button>
      </div>
    </div>
  );
}

// ─── Follow-up reminder ───────────────────────────────────────────────────────

type FollowUpProps = {
  leadId: string;
  followUpDate: string | null;
  onDateChange: (date: string | null) => void;
};

function FollowUpReminder({ leadId, followUpDate, onDateChange }: FollowUpProps) {
  const [isPending, startTransition] = useTransition();
  const isOverdue =
    followUpDate !== null && followUpDate < new Date().toISOString().slice(0, 10);

  const handleChange = (value: string | null) => {
    startTransition(async () => {
      await setLeadFollowUp(leadId, value);
      onDateChange(value);
    });
  };

  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
          <span className="text-xs font-medium text-muted-foreground">Follow up on</span>
        </div>
        {followUpDate && (
          <button
            onClick={() => handleChange(null)}
            disabled={isPending}
            aria-label="Clear follow-up date"
            className="text-muted-foreground/60 hover:text-destructive transition-colors"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {followUpDate ? (
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              isOverdue ? "text-orange-500" : "text-foreground"
            )}
          >
            {isOverdue ? "Overdue — " : ""}
            {new Date(followUpDate + "T12:00:00").toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </span>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => handleChange(e.target.value || null)}
            disabled={isPending}
            className="rounded-lg border border-border/60 bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-wisk-section-leads/40 disabled:opacity-50"
          />
        </div>
      ) : (
        <input
          type="date"
          onChange={(e) => { if (e.target.value) handleChange(e.target.value); }}
          disabled={isPending}
          className="rounded-lg border border-border/60 bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-wisk-section-leads/40 disabled:opacity-50"
        />
      )}
    </div>
  );
}

// ─── Activity timeline ────────────────────────────────────────────────────────

type ActivityItemProps = {
  activity: LeadActivity;
  onDelete: (id: string) => void;
};

function ActivityItem({ activity, onDelete }: ActivityItemProps) {
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteLeadActivity(activity.id);
      onDelete(activity.id);
    });
  };

  return (
    <div
      className="flex gap-2.5 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
    >
      {/* Icon column */}
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40">
          <ActivityIcon type={activity.activity_type} />
        </div>
        <div className="w-px flex-1 bg-border/30 min-h-[8px]" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-3 min-w-0">
        <div className="flex items-start gap-1 justify-between">
          <span className="text-xs font-medium text-foreground leading-tight">
            {activity.title}
          </span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
              {relativeTime(activity.created_at)}
            </span>
            {/* Delete — always visible on mobile, hover on desktop */}
            {confirmDelete ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="text-[10px] text-destructive font-medium px-1 hover:underline"
                >
                  {isPending ? "…" : "Delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[10px] text-muted-foreground px-1 hover:underline"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete activity"
                className={cn(
                  "rounded p-0.5 text-muted-foreground/40 hover:text-destructive transition-colors",
                  hovered ? "opacity-100" : "opacity-0 md:group-hover:opacity-100 opacity-100 md:opacity-0"
                )}
              >
                <Trash2 className="size-3" aria-hidden />
              </button>
            )}
          </div>
        </div>
        {activity.content ? (
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            {activity.content}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main activity tab ────────────────────────────────────────────────────────

type LeadActivityTabProps = {
  lead: Lead;
  onFollowUpChange: (date: string | null) => void;
};

export function LeadActivityTab({
  lead,
  onFollowUpChange,
}: LeadActivityTabProps) {
  const [activities, setActivities] = useState<LeadActivity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<string | null>(
    lead.follow_up_date ?? null
  );

  // Load activities on mount (i.e. when the tab is first opened)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLeadActivities(lead.id).then((result) => {
      if (cancelled) return;
      if (result.success && result.data) {
        setActivities(result.data);
      } else {
        setActivities([]);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [lead.id]);

  const handleActivitySaved = (activity: LeadActivity) => {
    setActivities((prev) => [activity, ...(prev ?? [])]);
    setShowLogForm(false);
  };

  const handleActivityDeleted = (id: string) => {
    setActivities((prev) => (prev ?? []).filter((a) => a.id !== id));
  };

  const handleFollowUpChange = (date: string | null) => {
    setFollowUpDate(date);
    onFollowUpChange(date);
  };

  return (
    <div className="space-y-3 pt-1">
      {/* Follow-up reminder */}
      <FollowUpReminder
        leadId={lead.id}
        followUpDate={followUpDate}
        onDateChange={handleFollowUpChange}
      />

      {/* Log activity button / form */}
      {showLogForm ? (
        <LogActivityForm
          leadId={lead.id}
          onSaved={handleActivitySaved}
          onCancel={() => setShowLogForm(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowLogForm(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-2 text-xs text-muted-foreground transition-colors hover:border-wisk-section-leads/40 hover:bg-wisk-section-leads/5 hover:text-foreground"
        >
          <Plus className="size-3.5" aria-hidden />
          Log activity
        </button>
      )}

      {/* Activity timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : activities === null || activities.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <FileText className="size-6 text-muted-foreground/40" aria-hidden />
          <p className="text-xs text-muted-foreground">
            No activity logged yet.
            <br />
            Log your first interaction above.
          </p>
        </div>
      ) : (
        <div className="mt-1">
          {activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              onDelete={handleActivityDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
