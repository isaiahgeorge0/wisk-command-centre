"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  createJobSheet,
  getJobSheetsForTicket,
  sendJobSheetEmail,
} from "@/app/(dashboard)/properties/actions";
import { JobSheetStatusBadge } from "@/components/contractor/job-sheet-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPropertyDate } from "@/lib/properties/format";
import { formatContractorDisplayName } from "@/lib/properties/contractor-display";
import type { Contractor, JobSheetWithDetails } from "@/lib/properties/types";
import { contractorUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

type MaintenanceJobSheetSectionProps = {
  ticketId: string;
  propertyId: string;
  contractors: Contractor[];
};

function resolveContractor(
  contractors: JobSheetWithDetails["contractors"]
): Contractor | null {
  if (!contractors) return null;
  if (Array.isArray(contractors)) return contractors[0] ?? null;
  return contractors;
}

export function MaintenanceJobSheetSection({
  ticketId,
  propertyId,
  contractors,
}: MaintenanceJobSheetSectionProps) {
  const router = useRouter();
  const [jobSheets, setJobSheets] = useState<JobSheetWithDetails[]>([]);
  const [selectedContractorId, setSelectedContractorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getJobSheetsForTicket(ticketId)
      .then((sheets) => {
        if (!cancelled) {
          setJobSheets(sheets);
          setLoaded(true);
        }
      })
      .catch((err) => console.error("Action failed:", err));
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  const activeSheet = jobSheets[0] ?? null;
  const activeContractor = activeSheet
    ? resolveContractor(activeSheet.contractors)
    : null;
  const selectedContractor = contractors.find(
    (c) => c.id === selectedContractorId
  );

  const handleCreateAndSend = () => {
    if (!selectedContractorId) {
      setError("Select a contractor first.");
      return;
    }

    startTransition(async () => {
      const created = await createJobSheet(
        ticketId,
        propertyId,
        selectedContractorId
      );
      if (!created.success) {
        setError(created.error ?? "Could not create job sheet.");
        return;
      }
      if (!created.data) {
        setError("Could not create job sheet.");
        return;
      }

      const emailed = await sendJobSheetEmail(created.data.id);
      if (!emailed.success) {
        setError(emailed.error ?? "Job sheet created but email failed.");
      } else {
        setError(null);
      }

      const sheets = await getJobSheetsForTicket(ticketId);
      setJobSheets(sheets);
      router.refresh();
    });
  };

  const handleResend = () => {
    if (!activeSheet) return;
    startTransition(async () => {
      const result = await sendJobSheetEmail(activeSheet.id);
      if (!result.success) {
        setError(result.error ?? "Could not resend email.");
        return;
      }
      setError(null);
    });
  };

  if (!loaded) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Loading job sheet…
      </div>
    );
  }

  if (!activeSheet) {
    if (contractors.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <Link
            href="/properties/contractors"
            className="font-medium text-amber-600 hover:underline dark:text-amber-400"
          >
            Add a contractor
          </Link>{" "}
          to create a job sheet for this ticket.
        </div>
      );
    }

    return (
      <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-4">
        <p className="text-sm font-medium text-foreground">Assign contractor</p>
        <Select
          value={selectedContractorId}
          onValueChange={(v) => v && setSelectedContractorId(v)}
        >
          <SelectTrigger className="min-h-11">
            <SelectValue placeholder="Select contractor">
              {selectedContractor
                ? formatContractorDisplayName(selectedContractor.name)
                : "Select contractor"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {contractors.map((contractor) => (
              <SelectItem key={contractor.id} value={contractor.id}>
                {formatContractorDisplayName(contractor.name)}
                {contractor.trade ? ` · ${contractor.trade}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={handleCreateAndSend}
          className="min-h-11 bg-amber-500 text-white hover:bg-amber-500/90"
        >
          {isPending ? "Creating…" : "Create job sheet & send email"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  const updateCount = activeSheet.job_sheet_updates?.length ?? 0;
  const contractorLink = contractorUrl(activeSheet.token);

  return (
    <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          Job sheet ·{" "}
          {formatContractorDisplayName(activeContractor?.name)}
        </p>
        <JobSheetStatusBadge status={activeSheet.status} />
      </div>
      {activeSheet.planned_visit_date ? (
        <p className="text-sm text-muted-foreground">
          Planned visit: {formatPropertyDate(activeSheet.planned_visit_date)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Link
          href={contractorLink}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
        >
          Contractor link
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={isPending}
          onClick={handleResend}
        >
          {isPending ? "Sending…" : "Resend email"}
        </Button>
      </div>
      <p className="text-xs break-all text-muted-foreground">
        <span className="font-medium text-foreground">Contractor link:</span>{" "}
        <a
          href={contractorLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-600 hover:underline dark:text-amber-400"
        >
          {contractorLink}
        </a>
      </p>
      <p className="text-xs text-muted-foreground">
        {updateCount} update{updateCount === 1 ? "" : "s"} from contractor
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
