"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { respondToAccessRequest } from "@/app/portal/actions";
import { AccessRequestStatusBadge } from "@/components/contractor/job-sheet-status-badge";
import { Button } from "@/components/ui/button";
import { formatPropertyDate } from "@/lib/properties/format";
import { formatContractorDisplayName } from "@/lib/properties/contractor-display";
import type { ContractorAccessRequestWithDetails } from "@/lib/properties/types";

type PortalAccessRequestsProps = {
  requests: ContractorAccessRequestWithDetails[];
};

export function PortalAccessRequests({ requests }: PortalAccessRequestsProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pending = requests.filter((r) => r.status === "pending");

  if (requests.length === 0) return null;

  const handleRespond = (requestId: string, response: "approved" | "declined") => {
    setPendingId(requestId);
    startTransition(async () => {
      await respondToAccessRequest(requestId, response);
      setPendingId(null);
      router.refresh();
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-[var(--portal-text)]">
        Contractor access requests
      </h2>

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

          return (
            <article
              key={request.id}
              className="rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-4 shadow-[var(--portal-shadow)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--portal-text)]">
                    {jobTitle}
                  </p>
                  <p className="mt-1 text-sm text-[var(--portal-muted)]">
                    {contractorName} ·{" "}
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
                <AccessRequestStatusBadge status={request.status} />
              </div>

              {request.status === "pending" ? (
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
                    onClick={() => handleRespond(request.id, "declined")}
                    className="min-h-11 flex-1 border-[var(--portal-border)]"
                  >
                    Decline
                  </Button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
