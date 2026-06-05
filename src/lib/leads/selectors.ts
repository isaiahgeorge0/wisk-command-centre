import {
  ACTIVE_PIPELINE_STATUSES,
  PIPELINE_STATUSES,
} from "@/lib/leads/constants";
import type { Lead, LeadStatus } from "@/lib/leads/types";

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
