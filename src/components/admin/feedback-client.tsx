"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { Bug } from "lucide-react";

import {
  getFeedback,
  updateFeedbackNotes,
  updateFeedbackStatus,
} from "@/app/(dashboard)/admin/actions";
import type { AdminFeedback, FeedbackFilter, FeedbackStatus } from "@/lib/feedback/types";
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TYPE_LABELS,
} from "@/lib/feedback/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FeedbackClientProps = {
  feedback: AdminFeedback[];
};

const FILTER_TABS: { label: string; value: FeedbackFilter }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Actioned", value: "actioned" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function previewMessage(message: string, max = 80) {
  const trimmed = message.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max)}…`;
}

function StatusBadge({ status }: { status: FeedbackStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "new" &&
          "border-red-400/40 bg-red-500/10 text-red-700 dark:text-red-300",
        status === "reviewed" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        status === "actioned" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      )}
    >
      {FEEDBACK_STATUS_LABELS[status]}
    </Badge>
  );
}

function TypeBadge({ type }: { type: AdminFeedback["type"] }) {
  return (
    <Badge variant="outline" className="gap-1">
      {type === "bug_report" ? (
        <Bug className="size-3 text-red-500" aria-hidden />
      ) : null}
      {FEEDBACK_TYPE_LABELS[type]}
    </Badge>
  );
}

export function FeedbackClient({ feedback }: FeedbackClientProps) {
  const [items, setItems] = useState(feedback);
  const [filter, setFilter] = useState<FeedbackFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && item.status !== filter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const userLabel =
        item.user_name?.trim() || item.user_email.split("@")[0] || "";
      return (
        item.message.toLowerCase().includes(query) ||
        userLabel.toLowerCase().includes(query) ||
        item.user_email.toLowerCase().includes(query)
      );
    });
  }, [filter, items, search]);

  function handleFilterChange(next: FeedbackFilter) {
    setFilter(next);
    startTransition(async () => {
      const data = await getFeedback(next);
      setItems(data);
    });
  }

  function handleStatusUpdate(id: string, status: FeedbackStatus) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await updateFeedbackStatus(id, status);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
    });
  }

  function handleSaveNotes(id: string) {
    setError(null);
    setPendingId(id);
    const notes = notesDraft[id] ?? "";
    startTransition(async () => {
      const result = await updateFeedbackNotes(id, notes);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, admin_notes: notes.trim() || null } : item
        )
      );
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              size="sm"
              variant={filter === tab.value ? "default" : "outline"}
              onClick={() => handleFilterChange(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search message or user…"
          className="sm:max-w-xs"
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Message</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No feedback found.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isExpanded = expandedId === item.id;
                const isPending = pendingId === item.id;
                const userLabel =
                  item.user_name?.trim() ||
                  item.user_email.split("@")[0] ||
                  "User";

                return (
                  <Fragment key={item.id}>
                    <tr
                      className="cursor-pointer border-b hover:bg-muted/20"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : item.id)
                      }
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{userLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.user_email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={item.type} />
                      </td>
                      <td className="max-w-xs px-4 py-3 text-muted-foreground">
                        {previewMessage(item.message)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="border-b bg-muted/10">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Full message
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-sm">
                                {item.message}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`notes-${item.id}`}>
                                Internal note
                              </Label>
                              <Textarea
                                id={`notes-${item.id}`}
                                value={
                                  notesDraft[item.id] ??
                                  item.admin_notes ??
                                  ""
                                }
                                onChange={(event) =>
                                  setNotesDraft((prev) => ({
                                    ...prev,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                rows={3}
                                disabled={isPending}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isPending}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleSaveNotes(item.id);
                                }}
                              >
                                Save note
                              </Button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {item.status !== "reviewed" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isPending}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleStatusUpdate(item.id, "reviewed");
                                  }}
                                >
                                  Mark as reviewed
                                </Button>
                              ) : null}
                              {item.status !== "actioned" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isPending}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleStatusUpdate(item.id, "actioned");
                                  }}
                                >
                                  Mark as actioned
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
