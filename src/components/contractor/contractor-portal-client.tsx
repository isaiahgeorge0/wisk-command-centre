"use client";

import {
  Calendar,
  ClipboardList,
  DoorOpen,
  HardHat,
  Loader2,
  MapPin,
  MessageSquare,
  Upload,
  User,
} from "lucide-react";
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

function SectionCard({
  children,
  className,
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[var(--portal-border)] bg-[var(--portal-card)] p-5 shadow-[var(--portal-shadow)]",
        accent && "border-[var(--portal-amber)]/30 ring-1 ring-[var(--portal-amber)]/10",
        className
      )}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--portal-text)]">
      <Icon className="size-4 text-[var(--portal-amber)]" />
      {title}
    </h2>
  );
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
      status:
        prev.status === "viewed" || prev.status === "sent"
          ? "in_progress"
          : prev.status,
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
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8 pb-12">
      <SectionCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--portal-amber)]">
              {property?.name ?? "Property"}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--portal-text)]">
              {ticket?.title ?? "Maintenance job"}
            </h1>
            <p className="mt-2 flex items-start gap-1.5 text-sm text-[var(--portal-muted)]">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              {property ? formatPropertyAddress(property) : "—"}
            </p>
          </div>
          <JobSheetStatusBadge status={jobSheet.status} className="text-sm" />
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
          <p className="mt-4 flex items-center gap-1.5 text-sm text-[var(--portal-muted)]">
            <HardHat className="size-3.5 text-[var(--portal-amber)]" />
            <span>
              Assigned to{" "}
              <span className="font-medium text-[var(--portal-text)]">
                {contractorName}
              </span>
              {contractor.trade ? ` · ${contractor.trade}` : ""}
            </span>
          </p>
        ) : null}
      </SectionCard>

      <SectionCard accent>
        <SectionHeading icon={MessageSquare} title="Updates for landlord" />
        <p className="mt-1 text-xs text-[var(--portal-muted)]">
          Share progress, notes, and next steps here.
        </p>
        {sortedUpdates.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {sortedUpdates.map((update) => (
              <li
                key={update.id}
                className="rounded-lg border border-[var(--portal-border)] bg-[var(--portal-bg)] px-4 py-3"
              >
                <p className="text-sm leading-relaxed text-[var(--portal-text)]">
                  {update.content}
                </p>
                <p className="mt-2 text-xs text-[var(--portal-muted)]">
                  {formatPropertyDate(update.created_at.slice(0, 10))}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--portal-muted)]">
            No updates yet — add the first one below.
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
            className="min-h-11 w-full bg-[var(--portal-amber)] text-white hover:bg-[var(--portal-amber)]/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Post update"
            )}
          </Button>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeading icon={ClipboardList} title="Job details" />
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--portal-muted)]">
          {ticket?.description?.trim() || "No description provided."}
        </p>
      </SectionCard>

      {tenantContact ? (
        <SectionCard>
          <SectionHeading icon={User} title="Tenant contact" />
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
        </SectionCard>
      ) : null}

      <SectionCard>
        <SectionHeading icon={Calendar} title="Planned visit" />
        <Input
          id="planned-visit"
          type="date"
          value={plannedDate}
          onChange={(e) => handlePlannedDateChange(e.target.value)}
          disabled={isPending}
          className="mt-3 min-h-11 border-[var(--portal-border)] bg-[var(--portal-bg)]"
        />
        {jobSheet.planned_visit_date ? (
          <p className="mt-2 text-xs text-[var(--portal-muted)]">
            Saved: {formatPropertyDate(jobSheet.planned_visit_date)}
          </p>
        ) : null}
      </SectionCard>

      <SectionCard>
        <SectionHeading icon={DoorOpen} title="Request access" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <Label htmlFor="access-date" className="text-xs text-[var(--portal-muted)]">
              Date
            </Label>
            <Input
              id="access-date"
              type="date"
              value={accessDate}
              onChange={(e) => setAccessDate(e.target.value)}
              className="mt-1 min-h-11 border-[var(--portal-border)] bg-[var(--portal-bg)]"
            />
          </div>
          <div className="sm:col-span-1">
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
          <div className="sm:col-span-2">
            <Label htmlFor="access-notes" className="text-xs text-[var(--portal-muted)]">
              Notes (optional)
            </Label>
            <Input
              id="access-notes"
              value={accessNotes}
              onChange={(e) => setAccessNotes(e.target.value)}
              placeholder="Any details for the tenant"
              className="mt-1 min-h-11 border-[var(--portal-border)] bg-[var(--portal-bg)]"
            />
          </div>
        </div>
        <Button
          type="button"
          onClick={handleRequestAccess}
          disabled={isPending}
          className="mt-3 min-h-11 w-full bg-[var(--portal-amber)] text-white hover:bg-[var(--portal-amber)]/90"
        >
          {isPending ? "Submitting…" : "Request access"}
        </Button>

        {sortedAccessRequests.length > 0 ? (
          <ol className="relative mt-5 space-y-0 border-l border-[var(--portal-border)] pl-4">
            {sortedAccessRequests.map((request) => (
              <li key={request.id} className="relative pb-4 last:pb-0">
                <span className="absolute -left-[1.3rem] top-1.5 size-2.5 rounded-full bg-[var(--portal-amber)] ring-4 ring-[var(--portal-card)]" />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-[var(--portal-text)]">
                      {formatPropertyDate(request.requested_date)}
                      {request.requested_time
                        ? ` · ${request.requested_time}`
                        : ""}
                    </p>
                    {request.notes ? (
                      <p className="mt-1 text-xs text-[var(--portal-muted)]">
                        {request.notes}
                      </p>
                    ) : null}
                    {request.status === "declined" && request.tenant_note ? (
                      <p className="mt-1 text-xs text-[var(--portal-muted)]">
                        <span className="font-medium">Tenant note:</span>{" "}
                        {request.tenant_note}
                      </p>
                    ) : null}
                  </div>
                  <AccessRequestStatusBadge status={request.status} />
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </SectionCard>

      <SectionCard className="border-dashed">
        <SectionHeading icon={Upload} title="Quotes & documents" />
        <p className="mt-2 text-sm text-[var(--portal-muted)]">
          File uploads will be available soon.
        </p>
        <div
          className={cn(
            "mt-4 flex min-h-24 flex-col items-center justify-center rounded-lg",
            "border border-dashed border-[var(--portal-border)] bg-[var(--portal-bg)]/50"
          )}
        >
          <Upload className="size-7 text-[var(--portal-muted)]" />
          <p className="mt-2 text-xs text-[var(--portal-muted)]">Coming soon</p>
        </div>
      </SectionCard>

      {error ? (
        <p className="text-sm text-[var(--portal-error)]">{error}</p>
      ) : null}
    </div>
  );
}
