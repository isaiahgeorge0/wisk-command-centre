"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  addJobSheetUpdate,
  requestTenantAccess,
  setPlannedVisitDate,
} from "@/app/contractor/actions";
import {
  AccessRequestStatusBadge,
  JobSheetStatusBadge,
} from "@/components/contractor/job-sheet-status-badge";
import { MaintenancePriorityBadge } from "@/components/properties/maintenance-priority-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMaintenanceCategoryDisplayName } from "@/lib/properties/display-names";
import {
  formatContractorDisplayName,
  formatPersonDisplayName,
} from "@/lib/properties/contractor-display";
import {
  formatPropertyAddress,
  formatPropertyDate,
} from "@/lib/properties/format";
import type { Contractor, JobSheetUpdate, JobSheetWithDetails } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type TenantContact = {
  name: string;
  email: string | null;
  phone: string | null;
} | null;

type ContractorPortalClientProps = {
  jobSheet: JobSheetWithDetails;
  tenantContact: TenantContact;
  token: string;
};

function resolveContractor(
  contractors: JobSheetWithDetails["contractors"]
): Contractor | null {
  if (!contractors) return null;
  if (Array.isArray(contractors)) return contractors[0] ?? null;
  return contractors;
}

export function ContractorPortalClient({
  jobSheet: initialJobSheet,
  tenantContact,
  token,
}: ContractorPortalClientProps) {
  const router = useRouter();
  const [jobSheet, setJobSheet] = useState(initialJobSheet);
  const [updateDraft, setUpdateDraft] = useState("");
  const [accessDate, setAccessDate] = useState("");
  const [accessTime, setAccessTime] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [plannedDate, setPlannedDate] = useState(
    initialJobSheet.planned_visit_date ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ticket = jobSheet.maintenance_tickets;
  const property = jobSheet.properties;
  const contractor = resolveContractor(jobSheet.contractors);
  const contractorName = formatContractorDisplayName(contractor?.name);
  const tenantName = tenantContact
    ? formatPersonDisplayName(tenantContact.name, "Tenant")
    : null;

  const sortedUpdates = useMemo(() => {
    return [...(jobSheet.job_sheet_updates ?? [])].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [jobSheet.job_sheet_updates]);

  const sortedAccessRequests = useMemo(() => {
    return [...(jobSheet.contractor_access_requests ?? [])].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [jobSheet.contractor_access_requests]);

  const handlePlannedDateChange = (date: string) => {
    setPlannedDate(date);
    if (!date) return;
    startTransition(async () => {
      const result = await setPlannedVisitDate(token, date);
      if (!result.success) {
        setError(result.error ?? "Could not save date.");
        return;
      }
      setJobSheet((prev) => ({ ...prev, planned_visit_date: date }));
      setError(null);
      router.refresh();
    });
  };

  const handleAddUpdate = () => {
    const text = updateDraft.trim();
    if (!text) return;

    const optimistic: JobSheetUpdate = {
      id: `optimistic-${Date.now()}`,
      job_sheet_id: jobSheet.id,
      author: "contractor",
      content: text,
      created_at: new Date().toISOString(),
    };

    setUpdateDraft("");
    setJobSheet((prev) => ({
      ...prev,
      job_sheet_updates: [optimistic, ...(prev.job_sheet_updates ?? [])],
      status: prev.status === "viewed" || prev.status === "sent" ? "in_progress" : prev.status,
    }));

    startTransition(async () => {
      const result = await addJobSheetUpdate(token, text);
      if (!result.success) {
        setError(result.error ?? "Could not save update.");
        setJobSheet((prev) => ({
          ...prev,
          job_sheet_updates: (prev.job_sheet_updates ?? []).filter(
            (u) => u.id !== optimistic.id
          ),
        }));
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  const handleRequestAccess = () => {
    if (!accessDate) {
      setError("Please select a requested date.");
      return;
    }

    startTransition(async () => {
      const result = await requestTenantAccess(
        token,
        accessDate,
        accessTime.trim() || null,
        accessNotes.trim() || null
      );
      if (!result.success) {
        setError(result.error ?? "Could not submit request.");
        return;
      }
      if (!result.data) {
        setError("Could not submit request.");
        return;
      }
      const newRequest = result.data;
      setJobSheet((prev) => ({
        ...prev,
        contractor_access_requests: [
          newRequest,
          ...(prev.contractor_access_requests ?? []),
        ],
      }));
      setAccessDate("");
      setAccessTime("");
      setAccessNotes("");
      setError(null);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-12">
      <section className="rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-5 shadow-[var(--portal-shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--portal-muted)]">
              {property?.name ?? "Property"}
            </p>
            <p className="mt-1 text-sm text-[var(--portal-muted)]">
              {property ? formatPropertyAddress(property) : "—"}
            </p>
            <h1 className="mt-3 text-xl font-bold text-[var(--portal-text)]">
              {ticket?.title ?? "Maintenance job"}
            </h1>
          </div>
          <JobSheetStatusBadge status={jobSheet.status} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {ticket?.priority ? (
            <MaintenancePriorityBadge priority={ticket.priority} />
          ) : null}
          {ticket?.category ? (
            <Badge variant="outline">
              {getMaintenanceCategoryDisplayName(ticket.category)}
            </Badge>
          ) : null}
        </div>
        {contractor ? (
          <p className="mt-4 text-sm text-[var(--portal-muted)]">
            Assigned to{" "}
            <span className="font-medium text-[var(--portal-text)]">
              {contractorName}
            </span>
            {contractor.trade ? ` · ${contractor.trade}` : ""}
          </p>
        ) : null}
      </section>

      {tenantContact ? (
        <section className="rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-5 shadow-[var(--portal-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--portal-text)]">
            Tenant contact for access arrangements
          </h2>
          <p className="mt-2 font-medium text-[var(--portal-text)]">
            {tenantName}
          </p>
          <div className="mt-2 space-y-1 text-sm text-[var(--portal-muted)]">
            {tenantContact.email ? (
              <p>
                Email:{" "}
                <a
                  href={`mailto:${tenantContact.email}`}
                  className="text-[var(--portal-amber)] hover:underline"
                >
                  {tenantContact.email}
                </a>
              </p>
            ) : null}
            {tenantContact.phone ? (
              <p>
                Phone:{" "}
                <a
                  href={`tel:${tenantContact.phone}`}
                  className="text-[var(--portal-amber)] hover:underline"
                >
                  {tenantContact.phone}
                </a>
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-5 shadow-[var(--portal-shadow)]">
        <h2 className="text-sm font-semibold text-[var(--portal-text)]">
          Job details
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--portal-muted)]">
          {ticket?.description?.trim() || "No description provided."}
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-5 shadow-[var(--portal-shadow)]">
        <Label htmlFor="planned-visit" className="text-sm font-semibold text-[var(--portal-text)]">
          Planned visit date
        </Label>
        <Input
          id="planned-visit"
          type="date"
          value={plannedDate}
          onChange={(e) => handlePlannedDateChange(e.target.value)}
          disabled={isPending}
          className="mt-2 min-h-11 border-[var(--portal-border)] bg-[var(--portal-bg)]"
        />
        {jobSheet.planned_visit_date ? (
          <p className="mt-2 text-xs text-[var(--portal-muted)]">
            Current: {formatPropertyDate(jobSheet.planned_visit_date)}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-5 shadow-[var(--portal-shadow)]">
        <h2 className="text-sm font-semibold text-[var(--portal-text)]">
          Request access
        </h2>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="access-date" className="text-xs text-[var(--portal-muted)]">
              Date (required)
            </Label>
            <Input
              id="access-date"
              type="date"
              value={accessDate}
              onChange={(e) => setAccessDate(e.target.value)}
              className="mt-1 min-h-11 border-[var(--portal-border)] bg-[var(--portal-bg)]"
            />
          </div>
          <div>
            <Label htmlFor="access-time" className="text-xs text-[var(--portal-muted)]">
              Time (optional)
            </Label>
            <Input
              id="access-time"
              value={accessTime}
              onChange={(e) => setAccessTime(e.target.value)}
              placeholder="e.g. 9am–12pm"
              className="mt-1 min-h-11 border-[var(--portal-border)] bg-[var(--portal-bg)]"
            />
          </div>
          <div>
            <Label htmlFor="access-notes" className="text-xs text-[var(--portal-muted)]">
              Notes (optional)
            </Label>
            <Textarea
              id="access-notes"
              value={accessNotes}
              onChange={(e) => setAccessNotes(e.target.value)}
              rows={3}
              className="mt-1 resize-none border-[var(--portal-border)] bg-[var(--portal-bg)]"
            />
          </div>
          <Button
            type="button"
            onClick={handleRequestAccess}
            disabled={isPending}
            className="min-h-11 w-full bg-[var(--portal-amber)] text-white hover:bg-[var(--portal-amber)]/90"
          >
            {isPending ? "Submitting…" : "Request access"}
          </Button>
        </div>

        {sortedAccessRequests.length > 0 ? (
          <ul className="mt-5 divide-y divide-[var(--portal-border)] rounded-xl border border-[var(--portal-border)]">
            {sortedAccessRequests.map((request) => (
              <li
                key={request.id}
                className="flex items-center justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-[var(--portal-text)]">
                    {formatPropertyDate(request.requested_date)}
                    {request.requested_time ? ` · ${request.requested_time}` : ""}
                  </p>
                  {request.notes ? (
                    <p className="mt-1 text-xs text-[var(--portal-muted)]">
                      {request.notes}
                    </p>
                  ) : null}
                </div>
                <AccessRequestStatusBadge status={request.status} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-5 shadow-[var(--portal-shadow)]">
        <h2 className="text-sm font-semibold text-[var(--portal-text)]">
          Updates
        </h2>
        {sortedUpdates.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {sortedUpdates.map((update) => (
              <li
                key={update.id}
                className="rounded-xl border border-[var(--portal-border)] bg-[var(--portal-bg)] px-4 py-3"
              >
                <p className="text-sm text-[var(--portal-text)]">{update.content}</p>
                <p className="mt-2 text-xs text-[var(--portal-muted)]">
                  {formatPropertyDate(update.created_at.slice(0, 10))}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--portal-muted)]">
            No updates yet.
          </p>
        )}
        <div className="mt-4 space-y-2">
          <Textarea
            value={updateDraft}
            onChange={(e) => setUpdateDraft(e.target.value)}
            placeholder="Add an update for the landlord…"
            rows={3}
            className="resize-none border-[var(--portal-border)] bg-[var(--portal-bg)]"
          />
          <Button
            type="button"
            onClick={handleAddUpdate}
            disabled={isPending || !updateDraft.trim()}
            className="min-h-11 bg-[var(--portal-amber)] text-white hover:bg-[var(--portal-amber)]/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Add update"
            )}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-[var(--portal-border)] bg-[var(--portal-card)] p-5">
        <h2 className="text-sm font-semibold text-[var(--portal-text)]">
          Quotes &amp; Documents
        </h2>
        <p className="mt-2 text-sm text-[var(--portal-muted)]">
          File uploads will be available soon.
        </p>
        <div
          className={cn(
            "mt-4 flex min-h-28 flex-col items-center justify-center rounded-xl",
            "border border-dashed border-[var(--portal-border)] bg-[var(--portal-bg)]/50"
          )}
        >
          <Upload className="size-8 text-[var(--portal-muted)]" />
          <p className="mt-2 text-xs text-[var(--portal-muted)]">
            Upload area (coming soon)
          </p>
        </div>
      </section>

      {error ? (
        <p className="text-sm text-[var(--portal-error)]">{error}</p>
      ) : null}
    </div>
  );
}
