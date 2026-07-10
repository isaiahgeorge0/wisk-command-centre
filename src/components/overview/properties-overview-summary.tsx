"use client";

import {
  AlertTriangle,
  Building2,
  Calendar,
  HardHat,
  MessageSquare,
  PoundSterling,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { MaintenancePriorityBadge } from "@/components/properties/maintenance-priority-badge";
import { MaintenanceStatusBadge } from "@/components/properties/maintenance-status-badge";
import { formatContractorDisplayName } from "@/lib/properties/contractor-display";
import { getCertificateTypeDisplayName } from "@/lib/properties/display-names";
import {
  daysUntilDate,
  formatPropertyCurrency,
  formatPropertyDate,
} from "@/lib/properties/format";
import type {
  ContractorAccessRequestWithDetails,
  MaintenanceTicketWithJobSheet,
  PortfolioStats,
  PropertyCertificateWithProperty,
  PropertyInsuranceWithProperty,
  PropertyMortgageWithProperty,
  RentDueFlag,
} from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type TimelineEvent = {
  date: string;
  label: string;
  sublabel: string;
  type:
    | "rent"
    | "contractor"
    | "certificate"
    | "mortgage"
    | "insurance"
    | "access";
  href: string;
  urgent?: boolean;
};

type PropertiesOverviewSummaryProps = {
  stats: PortfolioStats;
  rentDueFlags: RentDueFlag[];
  openMaintenanceTickets: MaintenanceTicketWithJobSheet[];
  unreadMessageCount: number;
  expiringCertificates: PropertyCertificateWithProperty[];
  pendingAccessRequests: ContractorAccessRequestWithDetails[];
  mortgages: PropertyMortgageWithProperty[];
  insurance: PropertyInsuranceWithProperty[];
};

const TYPE_COLOURS: Record<TimelineEvent["type"], string> = {
  rent: "bg-wisk-ferrari",
  contractor: "bg-blue-500",
  certificate: "bg-rose-500",
  mortgage: "bg-purple-500",
  insurance: "bg-teal-500",
  access: "bg-wisk-ferrari",
};

const TYPE_LABELS: Record<TimelineEvent["type"], string> = {
  rent: "Rent",
  contractor: "Contractor visit",
  certificate: "Certificate",
  mortgage: "Mortgage",
  insurance: "Insurance",
  access: "Access request",
};

function accessRequestContractorName(
  request: ContractorAccessRequestWithDetails
): string {
  const contractors = request.job_sheets?.contractors;
  if (!contractors) return "Contractor";
  if (Array.isArray(contractors)) {
    return formatContractorDisplayName(contractors[0]?.name);
  }
  return formatContractorDisplayName(contractors.name);
}

export function PropertiesOverviewSummary({
  stats,
  rentDueFlags,
  openMaintenanceTickets,
  unreadMessageCount,
  expiringCertificates,
  pendingAccessRequests,
  mortgages,
  insurance,
}: PropertiesOverviewSummaryProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);

  const timelineEvents: TimelineEvent[] = [];

  rentDueFlags.forEach((flag) => {
    timelineEvents.push({
      date: flag.due_date,
      label: `${flag.tenant_name} — ${formatPropertyCurrency(flag.amount)}`,
      sublabel: flag.property_address,
      type: "rent",
      href: "/properties/dashboard",
      urgent: flag.days_overdue >= 0,
    });
  });

  openMaintenanceTickets.forEach((ticket) => {
    const jobSheet = ticket.job_sheets?.[0];
    if (jobSheet?.planned_visit_date) {
      timelineEvents.push({
        date: jobSheet.planned_visit_date,
        label: ticket.title,
        sublabel: jobSheet.contractors?.name
          ? formatContractorDisplayName(jobSheet.contractors.name)
          : "Contractor",
        type: "contractor",
        href: `/properties/${ticket.property_id}?tab=maintenance`,
      });
    }
  });

  expiringCertificates.forEach((cert) => {
    timelineEvents.push({
      date: cert.expiry_date ?? "",
      label: getCertificateTypeDisplayName(cert.certificate_type),
      sublabel: cert.properties?.name ?? "Property",
      type: "certificate",
      href: `/properties/${cert.property_id}?tab=certificates`,
      urgent: (daysUntilDate(cert.expiry_date) ?? 999) <= 30,
    });
  });

  mortgages.forEach((mortgage) => {
    if (mortgage.fixed_rate_end_date) {
      timelineEvents.push({
        date: mortgage.fixed_rate_end_date,
        label: `${mortgage.lender} — fixed rate ends`,
        sublabel: mortgage.properties?.name ?? "Property",
        type: "mortgage",
        href: "/properties/finances",
      });
    }
  });

  insurance.forEach((ins) => {
    if (ins.renewal_date) {
      timelineEvents.push({
        date: ins.renewal_date,
        label: `${ins.insurer} renewal`,
        sublabel: ins.properties?.name ?? "Property",
        type: "insurance",
        href: "/properties/finances",
      });
    }
  });

  const sortedEvents = timelineEvents
    .filter((e) => {
      if (!e.date) return false;
      const d = new Date(e.date);
      d.setHours(0, 0, 0, 0);
      return d >= today && d <= in30Days;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);

  const needsAttention: Array<{
    label: string;
    sublabel: string;
    href: string;
    severity: "high" | "medium";
  }> = [];

  rentDueFlags
    .filter((f) => f.days_overdue > 0)
    .forEach((f) => {
      needsAttention.push({
        label: `Rent overdue — ${f.tenant_name}`,
        sublabel: `${f.days_overdue} day${f.days_overdue === 1 ? "" : "s"} overdue · ${formatPropertyCurrency(f.amount)}`,
        href: "/properties/dashboard",
        severity: "high",
      });
    });

  openMaintenanceTickets
    .filter((t) => t.priority === "emergency")
    .forEach((t) => {
      needsAttention.push({
        label: t.title,
        sublabel: t.properties?.name ?? "Property",
        href: `/properties/${t.property_id}?tab=maintenance`,
        severity: "high",
      });
    });

  pendingAccessRequests.forEach((r) => {
    needsAttention.push({
      label: `Access request — ${accessRequestContractorName(r)}`,
      sublabel: `${r.job_sheets?.maintenance_tickets?.title ?? "Maintenance"} · ${formatPropertyDate(r.requested_date)}`,
      href: "/properties/maintenance",
      severity: "medium",
    });
  });

  expiringCertificates
    .filter((c) => (daysUntilDate(c.expiry_date) ?? 999) <= 30)
    .forEach((c) => {
      const days = daysUntilDate(c.expiry_date);
      needsAttention.push({
        label: `${getCertificateTypeDisplayName(c.certificate_type)} expiring`,
        sublabel: `${c.properties?.name ?? "Property"} · ${days ?? "—"} days`,
        href: `/properties/${c.property_id}?tab=certificates`,
        severity: "medium",
      });
    });

  return (
    <div className="space-y-8">
      <section aria-label="Portfolio summary">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Portfolio summary
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total properties",
              value: String(stats.totalProperties),
              icon: Building2,
            },
            {
              label: "Occupied / Vacant",
              value: `${stats.occupiedCount} / ${stats.vacantCount}`,
              icon: Users,
            },
            {
              label: "Rent due this month",
              value: formatPropertyCurrency(stats.rentDueThisMonth),
              icon: PoundSterling,
            },
            {
              label: "Open maintenance",
              value: String(stats.openMaintenanceCount),
              icon: Wrench,
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl border border-wisk-ferrari/15 bg-card/60 p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-wisk-ferrari/10">
                    <Icon className="size-4 text-wisk-ferrari" aria-hidden />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {needsAttention.length > 0 ? (
        <section aria-label="Needs attention">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="size-5 text-rose-500" />
            <h2 className="text-lg font-semibold text-foreground">
              Needs attention
            </h2>
          </div>
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-rose-500/20 bg-card/40">
            {needsAttention.slice(0, 5).map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    item.severity === "high"
                      ? "bg-rose-500"
                      : "bg-wisk-ferrari"
                  )}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.sublabel}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {sortedEvents.length > 0 ? (
        <section aria-label="Upcoming 30 days">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-wisk-ferrari" />
              <h2 className="text-lg font-semibold text-foreground">
                Next 30 days
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(TYPE_COLOURS) as TimelineEvent["type"][])
                .filter((t) => sortedEvents.some((e) => e.type === t))
                .map((type) => (
                  <span
                    key={type}
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <span
                      className={cn("size-2 rounded-full", TYPE_COLOURS[type])}
                    />
                    {TYPE_LABELS[type]}
                  </span>
                ))}
            </div>
          </div>
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card/40">
            {sortedEvents.map((event, i) => {
              const days = daysUntilDate(event.date);
              return (
                <Link
                  key={i}
                  href={event.href}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      TYPE_COLOURS[event.type]
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {event.label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {event.sublabel}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className="text-xs font-medium"
                      suppressHydrationWarning
                    >
                      {formatPropertyDate(event.date)}
                    </p>
                    <p
                      className={cn(
                        "text-xs",
                        event.urgent
                          ? "text-rose-500"
                          : "text-muted-foreground"
                      )}
                      suppressHydrationWarning
                    >
                      {days === 0
                        ? "Today"
                        : days === 1
                          ? "Tomorrow"
                          : `In ${days} days`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {openMaintenanceTickets.length > 0 ? (
        <section aria-label="Open maintenance">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="size-5 text-wisk-ferrari" />
              <h2 className="text-lg font-semibold text-foreground">
                Open maintenance
              </h2>
            </div>
            <Link
              href="/properties/maintenance"
              className="text-sm text-wisk-ferrari hover:text-wisk-ferrari/80"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card/40">
            {openMaintenanceTickets.slice(0, 3).map((ticket) => {
              const jobSheet = ticket.job_sheets?.[0] ?? null;
              const latestUpdate =
                jobSheet?.job_sheet_updates?.sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )[0] ?? null;

              return (
                <Link
                  key={ticket.id}
                  href={`/properties/${ticket.property_id}?tab=maintenance`}
                  className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {ticket.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ticket.properties?.name ?? "Property"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <MaintenancePriorityBadge priority={ticket.priority} />
                      <MaintenanceStatusBadge status={ticket.status} />
                    </div>
                  </div>
                  {jobSheet?.contractors?.name ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <HardHat className="size-3" />
                      {formatContractorDisplayName(jobSheet.contractors.name)}
                      {jobSheet.planned_visit_date ? (
                        <span suppressHydrationWarning>
                          {" · Visit: "}
                          {formatPropertyDate(jobSheet.planned_visit_date)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {latestUpdate ? (
                    <p className="truncate rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Update:
                      </span>{" "}
                      {latestUpdate.content}
                    </p>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {unreadMessageCount > 0 ? (
        <section aria-label="Unread messages">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-5 text-wisk-ferrari" />
              <h2 className="text-lg font-semibold text-foreground">
                Unread messages
              </h2>
            </div>
            <Link
              href="/properties/communication"
              className="text-sm text-wisk-ferrari hover:text-wisk-ferrari/80"
            >
              Open hub
            </Link>
          </div>
          <div className="rounded-xl border border-wisk-ferrari/20 bg-card/60 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              You have{" "}
              <span className="font-semibold text-foreground">
                {unreadMessageCount} unread{" "}
                {unreadMessageCount === 1 ? "message" : "messages"}
              </span>{" "}
              from your tenants.
            </p>
            <Link
              href="/properties/communication"
              className="mt-2 inline-flex text-sm font-medium text-wisk-ferrari hover:text-wisk-ferrari/80"
            >
              View messages →
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
