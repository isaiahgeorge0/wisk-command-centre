"use client";

import { KanbanSquare, LayoutList, Plus, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { updateLeadStatus } from "@/app/(dashboard)/leads/actions";
import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { ConvertSuccessToast } from "@/components/leads/convert-success-toast";
import { DeleteLeadDialog } from "@/components/leads/delete-lead-dialog";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { LeadsEmptyState } from "@/components/leads/leads-empty-state";
import { LeadsFiltersBar } from "@/components/leads/leads-filters-bar";
import { LeadsPipeline } from "@/components/leads/leads-pipeline";
import { LeadsStatsBar } from "@/components/leads/leads-stats-bar";
import { LeadsTable } from "@/components/leads/leads-table";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_LEADS_SORT,
  DEFAULT_LEADS_SORT_DIRECTION,
  buildLeadStats,
  filterLeads,
  groupLeadsByStatus,
  type LeadsSortDirection,
} from "@/lib/leads/selectors";
import type {
  Lead,
  LeadsFilterState,
  LeadsSortKey,
  LeadsView,
  LeadStatus,
  LeadWithActivity,
} from "@/lib/leads/types";
import { cn } from "@/lib/utils";

const LEADS_VIEW_STORAGE_KEY = "wisk-leads-view";

type LeadsPageClientProps = {
  initialLeads: LeadWithActivity[];
};

export function LeadsPageClient({ initialLeads }: LeadsPageClientProps) {
  const router = useRouter();
  const { leadAddOpen, setLeadAddOpen, openLeadAdd } = useQuickAdd();
  const [leads, setLeads] = useState<LeadWithActivity[]>(initialLeads);
  const [view, setView] = useState<LeadsView>("pipeline");
  const [filters, setFilters] = useState<LeadsFilterState>({
    search: "",
    stage: "all",
  });
  const [sortKey, setSortKey] = useState<LeadsSortKey>(DEFAULT_LEADS_SORT);
  const [sortDirection, setSortDirection] = useState<LeadsSortDirection>(
    DEFAULT_LEADS_SORT_DIRECTION
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [convertSuccessOpen, setConvertSuccessOpen] = useState(false);

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  useEffect(() => {
    const stored = localStorage.getItem(LEADS_VIEW_STORAGE_KEY);
    if (stored === "pipeline" || stored === "table") {
      setView(stored);
    }
  }, []);

  const handleViewChange = (nextView: LeadsView) => {
    setView(nextView);
    localStorage.setItem(LEADS_VIEW_STORAGE_KEY, nextView);
  };

  const filteredLeads = useMemo(
    () => filterLeads(leads, filters),
    [leads, filters]
  );

  const grouped = useMemo(
    () => groupLeadsByStatus(filteredLeads),
    [filteredLeads]
  );
  const stats = useMemo(() => buildLeadStats(leads), [leads]);
  const hasAnyLeads = leads.length > 0;
  const hasFilteredLeads = filteredLeads.length > 0;

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
      prev.map((lead) =>
        lead.id === updated.id ? { ...lead, ...updated } : lead
      )
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
        prev.map((item) => (item.id === lead.id ? { ...item, ...optimistic } : item))
      );

      const result = await updateLeadStatus(lead.id, newStatus);
      if (!result.success || !result.data) {
        setLeads((prev) =>
          prev.map((item) => (item.id === lead.id ? { ...item, ...lead } : item))
        );
        return false;
      }

      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id
            ? { ...item, ...result.data!, last_activity_at: item.last_activity_at }
            : item
        )
      );
      router.refresh();
      return true;
    },
    [router]
  );

  return (
    <PageTransition>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          className="mb-0"
          title="Leads"
          subtitle="Track your pipeline from first contact to won."
          icon={<TrendingUp className="size-6" style={{ color: "#6366f1" }} />}
          accentColour="#6366f1"
        />
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center rounded-lg border border-border/60 p-0.5">
            <button
              type="button"
              onClick={() => handleViewChange("pipeline")}
              aria-label="Pipeline view"
              title="Pipeline"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                view === "pipeline"
                  ? "bg-wisk-teal text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <KanbanSquare className="size-4" aria-hidden />
              <span className="hidden sm:inline">Pipeline</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewChange("table")}
              aria-label="Table view"
              title="Table"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                view === "table"
                  ? "bg-wisk-teal text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutList className="size-4" aria-hidden />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
          <Button className="shrink-0 gap-2" onClick={openLeadAdd}>
            <Plus className="size-4" />
            Add lead
          </Button>
        </div>
      </div>

      {!hasAnyLeads ? (
        <LeadsEmptyState onAdd={openLeadAdd} />
      ) : (
        <>
          <LeadsStatsBar stats={stats} />

          {view === "pipeline" ? (
            <div className="space-y-4">
              <LeadsFiltersBar
                filters={filters}
                onFiltersChange={setFilters}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSortChange={(key, direction) => {
                  setSortKey(key);
                  setSortDirection(direction);
                }}
              />
              {hasFilteredLeads ? (
                <LeadsPipeline
                  grouped={grouped}
                  onDelete={handleDeleteRequest}
                  onLeadUpdate={handleLeadUpdate}
                  onProjectCreated={() => setConvertSuccessOpen(true)}
                  onLeadStatusChange={handleLeadStatusChange}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No leads match your filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilters({ search: "", stage: "all" })}
                    className="mt-3 text-sm text-wisk-teal underline-offset-2 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            <LeadsTable
              leads={filteredLeads}
              filters={filters}
              onFiltersChange={setFilters}
              onDelete={handleDeleteRequest}
              onLeadUpdate={handleLeadUpdate}
              onProjectCreated={() => setConvertSuccessOpen(true)}
              onLeadStatusChange={handleLeadStatusChange}
            />
          )}
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

      <ConvertSuccessToast
        open={convertSuccessOpen}
        onDismiss={() => setConvertSuccessOpen(false)}
      />
    </PageTransition>
  );
}
