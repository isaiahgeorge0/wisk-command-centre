import {
  ACTIVE_PIPELINE_STATUSES,
  LEAD_STATUS_LABELS,
  PIPELINE_STATUSES,
} from "@/lib/leads/constants";
import { daysInStage } from "@/lib/leads/format";
import type {
  Lead,
  LeadStatus,
  LeadWithActivity,
  LeadsFilterState,
  LeadsSortKey,
} from "@/lib/leads/types";

export type LeadStats = {
  leadsThisMonth: number;
  conversionRate: number;
  pipelineValue: number;
  averageResponseDays: number | null;
};

export function groupLeadsByStatus(leads: Lead[]): Record<LeadStatus, Lead[]> {
  const grouped = Object.fromEntries(
    PIPELINE_STATUSES.map((status) => [status, [] as Lead[]])
  ) as Record<LeadStatus, Lead[]>;

  for (const lead of leads) {
    const status = PIPELINE_STATUSES.includes(lead.status as LeadStatus)
      ? (lead.status as LeadStatus)
      : "new";
    grouped[status].push(lead);
  }

  for (const status of PIPELINE_STATUSES) {
    grouped[status].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  return grouped;
}

export function buildLeadStats(leads: Lead[], now: Date = new Date()): LeadStats {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const leadsThisMonth = leads.filter(
    (lead) => new Date(lead.created_at) >= monthStart
  ).length;

  const won = leads.filter((lead) => lead.status === "won").length;
  const lost = leads.filter((lead) => lead.status === "lost").length;
  const closed = won + lost;
  const conversionRate = closed > 0 ? Math.round((won / closed) * 100) : 0;

  const pipelineValue = leads
    .filter((lead) =>
      ACTIVE_PIPELINE_STATUSES.includes(lead.status as LeadStatus)
    )
    .reduce((sum, lead) => sum + (lead.value ?? 0), 0);

  const responseDays = leads
    .filter((lead) => lead.contacted_at)
    .map((lead) => {
      const created = new Date(lead.created_at).getTime();
      const contacted = new Date(lead.contacted_at!).getTime();
      return Math.max(
        0,
        Math.round((contacted - created) / (1000 * 60 * 60 * 24))
      );
    });

  const averageResponseDays =
    responseDays.length > 0
      ? Math.round(
          (responseDays.reduce((sum, days) => sum + days, 0) /
            responseDays.length) *
            10
        ) / 10
      : null;

  return {
    leadsThisMonth,
    conversionRate,
    pipelineValue,
    averageResponseDays,
  };
}

export function getRecentLeads(leads: Lead[], limit = 3): Lead[] {
  return [...leads]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, limit);
}

export function isSameMonth(dateISO: string, now: Date = new Date()): boolean {
  const date = new Date(dateISO);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export function monthLabel(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long" }).format(now);
}

const STAGE_ORDER: Record<LeadStatus, number> = {
  new: 0,
  contacted: 1,
  qualified: 2,
  proposal_sent: 3,
  won: 4,
  lost: 5,
};

export function filterLeads<T extends Lead>(
  leads: T[],
  filters: LeadsFilterState
): T[] {
  const query = filters.search.trim().toLowerCase();

  return leads.filter((lead) => {
    if (filters.stage !== "all" && lead.status !== filters.stage) {
      return false;
    }

    if (!query) return true;

    const haystack = [
      lead.name,
      lead.email ?? "",
      lead.phone ?? "",
      lead.service_interest,
      lead.source,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export type LeadsSortDirection = "asc" | "desc";

export function sortLeads(
  leads: LeadWithActivity[],
  sortKey: LeadsSortKey,
  direction: LeadsSortDirection
): LeadWithActivity[] {
  const sorted = [...leads];

  sorted.sort((a, b) => {
    let cmp = 0;

    switch (sortKey) {
      case "follow_up_date": {
        const aDate = a.follow_up_date;
        const bDate = b.follow_up_date;
        if (!aDate && !bDate) cmp = 0;
        else if (!aDate) cmp = 1;
        else if (!bDate) cmp = -1;
        else cmp = aDate.localeCompare(bDate);
        break;
      }
      case "name":
        cmp = a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" });
        break;
      case "value":
        cmp = (a.value ?? 0) - (b.value ?? 0);
        break;
      case "last_activity": {
        const aDate = a.last_activity_at;
        const bDate = b.last_activity_at;
        if (!aDate && !bDate) cmp = 0;
        else if (!aDate) cmp = 1;
        else if (!bDate) cmp = -1;
        else cmp = aDate.localeCompare(bDate);
        break;
      }
      case "days_in_stage":
        cmp = daysInStage(a) - daysInStage(b);
        break;
      case "stage": {
        const aStage =
          STAGE_ORDER[
            PIPELINE_STATUSES.includes(a.status as LeadStatus)
              ? (a.status as LeadStatus)
              : "new"
          ];
        const bStage =
          STAGE_ORDER[
            PIPELINE_STATUSES.includes(b.status as LeadStatus)
              ? (b.status as LeadStatus)
              : "new"
          ];
        cmp = aStage - bStage;
        break;
      }
    }

    return direction === "asc" ? cmp : -cmp;
  });

  return sorted;
}

export const DEFAULT_LEADS_SORT: LeadsSortKey = "follow_up_date";
export const DEFAULT_LEADS_SORT_DIRECTION: LeadsSortDirection = "asc";

export const LEADS_SORT_OPTIONS: {
  key: LeadsSortKey;
  label: string;
  direction: LeadsSortDirection;
}[] = [
  { key: "follow_up_date", label: "Follow-up date", direction: "asc" },
  { key: "name", label: "Name (A–Z)", direction: "asc" },
  { key: "value", label: "Value (high to low)", direction: "desc" },
  { key: "last_activity", label: "Last activity", direction: "desc" },
  { key: "days_in_stage", label: "Days in stage", direction: "desc" },
  { key: "stage", label: "Stage", direction: "asc" },
];
