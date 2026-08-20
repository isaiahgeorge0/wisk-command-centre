import { ACTIVE_PIPELINE_STATUSES } from "@/lib/leads/constants";
import type { Lead } from "@/lib/leads/types";
import type { MorningBriefingContent } from "@/lib/morning/briefing-generator";
import type {
  MaintenanceTicketWithJobSheet,
  PropertyCertificate,
  RentDueFlag,
} from "@/lib/properties/types";
import type { OverviewSnapshot } from "@/lib/overview/selectors";
import { researchSignalToFocusSignal } from "@/lib/research/monitoring";
import type { ResearchSignal } from "@/lib/research/types";

export type FocusSignalCategory =
  | "tasks"
  | "projects"
  | "goals"
  | "leads"
  | "properties"
  | "digest"
  | "research";

export type FocusSignal = {
  id: string;
  category: FocusSignalCategory;
  label: string;
  detail?: string;
  href: string;
  urgency: "high" | "medium" | "low";
};

export type FocusSourceFigure = {
  label: string;
  value: string;
};

const STALLED_DAYS_THRESHOLD = 14;

export function buildStalledLeadFocusSignals(leads: Lead[]): FocusSignal[] {
  const now = Date.now();
  const msPerDay = 86_400_000;

  return leads
    .filter((lead) => {
      const status = lead.status as string;
      if (!ACTIVE_PIPELINE_STATUSES.includes(status as never)) return false;
      const lastTouch = lead.contacted_at ?? lead.created_at;
      const daysSince = Math.floor(
        (now - new Date(lastTouch).getTime()) / msPerDay
      );
      return daysSince >= STALLED_DAYS_THRESHOLD;
    })
    .map((lead) => {
      const lastTouch = lead.contacted_at ?? lead.created_at;
      const daysSince = Math.floor(
        (now - new Date(lastTouch).getTime()) / msPerDay
      );
      return {
        id: `lead-stalled-${lead.id}`,
        category: "leads" as const,
        label: `${lead.name} — no activity for ${daysSince} days`,
        detail: lead.follow_up_date
          ? `Follow-up was ${new Date(lead.follow_up_date).toLocaleDateString()}`
          : undefined,
        href: "/leads",
        urgency: daysSince >= 30 ? ("high" as const) : ("medium" as const),
      };
    });
}

export function buildSnapshotFocusSignals(
  snapshot: {
    overdueTasks: Array<{ id: string; title: string; due_date: string | null }>;
    projectsMissingNextAction: Array<{
      id: string;
      project_name: string;
      client_name: string | null;
    }>;
    goalsAtZeroWithDeadline: Array<{
      id: string;
      title: string;
      deadline: string | null;
    }>;
  }
): FocusSignal[] {
  const signals: FocusSignal[] = [];

  for (const task of snapshot.overdueTasks) {
    signals.push({
      id: `task-overdue-${task.id}`,
      category: "tasks",
      label: task.title,
      detail: task.due_date
        ? `Due ${new Date(task.due_date).toLocaleDateString()}`
        : undefined,
      href: "/tasks",
      urgency: "high",
    });
  }

  for (const project of snapshot.projectsMissingNextAction) {
    signals.push({
      id: `project-no-action-${project.id}`,
      category: "projects",
      label: project.project_name ?? project.client_name ?? "Untitled project",
      detail: "No next action set",
      href: "/projects",
      urgency: "medium",
    });
  }

  for (const goal of snapshot.goalsAtZeroWithDeadline) {
    signals.push({
      id: `goal-zero-${goal.id}`,
      category: "goals",
      label: goal.title,
      detail: goal.deadline
        ? `Deadline ${new Date(goal.deadline).toLocaleDateString()}`
        : "0% progress",
      href: "/goals",
      urgency: "medium",
    });
  }

  return signals;
}

export function buildPropertiesFocusSignals(
  expiringCertificates: PropertyCertificate[],
  openMaintenanceTickets: MaintenanceTicketWithJobSheet[],
  rentDueFlags: RentDueFlag[]
): FocusSignal[] {
  const signals: FocusSignal[] = [];

  for (const cert of expiringCertificates) {
    const propertyName =
      (cert as PropertyCertificate & { properties?: { name: string } | null })
        .properties?.name ?? "Unknown property";
    const daysUntil = cert.expiry_date
      ? Math.ceil(
          (new Date(cert.expiry_date).getTime() - Date.now()) / 86_400_000
        )
      : null;
    const expired = daysUntil !== null && daysUntil < 0;

    signals.push({
      id: `cert-expiring-${cert.id}`,
      category: "properties",
      label: `${cert.certificate_type} — ${propertyName}`,
      detail: expired
        ? "Expired"
        : daysUntil !== null
          ? `Expires in ${daysUntil} days`
          : undefined,
      href: "/properties",
      urgency: expired || (daysUntil !== null && daysUntil <= 7) ? "high" : "medium",
    });
  }

  for (const ticket of openMaintenanceTickets) {
    const propertyName = ticket.properties?.name ?? "Unknown property";
    signals.push({
      id: `maintenance-${ticket.id}`,
      category: "properties",
      label: `Open ticket — ${propertyName}`,
      detail: ticket.title ?? undefined,
      href: "/properties/maintenance",
      urgency: "medium",
    });
  }

  for (const flag of rentDueFlags) {
    signals.push({
      id: `rent-due-${flag.tenant_id}-${flag.due_date}`,
      category: "properties",
      label: `Rent due — ${flag.tenant_name}`,
      detail: flag.days_overdue > 0
        ? `${flag.days_overdue} days overdue`
        : `Due ${new Date(flag.due_date).toLocaleDateString()}`,
      href: "/properties/tenants",
      urgency: flag.days_overdue > 0 ? "high" : "medium",
    });
  }

  return signals;
}

export function buildDigestFocusSignals(
  briefing: MorningBriefingContent | null
): FocusSignal[] {
  if (!briefing?.focuses?.length) return [];

  return briefing.focuses
    .filter((f) => f.urgency === "high" || f.urgency === "medium")
    .slice(0, 3)
    .map((f, i) => ({
      id: `digest-${f.category}-${i}`,
      category: "digest" as const,
      label: f.item,
      detail: f.category,
      href: f.href,
      urgency: f.urgency,
    }));
}

export function buildResearchFocusSignals(
  researchSignals: ResearchSignal[]
): FocusSignal[] {
  return researchSignals.map(researchSignalToFocusSignal);
}

const URGENCY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function buildFocusSourceFigures(
  signals: FocusSignal[]
): FocusSourceFigure[] {
  const urgentCount = signals.filter((signal) => signal.urgency === "high").length;
  const stalledLeadCount = signals.filter(
    (signal) => signal.category === "leads"
  ).length;
  const propertyAlertCount = signals.filter(
    (signal) => signal.category === "properties"
  ).length;
  const digestInsightCount = signals.filter(
    (signal) => signal.category === "digest"
  ).length;
  const researchAlertCount = signals.filter(
    (signal) => signal.category === "research"
  ).length;

  const figures: FocusSourceFigure[] = [];

  if (urgentCount > 0) {
    figures.push({
      label: "Urgent",
      value: `${urgentCount} signal${urgentCount === 1 ? "" : "s"}`,
    });
  }
  if (stalledLeadCount > 0) {
    figures.push({
      label: "Stalled leads",
      value: String(stalledLeadCount),
    });
  }
  if (propertyAlertCount > 0) {
    figures.push({
      label: "Property alerts",
      value: String(propertyAlertCount),
    });
  }
  if (digestInsightCount > 0) {
    figures.push({
      label: "Digest carry-over",
      value: String(digestInsightCount),
    });
  }
  if (researchAlertCount > 0) {
    figures.push({
      label: "Research alerts",
      value: String(researchAlertCount),
    });
  }

  return figures.slice(0, 4);
}

export function buildFocusSignals({
  snapshot,
  leads,
  hasProperties,
  expiringCertificates,
  openMaintenanceTickets,
  rentDueFlags,
  morningBriefing,
  researchSignals,
}: {
  snapshot: OverviewSnapshot;
  leads: Lead[];
  hasProperties: boolean;
  expiringCertificates: PropertyCertificate[];
  openMaintenanceTickets: MaintenanceTicketWithJobSheet[];
  rentDueFlags: RentDueFlag[];
  morningBriefing: MorningBriefingContent | null;
  researchSignals: ResearchSignal[];
}): FocusSignal[] {
  const signals: FocusSignal[] = [
    ...buildSnapshotFocusSignals(snapshot),
    ...buildStalledLeadFocusSignals(leads),
    ...(hasProperties
      ? buildPropertiesFocusSignals(
          expiringCertificates,
          openMaintenanceTickets,
          rentDueFlags
        )
      : []),
    ...buildDigestFocusSignals(morningBriefing),
    ...buildResearchFocusSignals(researchSignals),
  ];

  return sortFocusSignals(signals);
}

export function sortFocusSignals(signals: FocusSignal[]): FocusSignal[] {
  return [...signals].sort(
    (a, b) =>
      (URGENCY_ORDER[a.urgency] ?? 2) - (URGENCY_ORDER[b.urgency] ?? 2)
  );
}
