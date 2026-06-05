"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { updateLeadStatus } from "@/app/(dashboard)/leads/actions";
import { PageTransition } from "@/components/layout/page-transition";
import { DeleteLeadDialog } from "@/components/leads/delete-lead-dialog";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { LeadsEmptyState } from "@/components/leads/leads-empty-state";
import { LeadsPipeline } from "@/components/leads/leads-pipeline";
import { LeadsStatsBar } from "@/components/leads/leads-stats-bar";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { Button } from "@/components/ui/button";
import { PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS } from "@/lib/navigation";
import { buildLeadStats, groupLeadsByStatus } from "@/lib/leads/selectors";
import type { Lead, LeadStatus } from "@/lib/leads/types";

type LeadsPageClientProps = {
  initialLeads: Lead[];
};

export function LeadsPageClient({ initialLeads }: LeadsPageClientProps) {
  const router = useRouter();
  const { leadAddOpen, setLeadAddOpen, openLeadAdd } = useQuickAdd();
  const [leads, setLeads] = useState(initialLeads);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const grouped = useMemo(() => groupLeadsByStatus(leads), [leads]);
  const stats = useMemo(() => buildLeadStats(leads), [leads]);

  const handleDeleted = useCallback(
    (id: string) => {
      setLeads((prev) => prev.filter((lead) => lead.id !== id));
      router.refresh();
    },
    [router]
  );

  const handleDeleteRequest = useCallback((lead: Lead) => {
    setDeleteTarget({ id: lead.id, name: lead.name });
  }, []);

  const handleLeadUpdate = useCallback((updated: Lead) => {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === updated.id ? updated : lead))
    );
  }, []);

  const handleLeadStatusChange = useCallback(
    async (
      lead: Lead,
      newStatus: LeadStatus,
      previousStatus: LeadStatus
    ): Promise<boolean> => {
      if (newStatus === previousStatus) return true;

      const optimistic = { ...lead, status: newStatus };
      setLeads((prev) =>
        prev.map((item) => (item.id === lead.id ? optimistic : item))
      );

      const result = await updateLeadStatus(lead.id, newStatus);
      if (!result.success || !result.data) {
        setLeads((prev) =>
          prev.map((item) => (item.id === lead.id ? lead : item))
        );
        return false;
      }

      setLeads((prev) =>
        prev.map((item) => (item.id === lead.id ? result.data! : item))
      );
      router.refresh();
      return true;
    },
    [router]
  );

  return (
    <PageTransition>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={PAGE_TITLE_CLASS}>Leads</h1>
          <p className={PAGE_SUBTITLE_CLASS}>
            Track enquiries and move them through your sales pipeline.
          </p>
        </div>
        <Button className="shrink-0 gap-2" onClick={openLeadAdd}>
          <Plus className="size-4" />
          Add lead
        </Button>
      </div>

      {leads.length === 0 ? (
        <LeadsEmptyState onAdd={openLeadAdd} />
      ) : (
        <>
          <LeadsStatsBar stats={stats} />
          <LeadsPipeline
            grouped={grouped}
            onDelete={handleDeleteRequest}
            onLeadUpdate={handleLeadUpdate}
            onLeadStatusChange={handleLeadStatusChange}
          />
        </>
      )}

      <LeadFormDialog open={leadAddOpen} onOpenChange={setLeadAddOpen} />

      <DeleteLeadDialog
        leadId={deleteTarget?.id ?? null}
        leadName={deleteTarget?.name ?? ""}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleDeleted}
      />
    </PageTransition>
  );
}
