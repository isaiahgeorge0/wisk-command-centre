"use client";

import { useMemo, useState, useTransition } from "react";

import {
  approveRequest,
  declineRequest,
  updateAccessRequestNotes,
} from "@/app/(dashboard)/admin/actions";
import { ApproveRequestDialog } from "@/components/admin/approve-request-dialog";
import type { AccessRequest, AccessRequestStatus } from "@/lib/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type RequestsClientProps = {
  requests: AccessRequest[];
};

const FILTER_TABS: { label: string; value: "all" | AccessRequestStatus }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Declined", value: "declined" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysWaiting(createdAt: string) {
  return Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 86_400_000
  );
}

function StatusBadge({ status }: { status: AccessRequestStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "pending" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        status === "approved" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        status === "declined" && "border-border bg-muted text-muted-foreground"
      )}
    >
      {status}
    </Badge>
  );
}

export function RequestsClient({ requests }: RequestsClientProps) {
  const [filter, setFilter] = useState<"all" | AccessRequestStatus>("all");
  const [search, setSearch] = useState("");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<AccessRequest | null>(
    null
  );
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (filter !== "all" && request.status !== filter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        request.name.toLowerCase().includes(query) ||
        request.email.toLowerCase().includes(query)
      );
    });
  }, [filter, requests, search]);

  function handleSaveNotes(id: string) {
    setError(null);
    setPendingId(id);
    const notes = notesDraft[id] ?? "";

    startTransition(async () => {
      const result = await updateAccessRequestNotes(id, notes);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  function handleApproveConfirm(welcomeMessage: string) {
    if (!approveTarget) {
      return;
    }

    setError(null);
    setPendingId(approveTarget.id);

    startTransition(async () => {
      const result = await approveRequest(
        approveTarget.id,
        approveTarget.email,
        approveTarget.name,
        welcomeMessage
      );
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setApproveTarget(null);
    });
  }

  function handleDecline(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await declineRequest(id);
      setPendingId(null);
      if (!result.success) {
        setError(result.error);
      }
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
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or email…"
          className="sm:max-w-xs"
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Waiting</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No access requests found.
                </td>
              </tr>
            ) : (
              filtered.map((request) => {
                const isRowPending = pendingId === request.id;
                const waitingDays = daysWaiting(request.created_at);

                return (
                  <tr key={request.id} className="border-b align-top last:border-b-0">
                    <td className="px-4 py-3 font-medium">{request.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {request.email}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {request.status === "pending" ? (
                        <span className="font-medium text-amber-700 dark:text-amber-300">
                          {waitingDays}d
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="min-w-[220px] px-4 py-3">
                      <Textarea
                        value={notesDraft[request.id] ?? request.notes ?? ""}
                        onChange={(event) =>
                          setNotesDraft((prev) => ({
                            ...prev,
                            [request.id]: event.target.value,
                          }))
                        }
                        rows={2}
                        disabled={isRowPending}
                        placeholder="Context about this person…"
                        className="min-h-16"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="mt-1 h-7 px-2"
                        disabled={isRowPending}
                        onClick={() => handleSaveNotes(request.id)}
                      >
                        Save note
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      {request.status === "pending" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={isRowPending}
                            onClick={() => setApproveTarget(request)}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isRowPending}
                            onClick={() => handleDecline(request.id)}
                          >
                            Decline
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ApproveRequestDialog
        request={approveTarget}
        open={approveTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setApproveTarget(null);
          }
        }}
        onConfirm={handleApproveConfirm}
        isPending={pendingId === approveTarget?.id}
      />
    </div>
  );
}
