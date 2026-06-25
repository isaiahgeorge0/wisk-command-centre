"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { respondToAccessRequest } from "@/app/portal/actions";
import { AccessRequestStatusBadge } from "@/components/contractor/job-sheet-status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatPropertyDate } from "@/lib/properties/format";
import { formatContractorDisplayName } from "@/lib/properties/contractor-display";
import type {
  ContractorAccessRequestStatus,
  ContractorAccessRequestWithDetails,
} from "@/lib/properties/types";

type PortalAccessRequestsProps = {
  requests: ContractorAccessRequestWithDetails[];
};

export function PortalAccessRequests({ requests }: PortalAccessRequestsProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, ContractorAccessRequestStatus>
  >({});
  const [isPending, startTransition] = useTransition();

  const pending = useMemo(
    () =>
      requests.filter(
        (r) => (statusOverrides[r.id] ?? r.status) === "pending"
      ),
    [requests, statusOverrides]
  );

  if (requests.length === 0) return null;

  const handleRespond = (
    requestId: string,
    response: "approved" | "declined",
    note?: string
  ) => {
    setStatusOverrides((prev) => ({ ...prev, [requestId]: response }));
    setPendingId(requestId);
    setDecliningId(null);
    setDeclineNote("");
    startTransition(async () => {
      const result = await respondToAccessRequest(
        requestId,
        response,
        note?.trim() || undefined
      );
      setPendingId(null);
      if (!result.success) {
        setStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[requestId];
          return next;
        });
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--portal-text)]">
          Contractor access requests
        </h2>
        {pending.length > 0 ? (
          <span className="rounded-full bg-[var(--portal-amber-light)] px-2.5 py-0.5 text-xs font-semibold text-[var(--portal-amber)]">
            {pending.length} pending
          </span>
        ) : null}
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-[var(--portal-muted)]">
          No pending access requests.
        </p>
      ) : null}

      <div className="space-y-3">
        {requests.map((request) => {
          const contractors = request.job_sheets?.contractors;
          const contractorRecord = Array.isArray(contractors)
            ? contractors[0]
            : contractors;
          const contractorName = formatContractorDisplayName(
            contractorRecord?.name
          );
          const jobTitle =
            request.job_sheets?.maintenance_tickets?.title ?? "Maintenance job";
          const displayStatus = statusOverrides[request.id] ?? request.status;
          const isDeclining = decliningId === request.id;

          return (
            <article
              key={request.id}
              className="rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-4 shadow-[var(--portal-shadow)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--portal-text)]">
                    {contractorName}
                  </p>
                  <p className="mt-1 text-sm text-[var(--portal-muted)]">
                    {jobTitle}
                  </p>
                  <p className="mt-1 text-sm text-[var(--portal-muted)]">
                    {formatPropertyDate(request.requested_date)}
                    {request.requested_time
                      ? ` · ${request.requested_time}`
                      : ""}
                  </p>
                  {request.notes ? (
                    <p className="mt-2 text-sm text-[var(--portal-muted)]">
                      {request.notes}
                    </p>
                  ) : null}
                </div>
                <AccessRequestStatusBadge status={displayStatus} />
              </div>

              {displayStatus === "pending" && !isDeclining ? (
                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    disabled={isPending && pendingId === request.id}
                    onClick={() => handleRespond(request.id, "approved")}
                    className="min-h-11 flex-1 bg-[var(--portal-success)] text-white hover:bg-[var(--portal-success)]/90"
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending && pendingId === request.id}
                    onClick={() => {
                      setDecliningId(request.id);
                      setDeclineNote("");
                    }}
                    className="min-h-11 flex-1 border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                  >
                    Decline
                  </Button>
                </div>
              ) : null}

              {displayStatus === "pending" && isDeclining ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-[var(--portal-muted)]">
                    Let the contractor know your availability:
                  </p>
                  <Textarea
                    placeholder="e.g. Available weekdays after 3pm, or Saturday mornings"
                    value={declineNote}
                    onChange={(e) => setDeclineNote(e.target.value)}
                    rows={2}
                    className="resize-none border-[var(--portal-border)] bg-[var(--portal-bg)] text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={isPending && pendingId === request.id}
                      onClick={() =>
                        handleRespond(request.id, "declined", declineNote)
                      }
                    >
                      Confirm decline
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending && pendingId === request.id}
                      onClick={() => {
                        setDecliningId(null);
                        setDeclineNote("");
                      }}
                      className="border-[var(--portal-border)]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
